// Netlify Background Function: the serverless half of the moderateUpload job.
//
// It used to be called directly by the browser, with the client polling ?type=moderationStatus
// and blocking the save until every video came back approved. That gate is gone — uploads no
// longer wait on moderation, and it is not coming back — so the only way in now is a queued
// job (see netlify/functions/utils/jobQueue.js).

import { getJob, finish as finishJob, requeue } from './utils/jobQueue.js'
import { moderateSeriesContent } from './utils/moderateSeries.js'
import { applyVerdict } from './utils/handlers.js'

// Serverless fallback for a queued moderateUpload job.
//
// This is the other half of the runtime switch: with JOB_RUNTIME_MODERATE_UPLOAD=serverless
// the dispatcher sends a jobId here instead of nudging the worker, and the SAME shared
// pipeline runs — reporting verdicts by calling the handlers directly rather than over
// HTTP, since we are already inside the API.
//
// It is bounded by the 15-minute function budget, which is exactly why moderation moved to a
// server: a large series will run out of budget and stop cleanly, leaving the remaining
// episodes pending and the job queued for another pass. Useful as a rollback, not as the
// steady state.
const FUNCTION_BUDGET_MS = 13 * 60 * 1000

const runQueuedJob = async (jobId) => {
  const job = await getJob(jobId)
  if (!job) return { statusCode: 404 }

  const deadline = Date.now() + FUNCTION_BUDGET_MS
  try {
    const result = await moderateSeriesContent(
      {
        jobId: String(job._id),
        seriesId: job.payload?.seriesId,
        userId: job.payload?.userId,
        skipChecks: !!job.payload?.skipChecks,
      },
      { report: (payload) => applyVerdict(payload), deadline },
    )
    // Out of budget with episodes left: requeue rather than marking it done, so the next
    // pass (or the worker, if it has been moved) picks up where this one stopped.
    if (result.incomplete) {
      // Out of function budget: come straight back for the rest.
      await requeue(job._id, { delayMs: 0, reason: 'function budget' })
      console.warn(`moderateUpload ${jobId} ran out of function budget with ${result.remaining} item(s) left; requeued`)
    } else if (result.waitingOnEncode > 0) {
      // Blocked on Bunny, which can take a long while — look again later rather than
      // marking the job done and stranding those episodes.
      await requeue(job._id, { delayMs: 10 * 60 * 1000, reason: 'awaiting bunny encode' })
      console.warn(`moderateUpload ${jobId}: ${result.waitingOnEncode} episode(s) still encoding; deferred`)
    } else {
      await finishJob(job._id)
    }
    return { statusCode: 200 }
  } catch (error) {
    console.error(`moderateUpload ${jobId} failed:`, error.message)
    await finishJob(job._id, { error: error.message })
    return { statusCode: 200 }
  }
}

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}')
    if (!body.jobId) return { statusCode: 400 }
    return await runQueuedJob(body.jobId)
  } catch (error) {
    // A failure here leaves the series' episodes pending, which is the safe state: nothing
    // reaches the public without a verdict, and an admin can still decide by hand.
    console.error('moderate-upload-background error:', error)
    return { statusCode: 500 }
  }
}
