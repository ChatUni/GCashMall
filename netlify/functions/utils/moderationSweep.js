// Finding review work that nobody queued.
//
// The job queue only ever holds what an upload dispatched. Anything that became pending
// another way — content that predates the queue, a dispatch whose nudge and enqueue both
// failed, a series edited while the worker was down — would otherwise sit forever, because
// the worker polls the QUEUE, not the content.
//
// The sweep closes that gap: it looks for series with something awaiting review and enqueues
// a job for each. Enqueue is deduplicated by key, so a series that already has an outstanding
// job is not queued twice.
//
// ── Order ──
//
// Oldest series first, because someone who uploaded a week ago has waited longer than
// someone who uploaded an hour ago. Jobs are claimed in the order they were enqueued, so
// enqueueing in creation order is what produces that. Within a series the pipeline already
// works through episodes by episodeNumber, which matters because episodes go live in an
// unbroken run from episode 1 — deciding episode 5 before episode 2 publishes nothing.
//
// ── What is skipped ──
//
// A series whose uploader (or an admin) has hidden it with `shelvedByUploader` is not swept:
// hiding it is a decision to park it, and reviewing content nobody intends to publish spends
// money to fill a queue.
//
// Note this is `shelvedByUploader`, NOT the derived `shelved`. `shelved` is true for
// everything awaiting review — that is what awaiting review means — so filtering on it would
// skip the entire queue.

import { get } from './db.js'
import { enqueue } from './jobQueue.js'

const PENDING = 'pending'
const statusOf = (doc) => doc?.moderation?.status || PENDING

export const seriesNeedingReview = (all) =>
  all
    .filter((s) => !s.shelvedByUploader)
    .filter((s) => !s.quickCreate)
    .filter((s) => statusOf(s) === PENDING || (s.episodes || []).some((e) => statusOf(e) === PENDING))
    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))

// Enqueue a job for every series awaiting review that has not got one. Returns what it found
// and what it added.
export const sweepForPendingReviews = async ({ limit = 50 } = {}) => {
  const all = await get('series', {}, {}, { createdAt: 1 })
  const needing = seriesNeedingReview(all).slice(0, limit)

  let queued = 0
  for (const s of needing) {
    const before = await enqueue(
      'moderateUpload',
      { seriesId: String(s._id), userId: String(s.uploaderId || '') },
      { key: `moderateUpload:${s._id}` },
    )
    // enqueue returns the existing job when one is already outstanding for this key.
    if (String(before.status) === 'queued' && !before.attempts) queued += 1
  }
  return { found: needing.length, queued }
}
