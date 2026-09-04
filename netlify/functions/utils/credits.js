// Wallet denomination.
//
// The wallet is held in CREDITS. Money moving in or out of the system is USD/GUSD.
//
//     1 USD  =  1 GUSD  =  100 credits
//
// Everything stored on a user — `balance` and every `transactions[].amount` — is credits.
// Conversion happens only at the two money boundaries:
//   • top-up   : the provider charges USD, we credit toCredits(usd)
//   • withdraw : the user spends credits, we pay out toUsd(credits)
//
// Admin-configured prices (episodeCost, nextEpisodeCost, welcomeCredit) are ALSO credits,
// so the pricing and revenue maths needs no conversion at all.
export const CREDITS_PER_USD = 100

// USD -> credits. Rounded, because credits are whole units; $0.005 has no representation.
export const toCredits = (usd) => Math.round(Number(usd || 0) * CREDITS_PER_USD)

// credits -> USD, to 2dp, for a payment provider.
export const toUsd = (credits) => Number((Number(credits || 0) / CREDITS_PER_USD).toFixed(2))

// ── Top-up tiers ──
//
// Credits per top-up are NOT a flat rate: larger tiers carry a bonus.
//
//     $5.99  ->   600 credits   (100 / USD)
//     $9.99  ->  1100 credits   (110 / USD)
//     $19.99 ->  2300 credits   (115 / USD)
//     $49.99 ->  6000 credits   (120 / USD)
//
// Apple and Google take a 30% cut of in-app purchases, so a store top-up grants 30% fewer
// credits than the same tier bought on the web.
//
// Any amount not in the table (the small GUSD test tiers) falls back to the base rate.
export const TOPUP_TIERS = { 5.99: 600, 9.99: 1100, 19.99: 2300, 49.99: 6000 }
export const STORE_CREDIT_RATE = 0.7

// Credits granted for a USD top-up. `viaStore` = Apple IAP / Google Play Billing.
export const creditsForTopUp = (usd, viaStore = false) => {
  const base = TOPUP_TIERS[Number(usd)] ?? toCredits(usd)
  return viaStore ? Math.round(base * STORE_CREDIT_RATE) : base
}
