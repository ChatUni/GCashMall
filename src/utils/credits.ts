// Wallet denomination — mirrors netlify/functions/utils/credits.js.
//
//     1 USD  =  1 GUSD  =  100 credits
//
// Balances, transaction amounts and admin-configured prices are all CREDITS.
// USD appears only where real money changes hands: the top-up tiers a user picks, and the
// payout a withdrawal produces.
export const CREDITS_PER_USD = 100

export const toCredits = (usd: number): number => Math.round(usd * CREDITS_PER_USD)

export const toUsd = (credits: number): number => Number((credits / CREDITS_PER_USD).toFixed(2))

// Credits are whole units, so they never show a decimal point.
export const formatCredits = (credits: number): string =>
  Math.round(credits || 0).toLocaleString()

// ── Top-up tiers ──
// Mirrors netlify/functions/utils/credits.js — the server is authoritative; this copy only
// drives what the wallet shows before the charge.
//
//     $5 -> 500,  $10 -> 1200,  $20 -> 2500,  $50 -> 7000
//
// Apple/Google take 30% of an in-app purchase, so a store top-up grants 30% fewer credits.
export const TOPUP_TIERS: Record<number, number> = { 5: 500, 10: 1200, 20: 2500, 50: 7000 }
export const STORE_CREDIT_RATE = 0.7

export const creditsForTopUp = (usd: number, viaStore = false): number => {
  const base = TOPUP_TIERS[usd] ?? toCredits(usd)
  return viaStore ? Math.round(base * STORE_CREDIT_RATE) : base
}
