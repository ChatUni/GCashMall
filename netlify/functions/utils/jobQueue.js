// The job queue that lets a unit of work run EITHER as a Netlify background function or on
// a long-running server, decided by configuration rather than by code.
//
// ── Why a queue at all ──
//
// Netlify background functions cap at 15 minutes. Auto-moderation of a multi-episode upload
// (transcribe → text checks → frame extraction → vision checks, per episode) has no such
// bound, which is why it has to move to a server. But the pipeline code itself should not
// have to know where it is running, or we would be maintaining two copies of it.
//
// ── The design ──
//
// MongoDB is the queue. Both runtimes already hold a connection to it, so this adds no new
// infrastructure, survives a worker restart, and gives an atomic claim for free. An HTTP
// nudge to the worker is only a latency optimisation — if the nudge is lost, the worker's
// own poll picks the job up on its next pass.
//
//   enqueue()  writes a job document (status 'queued')
//   claim()    atomically takes the oldest runnable job (status -> 'running' + a lease)
//   progress() records incremental progress, read by the client's status poll
//   finish()   marks 'done' or 'failed'
//
// ── Moving a service between runtimes ──
//
// `runtimeFor(name)` reads JOB_RUNTIME_<NAME> ('server' | 'serverless'), defaulting to the
// value in JOB_DEFINITIONS. Moving auto-moderation onto the server is
// JOB_RUNTIME_MODERATE_UPLOAD=server — an environment change, not a deploy of new code.
// Both runtimes execute the identical handler, so behaviour cannot drift between them.
//
// ── No conflict ──
//
// Claiming is a single findOneAndUpdate guarded on status, so two runners (or a runner and
// a stray background function) can never take the same job. A claim carries a lease; a job
// whose lease has expired — the worker died mid-run — becomes claimable again, so work is
// never stranded.

import { ObjectId } from 'mongodb'
import { connectDB } from './db.js'

export const JOB_QUEUED = 'queued'
export const JOB_RUNNING = 'running'
export const JOB_DONE = 'done'
export const JOB_FAILED = 'failed'

// Every long-running unit of work is declared here once. `defaultRuntime` is where it runs
// unless the environment says otherwise.
export const JOB_DEFINITIONS = {
  // Auto-moderation of an uploaded series: transcribe + text/frame checks per episode.
  // Unbounded in length, so it belongs on the server.
  moderateUpload: { defaultRuntime: 'server', leaseMs: 30 * 60 * 1000 },
}

export const runtimeFor = (name) => {
  const override = process.env[`JOB_RUNTIME_${name.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase()}`]
  if (override === 'server' || override === 'serverless') return override
  return JOB_DEFINITIONS[name]?.defaultRuntime || 'serverless'
}

// A claim's lease is how long a job is protected from being taken by a second runner. It has
// to exceed the longest a healthy run can take, or a slow job gets picked up twice — but it
// is also how long a job sits stranded after a worker is killed, which makes local testing
// painful. JOB_LEASE_MS overrides it (the worker's `nowait` mode sets a short one).
const leaseMs = (name) =>
  Number(process.env.JOB_LEASE_MS) || JOB_DEFINITIONS[name]?.leaseMs || 15 * 60 * 1000

const jobs = async () => (await connectDB()).collection('jobs')

// Queue a job. `key` makes enqueueing idempotent: re-queuing the same key while an earlier
// run is still outstanding returns that job instead of creating a duplicate.
export const enqueue = async (name, payload, { key } = {}) => {
  const col = await jobs()
  const dedupeKey = key || `${name}:${JSON.stringify(payload)}`

  const existing = await col.findOne({
    dedupeKey,
    status: { $in: [JOB_QUEUED, JOB_RUNNING] },
  })
  if (existing) return existing

  const doc = {
    name,
    payload,
    dedupeKey,
    status: JOB_QUEUED,
    runtime: runtimeFor(name),
    progress: null,
    error: '',
    attempts: 0,
    claimedAt: null,
    leaseUntil: null,
    runAfter: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  const { insertedId } = await col.insertOne(doc)
  return { ...doc, _id: insertedId }
}

// Atomically take the oldest runnable job of any of `names`. A job is runnable when it is
// queued, or when it is running but its lease has expired (the previous runner died).
export const claim = async (names, runner) => {
  const col = await jobs()
  const now = new Date()
  const res = await col.findOneAndUpdate(
    {
      name: { $in: names },
      $or: [{ status: JOB_QUEUED }, { status: JOB_RUNNING, leaseUntil: { $lt: now } }],
      // A job deferred until later (waiting on something outside our control, such as Bunny
      // finishing an encode) is not claimable until its time comes.
      $and: [
        { $or: [{ runAfter: null }, { runAfter: { $exists: false } }, { runAfter: { $lte: now } }] },
      ],
    },
    {
      $set: {
        status: JOB_RUNNING,
        claimedAt: now,
        claimedBy: runner || 'unknown',
        updatedAt: now,
      },
      $inc: { attempts: 1 },
    },
    { sort: { createdAt: 1 }, returnDocument: 'after' },
  )
  const job = res?.value || res
  if (!job || !job._id) return null

  // The lease length depends on the job, so it is set once the job is known.
  await col.updateOne(
    { _id: job._id },
    { $set: { leaseUntil: new Date(Date.now() + leaseMs(job.name)) } },
  )
  return job
}

// Extend the lease of a job that is still being worked on, so a long but healthy run is
// never mistaken for a dead one and picked up twice.
export const heartbeat = async (jobId) => {
  const col = await jobs()
  const job = await col.findOne({ _id: new ObjectId(String(jobId)) })
  if (!job) return
  await col.updateOne(
    { _id: job._id },
    { $set: { leaseUntil: new Date(Date.now() + leaseMs(job.name)), updatedAt: new Date() } },
  )
}

export const progress = async (jobId, progressPatch) => {
  const col = await jobs()
  await col.updateOne(
    { _id: new ObjectId(String(jobId)) },
    { $set: { progress: progressPatch, updatedAt: new Date() } },
  )
}

// Put a job back on the queue to be retried later, rather than finishing it.
//
// Used when the work cannot complete yet through no fault of its own — the common case being
// a video Bunny has not finished encoding. Marking such a job done would strand the episode
// forever, because nothing else would ever look at it again.
export const requeue = async (jobId, { delayMs = 5 * 60 * 1000, reason = '' } = {}) => {
  const col = await jobs()
  await col.updateOne(
    { _id: new ObjectId(String(jobId)) },
    {
      $set: {
        status: JOB_QUEUED,
        claimedAt: null,
        leaseUntil: null,
        runAfter: new Date(Date.now() + delayMs),
        deferredReason: reason,
        updatedAt: new Date(),
      },
    },
  )
}

export const finish = async (jobId, { error } = {}) => {
  const col = await jobs()
  await col.updateOne(
    { _id: new ObjectId(String(jobId)) },
    {
      $set: {
        status: error ? JOB_FAILED : JOB_DONE,
        error: error ? String(error) : '',
        finishedAt: new Date(),
        updatedAt: new Date(),
      },
    },
  )
}

export const getJob = async (jobId) => {
  const col = await jobs()
  return col.findOne({ _id: new ObjectId(String(jobId)) })
}
