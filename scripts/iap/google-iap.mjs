// Create the four credit top-up products in Google Play, and retire the old one.
//
// fastlane's `supply` does not manage in-app products, so this talks to the Play Developer
// API directly with the service account already configured for uploads.
//
// Note the API generation: the legacy `inappproducts` endpoints now answer 403 "Please
// migrate to the new publishing API", so this uses `oneTimeProducts`, where a product owns
// purchase options which own per-region prices. Regional prices are not hand-written —
// `pricing:convertRegionPrices` turns one USD base price into all ~173 local ones, the same
// conversion the Play Console offers.
//
// Fills everything the API can set: product, English listing, prices, availability.
//
//   node scripts/iap/google-iap.mjs            # dry run: show the plan, change nothing
//   node scripts/iap/google-iap.mjs --apply    # create the new products
//   node scripts/iap/google-iap.mjs --apply --delete-old   # ...and remove the superseded ones
//
// Idempotent: re-running updates the same products in place rather than duplicating them.

import { readFileSync } from 'fs'
import { createRequire } from 'module'

const REPO = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')
const PKG = 'io.ganime.app'
const apply = process.argv.includes('--apply')
const deleteOld = process.argv.includes('--delete-old')

const jwtLib = createRequire(`${REPO}/netlify/functions/utils/x.js`)('jsonwebtoken')
const sa = JSON.parse(readFileSync(`${REPO}/fastlane/play-service-account.json`, 'utf8'))

const accessToken = await (async () => {
  const assertion = jwtLib.sign(
    { scope: 'https://www.googleapis.com/auth/androidpublisher', aud: sa.token_uri },
    sa.private_key,
    { algorithm: 'RS256', issuer: sa.client_email, expiresIn: '1h' },
  )
  const res = await (await fetch(sa.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  })).json()
  if (!res.access_token) throw new Error(`Play auth failed: ${JSON.stringify(res)}`)
  return res.access_token
})()

const play = async (method, path, body) => {
  const r = await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PKG}${path}`, {
    method,
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await r.text()
  let json = {}
  try { json = text ? JSON.parse(text) : {} } catch { json = { raw: text } }
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status}  ${(json.error?.message || text).slice(0, 300)}`)
  return json
}

// Mirrors TOPUP_TIERS in src/utils/credits.ts and the ids getProductId() builds (cents).
const TIERS = [
  { cents: 599,  usd: 5.99,  credits: 600 },
  { cents: 999,  usd: 9.99,  credits: 1100 },
  { cents: 1999, usd: 19.99, credits: 2300 },
  { cents: 4999, usd: 49.99, credits: 6000 },
]
const fmt = (n) => n.toLocaleString('en-US')
const productId = (t) => `${PKG}.topup_${t.cents}`
const title = (t) => `${fmt(t.credits)} Credits`
const description = (t) => `${fmt(t.credits)} credits for generating anime episodes in Ganime.`
// Play prices are units + nanos, not cents.
const money = (usd) => ({ currencyCode: 'USD', units: String(Math.floor(usd)), nanos: Math.round((usd % 1) * 1e9) })

const main = async () => {
  const list = await play('GET', '/oneTimeProducts')
  const existing = list.oneTimeProducts || []
  const byId = new Map(existing.map((p) => [p.productId, p]))
  const wanted = new Set(TIERS.map(productId))
  const superseded = existing.filter((p) => !wanted.has(p.productId))

  console.log(`${PKG} — ${existing.length} existing one-time product(s)\n`)
  console.log('PLAN')
  for (const t of TIERS) {
    console.log(`  ${byId.has(productId(t)) ? 'update ' : 'CREATE '} ${productId(t).padEnd(24)} $${t.usd.toFixed(2).padStart(5)}  "${title(t)}"`)
  }
  for (const p of superseded) {
    console.log(`  ${deleteOld ? 'DELETE ' : 'keep   '} ${p.productId.padEnd(24)} (superseded)`)
  }
  if (!deleteOld && superseded.length) console.log('\n  (pass --delete-old to remove the superseded products)')

  if (!apply) {
    console.log('\nDry run — nothing was changed. Re-run with --apply.')
    return
  }

  console.log('\nAPPLYING')
  for (const t of TIERS) await upsert(t, byId.has(productId(t)))
  await activateAll()

  if (deleteOld) {
    for (const p of superseded) {
      try {
        await play('DELETE', `/oneTimeProducts/${encodeURIComponent(p.productId)}`)
        console.log(`  ${p.productId}: deleted`)
      } catch (e) {
        console.error(`  ${p.productId}: NOT deleted — ${e.message}`)
      }
    }
  }

  console.log('\nDone.')
}

// A newly written product's purchase option is DRAFT, and a DRAFT option cannot be bought —
// the price and listing alone are not enough. Activation is a separate call.
const activateAll = async () => {
  const list = await play('GET', '/oneTimeProducts')
  for (const p of list.oneTimeProducts || []) {
    if (!TIERS.some((t) => productId(t) === p.productId)) continue
    const draft = (p.purchaseOptions || []).filter((o) => o.state !== 'ACTIVE')
    if (draft.length === 0) {
      console.log(`  ${p.productId}: already active`)
      continue
    }
    await play('POST', `/oneTimeProducts/${encodeURIComponent(p.productId)}/purchaseOptions:batchUpdateStates`, {
      requests: draft.map((o) => ({
        activatePurchaseOptionRequest: {
          packageName: PKG,
          productId: p.productId,
          purchaseOptionId: o.purchaseOptionId,
        },
      })),
    })
    console.log(`  ${p.productId}: activated (${draft.map((o) => o.purchaseOptionId).join(', ')})`)
  }
}

const upsert = async (t, exists) => {
  const pid = productId(t)

  // One USD base price -> every region's local price, using Play's own conversion table.
  const converted = await play('POST', '/pricing:convertRegionPrices', { price: money(t.usd) })
  const regions = converted.convertedRegionPrices || {}
  const configs = Object.entries(regions).map(([regionCode, v]) => ({
    regionCode,
    price: v.price,
    availability: 'AVAILABLE',
  }))

  await play('PATCH',
    `/onetimeproducts/${encodeURIComponent(pid)}` +
      `?updateMask=listings,purchaseOptions,taxAndComplianceSettings` +
      `&regionsVersion.version=${encodeURIComponent(converted.regionVersion?.version || '')}` +
      `&allowMissing=true`,
    {
      packageName: PKG,
      productId: pid,
      listings: [{ languageCode: 'en-US', title: title(t), description: description(t) }],
      purchaseOptions: [
        {
          purchaseOptionId: 'buy',
          // legacyCompatible keeps the product visible to the classic billing flow the
          // Cordova plugin uses; without it the product is invisible to the app.
          buyOption: { legacyCompatible: true },
          regionalPricingAndAvailabilityConfigs: configs,
        },
      ],
      taxAndComplianceSettings: { isTokenizedDigitalAsset: false },
    },
  )
  console.log(`  ${pid}: ${exists ? 'updated' : 'created'} — "${title(t)}", $${t.usd} across ${configs.length} regions`)
}

main().catch((e) => {
  console.error('\nFAILED:', e.message)
  process.exit(1)
})
