// What each top-up tier actually costs in the viewer's App Store / Google Play storefront,
// e.g. "CA$7.99" rather than our USD list price. Filled in by utils/iap once the store has
// loaded its products. The apps must show this price — it is what the payment sheet charges.

import { createStore } from 'solid-js/store'

const [state, setState] = createStore<{ prices: Record<string, string> }>({ prices: {} })

export const iapPriceStore = state

export const setIAPPrice = (amount: number, price: string) => {
  if (!amount || !price) return
  setState('prices', String(amount), price)
}

// The price label for a top-up tier. In the apps: the store's localized price, blank until
// the store answers (never a guess that could disagree with the payment sheet). On the web:
// the USD amount itself.
export const topUpPriceLabel = (amount: number, inApp: boolean): string =>
  inApp ? state.prices[String(amount)] || '' : `$${amount.toFixed(2)}`
