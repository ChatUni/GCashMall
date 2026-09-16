// The moderation worker: a long-running service that runs jobs the 15-minute serverless
// budget cannot hold.
//
// Two ways in, deliberately:
//
//   POST /jobs   an HMAC-signed nudge from the API, for low latency
//   the poll     a timer that claims anything queued, for correctness
//
// The poll is what makes the system reliable — a lost nudge, a worker restart, or a deploy
// mid-job costs latency, not work. The nudge only saves the wait until the next tick.
//
// One job at a time by default (CONCURRENCY): moderation is dominated by ffmpeg and vision
// API calls, and a small instance running four at once is slower than one running them in
// turn. Raise it when the instance is bigger than the work.

import http from 'http'
import crypto from 'crypto'
import { readFileSync, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '../../..')

// Load .env when running outside a container that already has the environment set.
const envFile = path.join(REPO, '.env')
if (existsSync(envFile) && !process.env.WORKER_SHARED_SECRET) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const { claim, heartbeat, finish, requeue } = await import(`${REPO}/netlify/functions/utils/jobQueue.js`)
const { ts, withTiming, timing, summarize, fmtMs } = await import(`${REPO}/netlify/functions/utils/jobTiming.js`)
const { sweepForPendingReviews } = await import(`${REPO}/netlify/functions/utils/moderationSweep.js`)
const { moderateSeries } = await import('./moderate.js')
const { reportComplete } = await import('./callbacks.js')

const PORT = Number(process.env.PORT) || 8080
// `nowait` (npm run worker nowait) collapses every interval to a few seconds so a change can
// be observed immediately. For testing only — the production intervals exist so a worker is
// not hammering MongoDB and Bunny for state that only changes on the order of minutes.
const NOWAIT = process.argv.slice(2).some((a) => a === 'nowait' || a === '--nowait')
// Kill a worker mid-job and its claim survives for the whole lease, so the job cannot be
// retried until it expires — 30 minutes of waiting between test runs. Shorten it for testing.
if (NOWAIT && !process.env.JOB_LEASE_MS) process.env.JOB_LEASE_MS = String(60 * 1000)

const POLL_INTERVAL_MS = NOWAIT ? 3000 : Number(process.env.WORKER_POLL_MS) || 15000
const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY) || 1
const RUNNER_ID = `${process.env.HOSTNAME || 'worker'}-${process.pid}`
// How long to wait before looking at a job again when it is blocked on Bunny encoding.
// Encodes routinely take tens of minutes when the library's queue is busy, so checking more
// often would just burn worker slots.
const ENCODE_RETRY_MS = NOWAIT ? 15000 : Number(process.env.ENCODE_RETRY_MS) || 10 * 60 * 1000
// How often to look for review work nobody queued (see moderationSweep.js). Far less often
// than the queue poll: the queue is the normal path, and this is the backstop for work that
// never reached it.
const SWEEP_INTERVAL_MS = NOWAIT ? 5000 : Number(process.env.WORKER_SWEEP_MS) || 5 * 60 * 1000

// Jobs this worker is willing to claim. Adding a service to this instance later means adding
// its name here and a branch in `run` — the queue, the dispatch and the callbacks are already
// generic.
const HANDLED = { moderateUpload: moderateSeries }
const HANDLED_NAMES = Object.keys(HANDLED)

let active = 0
let stopping = false

const verify = (raw, headers) => {
  const secret = process.env.WORKER_SHARED_SECRET || ''
  if (!secret) return false
  const ts = headers['x-job-timestamp']
  const sig = headers['x-job-signature']
  if (!ts || !sig) return false
  if (Math.abs(Date.now() - Number(ts)) > 5 * 60 * 1000) return false
  const expected = crypto.createHmac('sha256', secret).update(`${ts}.${raw}`).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(String(sig))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

const run = async (job) => {
  active += 1
  const label = `${job.name} ${String(job._id).slice(-8)}`
  const startedAt = Date.now()
  console.log(`${ts()} [worker] start ${label}  (${active}/${CONCURRENCY} slots busy)`)
  try {
    const handler = HANDLED[job.name]
    if (!handler) throw new Error(`no handler for job '${job.name}'`)
    // One timing context per job. Nested episode contexts measure themselves; this one spans
    // the whole run, so its idle share answers "would another concurrent worker have helped?"
    await withTiming(label, async () => {
      const result = await handler(job, { heartbeat: () => heartbeat(job._id) })
      if (result && result.done === false) {
        // Not a failure — it cannot finish yet. Come back to it rather than closing it.
        await requeue(job._id, { delayMs: ENCODE_RETRY_MS, reason: result.reason })
        console.log(
          `${ts()} [worker] deferred ${label} (${result.reason}) — retrying in ${ENCODE_RETRY_MS / 60000} min` +
            ` — ${summarize(timing())}`,
        )
        return
      }
      await finish(job._id)
      console.log(`${ts()} [worker] done ${label} — ${summarize(timing())}`)
    })
  } catch (error) {
    console.error(`${ts()} [worker] FAILED ${label} after ${fmtMs(Date.now() - startedAt)}: ${error.message}`)
    await finish(job._id, { error: error.message }).catch(() => {})
    // Tell the API too, so a job that dies here does not leave the UI waiting forever.
    await reportComplete({ jobId: String(job._id), error: error.message }).catch(() => {})
  } finally {
    active -= 1
  }
}

// Claim and run whatever is waiting, up to the concurrency limit.
const pump = async () => {
  if (stopping) return
  while (active < CONCURRENCY) {
    const job = await claim(HANDLED_NAMES, RUNNER_ID).catch((e) => {
      console.error(`${ts()} [worker] claim failed: ${e.message}`)
      return null
    })
    if (!job) return
    run(job) // deliberately not awaited — the loop keeps claiming up to CONCURRENCY
  }
}

// Look for pending series that have no job, and queue them oldest-first.
const sweep = async () => {
  if (stopping) return
  try {
    const { found, queued } = await sweepForPendingReviews()
    if (queued > 0) {
      console.log(`${ts()} [worker] sweep: ${found} series awaiting review, queued ${queued} new job(s)`)
    }
  } catch (e) {
    console.error(`${ts()} [worker] sweep failed: ${e.message}`)
  }
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, runner: RUNNER_ID, active, handles: HANDLED_NAMES }))
    return
  }
  if (req.method === 'POST' && req.url === '/jobs') {
    let raw = ''
    req.on('data', (c) => (raw += c))
    req.on('end', () => {
      if (!verify(raw, req.headers)) {
        res.writeHead(401).end('unauthorized')
        return
      }
      // Accept immediately; the nudge only asks us to look, and the poll would find it anyway.
      res.writeHead(202, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ accepted: true }))
      pump().catch((e) => console.error(`[worker] pump failed: ${e.message}`))
    })
    return
  }
  res.writeHead(404).end('not found')
})

server.listen(PORT, () => {
  console.log(`${ts()} [worker] ${RUNNER_ID} listening on :${PORT}, handling ${HANDLED_NAMES.join(', ')}`)
  console.log(
    `${ts()} [worker] polling the job queue every ${POLL_INTERVAL_MS}ms · concurrency ${CONCURRENCY}` +
      ` · ffmpeg threads ${process.env.FFMPEG_THREADS || 'auto'}` +
      ` · sweeping for unqueued reviews every ${SWEEP_INTERVAL_MS / 1000}s` +
      (NOWAIT ? '  [nowait: test intervals]' : ''),
  )
})

const timer = setInterval(() => pump().catch((e) => console.error(`${ts()} [worker] poll: ${e.message}`)), POLL_INTERVAL_MS)
const sweepTimer = setInterval(() => sweep().then(() => pump()).catch(() => {}), SWEEP_INTERVAL_MS)
sweep().then(() => pump()).catch(() => {})

// Stop claiming on shutdown and let running jobs finish. Anything still running when the
// process is killed keeps its lease; once that expires another worker picks it up.
const shutdown = () => {
  if (stopping) return
  stopping = true
  console.log(`${ts()} [worker] shutting down; ${active} job(s) still running`)
  clearInterval(timer)
  clearInterval(sweepTimer)
  server.close()
  const wait = setInterval(() => {
    if (active === 0) {
      clearInterval(wait)
      process.exit(0)
    }
  }, 1000)
  setTimeout(() => process.exit(0), 60000).unref()
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
