// Settling an episode's charge once it has actually been rendered.
//
// The purchase (chargeEpisode / startNextEpisode in handlers.js) HOLDS the estimate: the
// full quoted price is debited before any render starts, so no episode can be generated on
// money the user doesn't have. This module closes the other end — once the episode video
// exists and its real duration is known, the charge is recalculated at the true length and
// the difference refunded. The settled amount is capped at the hold, so an overrunning
// render costs the quoted price and never more.
//
// Lives apart from handlers.js so the composition job (audioJob.js) can settle without
// importing the whole API surface.

import { get, update } from './db.js'
import { ObjectId } from 'mongodb'
import { tierForProduction, settledCost } from './videoTiers.js'

const generateReferenceId = () =>
  `REF${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`

// Settle one production against the duration of the episode that was actually produced.
// Idempotent: the first call stamps `settledAt` and every later call is a no-op, so a
// retried or duplicated composition can't refund twice.
export const settleEpisodeCharge = async (jobId, actualSeconds) => {
  if (!jobId) return null
  const seconds = Number(actualSeconds)
  if (!seconds || seconds <= 0) return null

  const docs = await get('productions', { jobId }, {}, {}, 1)
  if (!docs || docs.length === 0) return null
  const doc = docs[0]

  // Nothing was held (a legacy or free job), or this is a repeat call.
  const held = Number(doc.chargedCredits || 0)
  if (!held || doc.settledAt) return null

  const tier = tierForProduction(doc)
  const finalCredits = settledCost(tier, seconds, held)
  const refund = held - finalCredits

  const settlement = {
    heldCredits: held,
    finalCredits,
    refundedCredits: refund,
    actualSeconds: Math.round(seconds * 10) / 10,
    estimatedSeconds: Number(doc.episodeLength) || null,
    // The cap did real work here — the episode ran long and we absorbed it.
    capped: finalCredits === held && tier.creditsPerSecond * seconds > held,
  }

  // Claim the settlement before moving money, so two concurrent composers can't both refund.
  const claimed = await update(
    'productions',
    { jobId, settledAt: { $exists: false } },
    { $set: { settledAt: new Date(), settlement, updatedAt: new Date() } },
  )
  if (claimed.matchedCount === 0) return null

  if (refund > 0) {
    await refundToBalance(
      doc,
      refund,
      `rendered ${Math.round(settlement.actualSeconds)}s ` +
        `(charged ${settlement.finalCredits} of ${settlement.heldCredits} held)`,
    )
  }

  return settlement
}

// Release the whole hold because the episode will never exist.
//
// Settlement only runs on the success path, so without this a job that dies after the
// charge leaves the user paying for nothing. Shares the `settledAt` claim with
// settleEpisodeCharge, so exactly one of {settle, release} can ever happen for a job — a
// late-arriving success can't refund on top of a release, or the reverse.
//
// The production keeps chargedAt/chargedCredits as an audit trail but is no longer treated
// as paid: chargeEpisode sees `settlement.released` and lets the creator buy a retry, so a
// refunded job can't also be re-rendered for free.
export const releaseEpisodeHold = async (jobId, reason) => {
  if (!jobId) return null

  const docs = await get('productions', { jobId }, {}, {}, 1)
  if (!docs || docs.length === 0) return null
  const doc = docs[0]

  const held = Number(doc.chargedCredits || 0)
  if (!held || doc.settledAt) return null
  // Belt and braces: never refund an episode that actually got made.
  if (doc.episodeVideo) return null

  const settlement = {
    heldCredits: held,
    finalCredits: 0,
    refundedCredits: held,
    actualSeconds: 0,
    estimatedSeconds: Number(doc.episodeLength) || null,
    capped: false,
    released: true,
    reason: String(reason || 'Generation failed'),
  }

  const claimed = await update(
    'productions',
    { jobId, settledAt: { $exists: false } },
    { $set: { settledAt: new Date(), settlement, updatedAt: new Date() } },
  )
  if (claimed.matchedCount === 0) return null

  await refundToBalance(doc, held, `generation failed — full refund`)
  return settlement
}

// Post a refund as its own ledger entry. The original charge stays on the record:
// rewriting a posted transaction would hide that a hold was ever taken.
const refundToBalance = async (doc, refund, detail) => {
  const seriesTitle = doc.proposal?.project?.title || doc.ideaTitle || 'Series'
  const episode = Number(doc.episode || 1)
  const transaction = {
    id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    referenceId: generateReferenceId(),
    type: 'refund',
    amount: refund,
    description: `Refund — ${seriesTitle} Episode ${episode} ${detail}`,
    source: { seriesName: seriesTitle, episodeNumber: episode, episodeTitle: '' },
    status: 'success',
    createdAt: new Date(),
  }

  await update(
    'users',
    { _id: new ObjectId(String(doc.userId)) },
    {
      $inc: { balance: refund },
      $push: { transactions: { $each: [transaction], $position: 0 } },
      $set: { updatedAt: new Date() },
    },
  )
}
