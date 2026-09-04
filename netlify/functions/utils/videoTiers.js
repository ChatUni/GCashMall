// Video quality tiers and episode pricing — what a user picks before an episode is
// generated, and what they are charged for it.
//
//   Seedance 2.0 mini  480p    4 credits/sec
//   Seedance 2.0 mini  720p    6 credits/sec
//   Seedance 2.0 Fast  480p    9 credits/sec
//   Seedance 2.0 Fast  720p   12 credits/sec
//
// The chosen tier is stored on the production document, so the render uses the model and
// resolution the user actually paid for rather than the admin default.
//
// ── Hold and cap ──
//
// The user picks a target length (30s or 60s), but the model decides the real length and
// rarely hits the target exactly. Charging the estimate would overcharge a short episode;
// charging the true length after the fact could surprise someone with a bill above the
// quote. So:
//
//   1. At purchase, HOLD the estimate (rate x target seconds) — the balance is debited up
//      front, so a render can never run on money the user doesn't have.
//   2. When the episode is composed, SETTLE against the measured duration and refund the
//      difference. The settled charge is CAPPED at the hold: a render that overruns costs
//      the quoted price, never more. Overruns are our planning error, not the creator's.
//
// Mirrored client-side in src/utils/videoTiers.ts.

export const VIDEO_TIERS = [
  { id: 'mini-480p', model: 'bytedance/seedance-2.0-mini', resolution: '480p', creditsPerSecond: 4 },
  { id: 'mini-720p', model: 'bytedance/seedance-2.0-mini', resolution: '720p', creditsPerSecond: 6 },
  { id: 'fast-480p', model: 'bytedance/seedance-2.0-fast', resolution: '480p', creditsPerSecond: 9 },
  { id: 'fast-720p', model: 'bytedance/seedance-2.0-fast', resolution: '720p', creditsPerSecond: 12 },
]

export const DEFAULT_TIER_ID = 'mini-480p'

// Target lengths the user may choose in the purchase dialog.
export const EPISODE_LENGTH_OPTIONS = [30, 60]
export const DEFAULT_EPISODE_SECONDS = 30

export const findTier = (tierId) => VIDEO_TIERS.find((t) => t.id === tierId) || null

// Only the offered lengths are billable targets — anything else falls back to the default
// so a hand-crafted request can't quote itself a cheaper hold than it renders.
export const normalizeEpisodeSeconds = (seconds) => {
  const n = Number(seconds)
  return EPISODE_LENGTH_OPTIONS.includes(n) ? n : DEFAULT_EPISODE_SECONDS
}

// Credits for `seconds` of video at this tier. Used both for the up-front hold (with the
// target length) and for the settlement (with the measured length).
export const tierCost = (tier, seconds = DEFAULT_EPISODE_SECONDS) =>
  Math.round(tier.creditsPerSecond * Number(seconds || 0))

// What the episode actually costs once rendered: the true length, capped at the hold.
export const settledCost = (tier, actualSeconds, heldCredits) =>
  Math.max(0, Math.min(tierCost(tier, actualSeconds), heldCredits))

// Resolve a tier from a stored production, falling back to the default so a job created
// before tiers existed still renders.
export const tierForProduction = (doc) =>
  findTier(doc?.videoTier?.id) || findTier(DEFAULT_TIER_ID)
