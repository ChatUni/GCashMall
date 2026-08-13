// Google Play Developer API verification for Play Billing purchases.
//
// SCAFFOLD: no-op (with a warning) until a service account is configured, so it doesn't
// block testing — mirrors the Apple IAP stub. Before production, implement the real check:
//   1. Exchange GOOGLE_PLAY_SERVICE_ACCOUNT (a service-account JSON with the
//      androidpublisher scope) for an OAuth2 access token.
//   2. GET https://androidpublisher.googleapis.com/androidpublisher/v3/applications/
//        {packageName}/purchases/products/{productId}/tokens/{purchaseToken}
//   3. Require purchaseState === 0 (purchased) and that the productId matches, then throw
//      on any mismatch. Optionally acknowledge/consume the purchase.

const APP_PACKAGE = process.env.APP_BUNDLE_ID || 'io.ganime.app'
// A service-account JSON string (or base64) granted access to the Play Developer API.
const SERVICE_ACCOUNT = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT

const isConfigured = () => Boolean(SERVICE_ACCOUNT)

// Validate that a Play Billing purchase is real and matches the expected product.
// No-op when credentials are not configured (sandbox/testing). Throws when validation fails.
const verifyGooglePlayTransaction = async (purchaseToken, expectedProductId) => {
  if (!purchaseToken && !isConfigured()) {
    // Reconcile path may not carry a token yet; allow while unconfigured.
    console.warn('[Play] No purchaseToken and Google Play creds not set — skipping validation.')
    return
  }
  if (!isConfigured()) {
    console.warn(
      '[Play] Google Play credentials not set — skipping purchase validation. Set GOOGLE_PLAY_SERVICE_ACCOUNT (Play Developer API service account) to enable it for production.',
    )
    return
  }
  // TODO(production): implement the androidpublisher purchases.products.get check described
  // above for package "%s" and require purchaseState === 0. Until then, do not silently
  // credit unverified purchases in production — wire this before going live.
  console.warn(
    `[Play] Google Play validation not implemented yet (package ${APP_PACKAGE}, product ${expectedProductId}). Implement before production.`,
  )
}

export { verifyGooglePlayTransaction }
