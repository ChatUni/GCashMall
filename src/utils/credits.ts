// Wallet denomination — mirrors netlify/functions/utils/credits.js.
//
//     1 USD  =  1 GUSD  =  100 credits
//
// Balances, transaction amounts and admin-configured prices are all CREDITS.
// USD appears only where real money changes hands: the top-up tiers a user picks, and the
// payout a withdrawal produces.
export const CREDITS_PER_USD = 100

// The credits mark shown beside any credit figure. Lives here so every price in the app
// points at one URL rather than each screen hardcoding its own copy.
export const CREDITS_ICON =
  'https://res.cloudinary.com/daqc8bim3/image/upload/v1764702233/logo.png'

export const toCredits = (usd: number): number => Math.round(usd * CREDITS_PER_USD)

export const toUsd = (credits: number): number => Number((credits / CREDITS_PER_USD).toFixed(2))

// Credits are whole units, so they never show a decimal point.
export const formatCredits = (credits: number): string =>
  Math.round(credits || 0).toLocaleString()

// ── Top-up tiers ──
// Mirrors netlify/functions/utils/credits.js — the server is authoritative; this copy only
// drives what the wallet shows before the charge.
//
//     $5.99 -> 600,  $9.99 -> 1100,  $19.99 -> 2300,  $49.99 -> 6000
//
// Apple/Google take 30% of an in-app purchase, so a store top-up grants 30% fewer credits.
export const TOPUP_TIERS: Record<number, number> = { 5.99: 600, 9.99: 1100, 19.99: 2300, 49.99: 6000 }
export const STORE_CREDIT_RATE = 0.7

export const creditsForTopUp = (usd: number, viaStore = false): number => {
  const base = TOPUP_TIERS[usd] ?? toCredits(usd)
  return viaStore ? Math.round(base * STORE_CREDIT_RATE) : base
}

// ── Bonus ──
//
// The tiers are priced just under a round dollar and grant more than the dollar buys, so the
// extra is a bonus worth naming rather than burying in a single total:
//
//     $5.99  ->   600 =   600            (no bonus)
//     $9.99  -> 1,100 = 1,000 + 100
//     $19.99 -> 2,300 = 2,000 + 300
//     $49.99 -> 6,000 = 5,000 + 1,000
//
// The base is what the nearest round dollar buys at the standard rate; whatever the tier
// grants beyond that is the bonus. Derived rather than listed, so a change to TOPUP_TIERS
// cannot leave a hardcoded bonus behind saying something untrue.
export interface TopUpBreakdown {
  base: number
  bonus: number
  total: number
}

export const topUpBreakdown = (usd: number, viaStore = false): TopUpBreakdown => {
  const total = creditsForTopUp(usd, viaStore)
  const fullBase = toCredits(Math.round(usd))
  // A store purchase grants less overall, so its base shrinks in the same proportion —
  // otherwise the bonus would appear to vanish, or go negative.
  const base = Math.min(total, viaStore ? Math.round(fullBase * STORE_CREDIT_RATE) : fullBase)
  return { base, bonus: Math.max(0, total - base), total }
}
