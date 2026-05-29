import jwt from 'jsonwebtoken'

// App Store Server API credentials (set in Netlify env for production validation).
// Generate the key under App Store Connect > Users and Access > Integrations > In-App Purchase.
const APP_BUNDLE_ID = process.env.APP_BUNDLE_ID || 'org.gaia.ganime'
const KEY_ID = process.env.APPLE_IAP_KEY_ID
const ISSUER_ID = process.env.APPLE_IAP_ISSUER_ID
const PRIVATE_KEY = (process.env.APPLE_IAP_PRIVATE_KEY || '').replace(/\\n/g, '\n')

const PROD_BASE = 'https://api.storekit.itunes.apple.com'
const SANDBOX_BASE = 'https://api.storekit-sandbox.itunes.apple.com'

const isConfigured = () => Boolean(KEY_ID && ISSUER_ID && PRIVATE_KEY)

// Bearer token for the App Store Server API (ES256, signed with the .p8 key).
const generateBearerToken = () => {
  const now = Math.floor(Date.now() / 1000)
  return jwt.sign(
    {
      iss: ISSUER_ID,
      iat: now,
      exp: now + 5 * 60,
      aud: 'appstoreconnect-v1',
      bid: APP_BUNDLE_ID,
    },
    PRIVATE_KEY,
    { algorithm: 'ES256', keyid: KEY_ID },
  )
}

const fetchTransaction = (baseUrl, transactionId, token) =>
  fetch(`${baseUrl}/inApps/v1/transactions/${encodeURIComponent(transactionId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

// The response is a JWS; its payload is JSON. We fetched it directly from Apple over TLS
// (authenticated by our key), so the transport is trusted — decode the payload to read it.
const decodeSignedTransaction = (jws) => {
  const parts = (jws || '').split('.')
  if (parts.length !== 3) {
    throw new Error('Malformed signed transaction from Apple')
  }
  return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
}

// Look up the transaction on Apple, trying production then sandbox.
const lookupTransaction = async (transactionId) => {
  const token = generateBearerToken()
  let res = await fetchTransaction(PROD_BASE, transactionId, token)
  if (res.status === 404) {
    res = await fetchTransaction(SANDBOX_BASE, transactionId, token)
  }
  if (!res.ok) {
    throw new Error(`Apple transaction lookup failed (status ${res.status})`)
  }
  const body = await res.json()
  return decodeSignedTransaction(body.signedTransactionInfo)
}

// Validate that an App Store transaction is real and matches the expected product.
// No-op (with a warning) when credentials are not configured, so sandbox testing isn't
// blocked before the App Store Server API key is set up. Throws when validation fails.
const verifyAppleTransaction = async (transactionId, expectedProductId) => {
  if (!transactionId) {
    throw new Error('transactionId is required')
  }
  if (!isConfigured()) {
    console.warn(
      '[IAP] Apple credentials not set — skipping receipt validation. Configure APPLE_IAP_KEY_ID, APPLE_IAP_ISSUER_ID and APPLE_IAP_PRIVATE_KEY to enable it for production.',
    )
    return
  }

  const info = await lookupTransaction(transactionId)

  if (info.bundleId !== APP_BUNDLE_ID) {
    throw new Error(`Bundle ID mismatch: ${info.bundleId}`)
  }
  if (info.productId !== expectedProductId) {
    throw new Error(`Apple product mismatch: expected ${expectedProductId}, got ${info.productId}`)
  }
  if (String(info.transactionId) !== String(transactionId)) {
    throw new Error('Transaction ID mismatch with Apple record')
  }
}

export { verifyAppleTransaction }
