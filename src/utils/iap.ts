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
  isConsumed?: boolean
  isPending?: boolean
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
  localTransactions: CdvPurchaseTransaction[]
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
// Approved transactions awaiting finish(), keyed by transactionId. A consumable that is
// never finished stays "owned" (blocking re-purchase) and gets re-delivered on next launch.
const pendingTransactions = new Map<string, CdvPurchaseTransaction>()
// Verifies+credits an approved transaction with no purchase in flight (e.g. one re-delivered
// at startup). Registered by the account service to avoid an import cycle. Returns true when
// the server credited the wallet, in which case the transaction is finished.
let reconcileHandler: ((productId: string, amount: number, transactionId: string) => Promise<boolean>) | null = null
// transactionIds already reconciled this session, so the startup sweep and the approved
// event don't process (and double-credit) the same transaction.
const reconciledIds = new Set<string>()

export const setIAPReconcileHandler = (
  handler: (productId: string, amount: number, transactionId: string) => Promise<boolean>,
): void => {
  reconcileHandler = handler
}

// Credit an orphaned/re-delivered transaction (best effort) and ALWAYS finish it.
// Finishing is unconditional on purpose: an unfinished consumable is marked "owned" by
// StoreKit and permanently blocks re-purchase of that tier, which is worse than a missed
// credit (real receipt validation + idempotent crediting is the production-grade follow-up).
const reconcileTransaction = (productId: string, transaction: CdvPurchaseTransaction): void => {
  const txnId = transaction.transactionId
  if (!productId || !txnId || reconciledIds.has(txnId)) return
  reconciledIds.add(txnId)
  pendingTransactions.set(txnId, transaction)

  const finish = () => finishTransaction(txnId)
  if (!reconcileHandler) {
    finish()
    return
  }
  reconcileHandler(productId, getAmountFromProductId(productId), txnId)
    .catch((err) => console.error('[IAP] Reconcile failed:', err))
    .finally(finish)
}

// Finish any consumable transactions left unfinished by a previous run (e.g. an earlier
// build that never called finish()). Without this they keep canPurchase=false forever.
const reconcileStuckTransactions = (store: CdvPurchaseStore): void => {
  const transactions = store.localTransactions || []
  transactions
    .filter((txn) => !txn.isConsumed && !txn.isPending)
    .forEach((txn) => {
      const productId = txn.products?.[0]?.id
      if (productId) {
        console.log('[IAP] Reconciling stuck transaction:', txn.transactionId, productId)
        reconcileTransaction(productId, txn)
      }
    })
}

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
      // Clear any consumables left unfinished by a previous run so they stop blocking purchases.
      reconcileStuckTransactions(store)
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
  // Keep the transaction so it can be finished after server verification.
  if (transaction.transactionId) {
    pendingTransactions.set(transaction.transactionId, transaction)
  }
  if (!productId) return

  if (onPurchaseApproved) {
    onPurchaseApproved(productId, transaction)
    onPurchaseApproved = null
    return
  }

  // No purchase in flight: this transaction was re-delivered (an interrupted purchase or one
  // left unfinished by an earlier build). Credit it and always finish it (see reconcileTransaction).
  reconcileTransaction(productId, transaction)
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

    // Need a concrete offer to order. We intentionally do NOT block on product.canPurchase:
    // for consumables it reports false whenever a prior transaction is unfinished, which the
    // reconcile logic clears — gating on it here is what produced the false "not available".
    if (!product.offers || product.offers.length === 0) {
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

// Finish a transaction after server-side verification.
// MUST be called after successful server verification to consume the product, otherwise
// the consumable stays "owned" and can't be purchased again.
export const finishTransaction = (transactionId: string): void => {
  if (!transactionId) return
  const transaction = pendingTransactions.get(transactionId)
  if (!transaction) return
  try {
    transaction.finish()
    console.log('[IAP] Finished transaction:', transactionId)
  } catch (err) {
    console.error('[IAP] Failed to finish transaction:', transactionId, err)
  }
  pendingTransactions.delete(transactionId)
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
