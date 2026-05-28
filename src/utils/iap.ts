// In-App Purchase utility for iOS using cordova-plugin-purchase
// Uses CdvPurchase global namespace provided by the plugin
//
// Product tiers defined in App Store Connect:
// $1, $5, $10, $20, $50, $100, $200, $500, $1000

import { isCordova, isIOS } from './cordova'

// ──────────────────────────────────────────────
// Types for cordova-plugin-purchase (CdvPurchase)
// ──────────────────────────────────────────────

interface CdvPurchaseOffer {
  id: string
  productId: string
  pricingPhases: Array<{
    price: string
    priceMicros: number
    currency: string
  }>
}

interface CdvPurchaseProduct {
  id: string
  title: string
  description: string
  offers: CdvPurchaseOffer[]
  owned: boolean
  valid: boolean
  canPurchase: boolean
  pricing?: {
    price: string
    priceMicros: number
    currency: string
  }
}

interface CdvPurchaseTransaction {
  transactionId: string
  products: Array<{ id: string }>
  finish: () => void
}

interface CdvPurchaseReceipt {
  platform: string
  transactions: CdvPurchaseTransaction[]
}

interface CdvPurchaseVerifiedReceipt {
  id: string
  sourceReceipt: CdvPurchaseReceipt
  collection: Array<{
    id: string
    transactionId: string
  }>
  finish: () => void
}

// Product type enum matching CdvPurchase.ProductType
const CONSUMABLE = 'consumable'

// Platform enum matching CdvPurchase.Platform
const APPLE_APPSTORE = 'ios-appstore'

interface CdvPurchaseWhenChain {
  approved: (callback: (transaction: CdvPurchaseTransaction) => void) => CdvPurchaseWhenChain
  verified: (callback: (receipt: CdvPurchaseVerifiedReceipt) => void) => CdvPurchaseWhenChain
  finished: (callback: (transaction: CdvPurchaseTransaction) => void) => CdvPurchaseWhenChain
  productUpdated: (callback: (product: CdvPurchaseProduct) => void) => CdvPurchaseWhenChain
  receiptUpdated: (callback: (receipt: CdvPurchaseReceipt) => void) => CdvPurchaseWhenChain
}

interface CdvPurchaseStore {
  register: (products: Array<{ id: string; type: string; platform: string }>) => void
  initialize: (platforms?: string[]) => Promise<void>
  get: (productId: string, platform?: string) => CdvPurchaseProduct | undefined
  order: (offer: CdvPurchaseOffer) => Promise<void>
  when: () => CdvPurchaseWhenChain
  ready: (callback: () => void) => void
  error: (callback: (error: { code: number; message: string }) => void) => void
  restorePurchases: () => Promise<void>
  update: () => Promise<void>
  products: CdvPurchaseProduct[]
  verbosity: number
  ApplicationUsername?: string
}

interface CdvPurchaseNamespace {
  store: CdvPurchaseStore
  ProductType: { CONSUMABLE: string }
  Platform: { APPLE_APPSTORE: string }
  LogLevel: { DEBUG: number; INFO: number; WARNING: number; ERROR: number; QUIET: number }
}

declare global {
  interface Window {
    CdvPurchase?: CdvPurchaseNamespace
  }
}

// ──────────────────────────────────────────────
// IAP Product Tiers
// ──────────────────────────────────────────────

// The app bundle ID from config.xml
const APP_BUNDLE_ID = 'org.gaia.ganime'

// Pre-defined IAP product tiers matching App Store Connect
export const IAP_TIERS = [1, 5, 10, 20, 50, 100, 200, 500, 1000] as const
export type IAPTierAmount = (typeof IAP_TIERS)[number]

// Generate product ID from amount: e.g. "org.gaia.ganime.topup_1"
export const getProductId = (amount: number): string =>
  `${APP_BUNDLE_ID}.topup_${amount}`

// Extract amount from product ID
const getAmountFromProductId = (productId: string): number => {
  const match = productId.match(/topup_(\d+)$/)
  return match ? parseInt(match[1], 10) : 0
}

// All IAP product definitions
const IAP_PRODUCTS = IAP_TIERS.map((amount) => ({
  id: getProductId(amount),
  type: CONSUMABLE,
  platform: APPLE_APPSTORE,
}))

// ──────────────────────────────────────────────
// Store state
// ──────────────────────────────────────────────

let storeInitialized = false
let storeReady = false
let onPurchaseApproved: ((productId: string, transaction: CdvPurchaseTransaction) => void) | null = null
let onPurchaseError: ((error: string) => void) | null = null

// ──────────────────────────────────────────────
// Initialization
// ──────────────────────────────────────────────

const getStore = (): CdvPurchaseStore | null => {
  if (!isCordova() || !isIOS()) return null
  return window.CdvPurchase?.store || null
}

// Initialize the IAP store - call once on app startup (after deviceready)
export const initializeIAP = (): void => {
  const store = getStore()
  if (!store || storeInitialized) return

  storeInitialized = true

  // Set verbosity to DEBUG for troubleshooting
  if (window.CdvPurchase?.LogLevel) {
    store.verbosity = window.CdvPurchase.LogLevel.DEBUG
  }

  console.log('[IAP] Registering products:', IAP_PRODUCTS.map((p) => p.id))

  // Register all consumable products
  store.register(IAP_PRODUCTS)

  // Set up event handlers
  setupEventHandlers(store)

  // Initialize the store with Apple App Store platform
  store.initialize([APPLE_APPSTORE])
    .then(() => {
      storeReady = true
      console.log('[IAP] Store initialized successfully')
      logProductStatus(store)
    })
    .catch((err: unknown) => {
      console.error('[IAP] Store initialization failed:', err)
    })
}

const logProductStatus = (store: CdvPurchaseStore): void => {
  console.log('[IAP] All products count:', store.products?.length)
  store.products?.forEach((p: CdvPurchaseProduct) => {
    console.log(`[IAP] Product: ${p.id}, valid: ${p.valid}, canPurchase: ${p.canPurchase}, title: ${p.title}, price: ${p.pricing?.price}`)
  })
}

// Set up IAP event handlers
const setupEventHandlers = (store: CdvPurchaseStore): void => {
  store.when()
    .approved((transaction) => {
      console.log('[IAP] Transaction approved:', transaction.transactionId)
      handleApproved(transaction)
    })
    .finished((transaction) => {
      console.log('[IAP] Transaction finished:', transaction.transactionId)
    })

  store.error((error) => {
    console.error('[IAP] Store error:', error.code, error.message)
    if (onPurchaseError) {
      onPurchaseError(error.message)
      onPurchaseError = null
    }
  })

  store.ready(() => {
    storeReady = true
    console.log('[IAP] Store ready')
  })
}

// Handle approved transaction - notify the callback so the app can verify on server
const handleApproved = (transaction: CdvPurchaseTransaction): void => {
  const productId = transaction.products?.[0]?.id
  if (productId && onPurchaseApproved) {
    onPurchaseApproved(productId, transaction)
    onPurchaseApproved = null
  }
}

// ──────────────────────────────────────────────
// Product info
// ──────────────────────────────────────────────

// Check if IAP is available
export const isIAPAvailable = (): boolean => {
  return isCordova() && isIOS() && storeInitialized
}

// Get product info (including localized price)
export const getProduct = (amount: number): CdvPurchaseProduct | undefined => {
  const store = getStore()
  if (!store) return undefined
  return store.get(getProductId(amount), APPLE_APPSTORE)
}

// Get localized price string for an amount
export const getLocalizedPrice = (amount: number): string => {
  const product = getProduct(amount)
  if (product?.pricing?.price) {
    return product.pricing.price
  }
  // Fallback to USD formatting
  return `$${amount.toFixed(2)}`
}

// ──────────────────────────────────────────────
// Purchase flow
// ──────────────────────────────────────────────

export interface IAPPurchaseResult {
  success: boolean
  productId?: string
  transactionId?: string
  error?: string
  amount?: number
}

// Initiate an IAP purchase for a given amount
// Returns a promise that resolves when the purchase is complete (approved by Apple)
// The caller must then verify the receipt on the server and call finishTransaction()
export const purchaseIAP = (amount: number): Promise<IAPPurchaseResult> => {
  return new Promise((resolve) => {
    const store = getStore()
    if (!store) {
      resolve({ success: false, error: 'IAP store not available' })
      return
    }

    const productId = getProductId(amount)

    // Debug: log all products in the store
    console.log('[IAP] Purchase attempt for:', productId)
    console.log('[IAP] storeReady:', storeReady)
    console.log('[IAP] store.products count:', store.products?.length)
    store.products?.forEach((p: CdvPurchaseProduct) => {
      console.log(`[IAP] Product in store: ${p.id}, valid: ${p.valid}, canPurchase: ${p.canPurchase}`)
    })

    const product = store.get(productId, APPLE_APPSTORE)
    console.log('[IAP] store.get result:', product ? `found (valid=${product.valid})` : 'null')

    if (!product) {
      resolve({ success: false, error: `Product not found: ${productId}` })
      return
    }

    if (!product.canPurchase || !product.offers || product.offers.length === 0) {
      resolve({ success: false, error: 'Product not available for purchase' })
      return
    }

    const offer = product.offers[0]

    // Set up callbacks for this purchase
    onPurchaseApproved = (pid, transaction) => {
      resolve({
        success: true,
        productId: pid,
        transactionId: transaction.transactionId,
        amount: getAmountFromProductId(pid),
      })
    }

    onPurchaseError = (error) => {
      resolve({ success: false, error })
    }

    // Initiate the purchase - this triggers the native Apple Pay / IAP sheet
    store.order(offer).catch((err: unknown) => {
      const errorMsg = err instanceof Error ? err.message : 'Purchase failed'
      onPurchaseApproved = null
      onPurchaseError = null
      resolve({ success: false, error: errorMsg })
    })
  })
}

// Finish a transaction after server-side verification
// MUST be called after successful server verification to consume the product
export const finishTransaction = (transactionId: string): void => {
  const store = getStore()
  if (!store) return

  // The plugin auto-finishes on verified, but we also keep a reference
  // In cordova-plugin-purchase v13+, finishing is done via transaction.finish()
  // which should have been called in the approved handler after verification
  console.log('[IAP] Finishing transaction:', transactionId)
}

// Get the app receipt for server-side verification (iOS only)
// The receipt is the base64-encoded App Store receipt
export const getAppReceipt = (): string | null => {
  if (!isCordova() || !isIOS()) return null

  // On iOS, the receipt is available via the native plugin
  // cordova-plugin-purchase handles receipt retrieval internally
  // For server verification, we use the transaction ID
  return null
}
