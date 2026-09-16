// Dispatching a queued job to whichever runtime owns it.
//
// The caller says "run this job"; it never says where. `runtimeFor` (jobQueue.js) decides,
// from configuration, and this module does the corresponding wake-up:
//
//   serverless → POST the existing Netlify background function
//   server     → POST the worker's /jobs endpoint, signed with the shared secret
//
// Both nudges are best-effort. The job is already durably queued in MongoDB before either
// is attempted, so a failed or lost nudge only delays the work until the worker's next poll
// — it never loses it. That is what makes moving a service between runtimes safe: the queue
// is the contract, the nudge is an optimisation.

import crypto from 'crypto'
import { enqueue, runtimeFor } from './jobQueue.js'
import { triggerBackground } from './trigger.js'

// Which Netlify background function runs a job when it runs serverless.
const SERVERLESS_FUNCTION = {
  moderateUpload: 'moderate-upload-background',
}

export const workerBaseUrl = () => (process.env.WORKER_URL || '').replace(/\/+$/, '')

const workerSecret = () => process.env.WORKER_SHARED_SECRET || ''

// Both directions of the serverless <-> server link are signed with the same shared secret.
// A timestamp is included and checked on receipt, so a captured request cannot be replayed
// indefinitely.
export const signPayload = (body, timestamp) =>
  crypto
    .createHmac('sha256', workerSecret())
    .update(`${timestamp}.${JSON.stringify(body)}`)
    .digest('hex')

export const verifySignature = (body, timestamp, signature, maxAgeMs = 5 * 60 * 1000) => {
  if (!workerSecret()) throw new Error('WORKER_SHARED_SECRET is not set')
  if (!timestamp || !signature) return false
  if (Math.abs(Date.now() - Number(timestamp)) > maxAgeMs) return false
  const expected = signPayload(body, timestamp)
  const a = Buffer.from(expected)
  const b = Buffer.from(String(signature))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

// Queue a job and nudge whoever owns it. Returns the job document.
export const dispatchJob = async (name, payload, options = {}) => {
  const job = await enqueue(name, payload, options)
  const runtime = runtimeFor(name)

  try {
    if (runtime === 'server') await nudgeWorker(job)
    else await triggerBackground(SERVERLESS_FUNCTION[name], String(job._id), options.authHeader)
  } catch (error) {
    // Queued is what matters; the nudge is not.
    console.warn(`job ${name} (${job._id}) queued but ${runtime} nudge failed: ${error.message}`)
  }
  return job
}

const nudgeWorker = async (job) => {
  const base = workerBaseUrl()
  if (!base) throw new Error('WORKER_URL is not set')
  const body = { jobId: String(job._id), name: job.name }
  const timestamp = String(Date.now())

  const res = await fetch(`${base}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Job-Timestamp': timestamp,
      'X-Job-Signature': signPayload(body, timestamp),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok && res.status !== 202) throw new Error(`worker returned ${res.status}`)
}
