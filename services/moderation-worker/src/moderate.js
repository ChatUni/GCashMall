// The worker's adapter around the shared moderation pipeline.
//
// The pipeline itself lives in netlify/functions/utils/moderateSeries.js and is shared with
// the serverless runtime, so there is exactly one implementation of "is this acceptable".
// All this file supplies is how a verdict gets reported from a process that has no session:
// an HMAC-signed callback to the API.

import { moderateSeriesContent } from '../../../netlify/functions/utils/moderateSeries.js'
import { reportProgress, reportComplete } from './callbacks.js'

// Returns whether the job is finished. When episodes are still waiting on Bunny to encode,
// it is not: the caller defers the job rather than closing it, because an encode can take
// hours and marking the job done would strand those episodes with nothing to look at them
// again.
export const moderateSeries = async (job, { heartbeat } = {}) => {
  const { seriesId, userId, skipChecks } = job.payload || {}
  const result = await moderateSeriesContent(
    { jobId: String(job._id), seriesId, userId, skipChecks: !!skipChecks },
    { report: reportProgress, heartbeat },
  )
  if (result.waitingOnEncode > 0) {
    return { done: false, reason: `${result.waitingOnEncode} episode(s) still encoding` }
  }
  // The decisions are made; what is left is bulk subtitle work that was capped so it could
  // not hold the slot. Come back for it rather than closing the job.
  if (result.subtitlesDeferred > 0) {
    return { done: false, reason: `${result.subtitlesDeferred} episode(s) still need subtitles` }
  }
  await reportComplete({ jobId: String(job._id), seriesId: String(seriesId) })
  return { done: true }
}
