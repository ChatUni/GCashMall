// Video quality tiers and episode pricing — mirrors netlify/functions/utils/videoTiers.js.
// The server is authoritative for the charge; this copy drives the purchase dialog.
//
// Hold and cap: the dialog quotes rate x the chosen target length, that amount is held at
// purchase, and the final charge is the measured length capped at the hold — so the number
// shown here is the most the episode can ever cost, not necessarily what it will cost.

export interface VideoTier {
  id: string
  model: string
  resolution: string
  creditsPerSecond: number
}

export const VIDEO_TIERS: VideoTier[] = [
  { id: 'mini-480p', model: 'bytedance/seedance-2.0-mini', resolution: '480p', creditsPerSecond: 4 },
  { id: 'mini-720p', model: 'bytedance/seedance-2.0-mini', resolution: '720p', creditsPerSecond: 6 },
  { id: 'fast-480p', model: 'bytedance/seedance-2.0-fast', resolution: '480p', creditsPerSecond: 9 },
  { id: 'fast-720p', model: 'bytedance/seedance-2.0-fast', resolution: '720p', creditsPerSecond: 12 },
]

export const DEFAULT_TIER_ID = 'mini-480p'

export const EPISODE_LENGTH_OPTIONS = [30, 60]
export const DEFAULT_EPISODE_SECONDS = 30

export const findTier = (tierId: string): VideoTier | undefined =>
  VIDEO_TIERS.find((t) => t.id === tierId)

export const tierCost = (tier: VideoTier, seconds: number = DEFAULT_EPISODE_SECONDS): number =>
  Math.round(tier.creditsPerSecond * seconds)

// "Seedance 2.0 mini" / "Seedance 2.0 Fast" — derived from the slug so the two lists
// can't drift.
export const tierFamily = (tier: VideoTier): string =>
  tier.model.includes('-fast') ? 'Seedance 2.0 Fast' : 'Seedance 2.0 mini'

// Cheapest tier at the shortest length, for a "from N credits" preview where nothing is
// chosen yet.
export const minTierCost = (): number =>
  Math.min(...VIDEO_TIERS.map((t) => tierCost(t, DEFAULT_EPISODE_SECONDS)))
