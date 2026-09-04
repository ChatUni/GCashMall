// Create the four credit top-up products in App Store Connect, and retire the old ones.
//
// fastlane cannot do this: its ConnectAPI layer has no in-app-purchase models, and the only
// IAP support it ships (Spaceship::Tunes) talks to Apple's private iTunes Connect endpoints
// and needs an Apple ID password plus interactive 2FA. The official App Store Connect API
// does support it, and the ASC key already configured for TestFlight uploads is enough.
//
// Fills everything the API can set — product, English localization, USD price, review note.
// Review SCREENSHOTS must still be attached by hand; a product cannot be submitted without
// one.
//
//   node scripts/iap/apple-iap.mjs            # dry run: show the plan, change nothing
//   node scripts/iap/apple-iap.mjs --apply    # create the new products
//   node scripts/iap/apple-iap.mjs --apply --delete-old   # ...and delete the superseded ones
//
// Idempotent: a product that already exists is left alone, and each step is skipped if it
// has already been done.

import { readFileSync } from 'fs'
import { createRequire } from 'module'

const REPO = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')
for (const l of readFileSync(`${REPO}/.env`, 'utf8').split('\n')) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const jwt = createRequire(`${REPO}/netlify/functions/utils/x.js`)('jsonwebtoken')
const token = jwt.sign({ aud: 'appstoreconnect-v1' }, readFileSync(`${REPO}/fastlane/asc_api_key.p8`, 'utf8'), {
  algorithm: 'ES256',
  expiresIn: '18m',
  issuer: process.env.ASC_ISSUER_ID,
  header: { alg: 'ES256', kid: process.env.ASC_KEY_ID, typ: 'JWT' },
})

const asc = async (method, path, body) => {
  const r = await fetch(`https://api.appstoreconnect.apple.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await r.text()
  let json = {}
  try { json = text ? JSON.parse(text) : {} } catch { json = { raw: text } }
  if (!r.ok) {
    const detail = (json.errors || []).map((e) => `${e.title}: ${e.detail}`).join(' | ') || text.slice(0, 300)
    throw new Error(`${method} ${path} -> ${r.status}  ${detail}`)
  }
  return json
}

// Follow pagination — the USD price catalogue runs well past one page ($49.99 is not on it).
const ascAll = async (path) => {
  let url = path
  const out = []
  while (url) {
    const page = await asc('GET', url)
    out.push(...(page.data || []))
    const next = page.links?.next
    url = next ? next.replace('https://api.appstoreconnect.apple.com', '') : null
  }
  return out
}

const APP_ID = '6801237246'
const BUNDLE = 'io.ganime.app'
const apply = process.argv.includes('--apply')
const deleteOld = process.argv.includes('--delete-old')

// Mirrors TOPUP_TIERS in src/utils/credits.ts and the ids getProductId() builds (cents).
const TIERS = [
  { cents: 599,  usd: 5.99,  credits: 600 },
  { cents: 999,  usd: 9.99,  credits: 1100 },
  { cents: 1999, usd: 19.99, credits: 2300 },
  { cents: 4999, usd: 49.99, credits: 6000 },
]
const fmt = (n) => n.toLocaleString('en-US')
const productId = (t) => `${BUNDLE}.topup_${t.cents}`
// Display name <= 30 chars, description <= 45.
const displayName = (t) => `${fmt(t.credits)} Credits`
const description = (t) => `${fmt(t.credits)} credits for generating episodes.`
const reviewNote = (t) =>
  `Consumable credit pack. Adds ${fmt(t.credits)} credits to the signed-in account's balance. ` +
  `Credits are spent generating anime episodes in Quick Create; pricing is shown in-app before purchase.`

const main = async () => {
  const existing = await ascAll(`/v1/apps/${APP_ID}/inAppPurchasesV2?limit=200`)
  const byProductId = new Map(existing.map((p) => [p.attributes.productId, p]))
  const wanted = new Set(TIERS.map(productId))
  const superseded = existing.filter((p) => !wanted.has(p.attributes.productId))

  console.log(`App ${APP_ID} — ${existing.length} existing in-app purchase(s)\n`)
  console.log('PLAN')
  for (const t of TIERS) {
    const found = byProductId.get(productId(t))
    console.log(`  ${found ? 'exists ' : 'CREATE '} ${productId(t).padEnd(24)} $${t.usd.toFixed(2).padStart(5)}  "${displayName(t)}"`)
  }
  for (const p of superseded) {
    console.log(`  ${deleteOld ? 'DELETE ' : 'keep   '} ${p.attributes.productId.padEnd(24)} (superseded, ${p.attributes.state})`)
  }
  if (!deleteOld && superseded.length) console.log('\n  (pass --delete-old to remove the superseded products)')

  if (!apply) {
    console.log('\nDry run — nothing was changed. Re-run with --apply.')
    return
  }

  console.log('\nAPPLYING')
  for (const t of TIERS) {
    const pid = productId(t)
    let iap = byProductId.get(pid)
    if (iap) {
      console.log(`  ${pid}: already exists (${iap.id})`)
    } else {
      const created = await asc('POST', '/v2/inAppPurchases', {
        data: {
          type: 'inAppPurchases',
          attributes: {
            name: displayName(t),
            productId: pid,
            inAppPurchaseType: 'CONSUMABLE',
            reviewNote: reviewNote(t),
            familySharable: false,
          },
          relationships: { app: { data: { type: 'apps', id: APP_ID } } },
        },
      })
      iap = created.data
      console.log(`  ${pid}: created (${iap.id})`)
    }

    await ensureLocalization(iap.id, t)
    await ensureAvailability(iap.id)
    await ensurePrice(iap.id, t)
  }

  if (deleteOld) {
    for (const p of superseded) await retire(p)
  }

  console.log('\nDone. Each product still needs a review screenshot attached in App Store Connect before it can be submitted.')
}

// A newly created product has NO availability record, which means it is on sale nowhere —
// the price alone is not enough to make it purchasable. An in-app purchase can only be
// bought where the app itself is sold, so listing every territory is permissive rather than
// over-reaching: the app's own availability still governs.
const ensureAvailability = async (iapId) => {
  const existing = await asc('GET', `/v2/inAppPurchases/${iapId}/inAppPurchaseAvailability`).catch(() => null)
  if (existing?.data) {
    console.log('      availability: already set')
    return
  }
  const territories = await ascAll('/v1/territories?limit=200')
  await asc('POST', '/v1/inAppPurchaseAvailabilities', {
    data: {
      type: 'inAppPurchaseAvailabilities',
      attributes: { availableInNewTerritories: true },
      relationships: {
        inAppPurchase: { data: { type: 'inAppPurchases', id: iapId } },
        availableTerritories: { data: territories.map((t) => ({ type: 'territories', id: t.id })) },
      },
    },
  })
  console.log(`      availability: ${territories.length} territories, plus new ones automatically`)
}

// Take a superseded product off sale.
//
// Apple refuses DELETE on a product that has reached READY_TO_SUBMIT with its metadata and
// review screenshot in place ("You cannot delete the in-app purchase"), so deletion is tried
// first and removal-from-sale is the fallback: an availability with no territories makes it
// unpurchasable everywhere, which is the same outcome the App Store offers in its own UI.
const retire = async (p) => {
  const pid = p.attributes.productId
  try {
    await asc('DELETE', `/v2/inAppPurchases/${p.id}`)
    console.log(`  ${pid}: deleted`)
    return
  } catch {
    // Not deletable — fall through to removing it from sale.
  }
  try {
    await asc('POST', '/v1/inAppPurchaseAvailabilities', {
      data: {
        type: 'inAppPurchaseAvailabilities',
        attributes: { availableInNewTerritories: false },
        relationships: {
          inAppPurchase: { data: { type: 'inAppPurchases', id: p.id } },
          availableTerritories: { data: [] },
        },
      },
    })
    console.log(`  ${pid}: not deletable — removed from sale in all territories`)
  } catch (e) {
    console.error(`  ${pid}: could not retire — ${e.message}`)
  }
}

// English only, per instruction. en-US is the locale the App Store falls back to.
const ensureLocalization = async (iapId, t) => {
  const locs = await ascAll(`/v2/inAppPurchases/${iapId}/inAppPurchaseLocalizations?limit=200`)
  if (locs.some((l) => l.attributes.locale === 'en-US')) {
    console.log('      localization: already present')
    return
  }
  await asc('POST', '/v1/inAppPurchaseLocalizations', {
    data: {
      type: 'inAppPurchaseLocalizations',
      attributes: { name: displayName(t), locale: 'en-US', description: description(t) },
      relationships: { inAppPurchaseV2: { data: { type: 'inAppPurchases', id: iapId } } },
    },
  })
  console.log(`      localization: en-US "${displayName(t)}" — ${description(t)}`)
}

// Price points are scoped to the product they are read from, so they must be looked up per
// IAP rather than reused from a sibling.
const ensurePrice = async (iapId, t) => {
  const schedule = await asc('GET', `/v2/inAppPurchases/${iapId}/iapPriceSchedule`).catch(() => null)
  if (schedule?.data) {
    console.log('      price: already scheduled')
    return
  }
  const points = await ascAll(`/v2/inAppPurchases/${iapId}/pricePoints?filter[territory]=USA&limit=200`)
  const point = points.find((p) => Number(p.attributes.customerPrice) === t.usd)
  if (!point) throw new Error(`no USA price point for $${t.usd} (searched ${points.length})`)

  await asc('POST', '/v1/inAppPurchasePriceSchedules', {
    data: {
      type: 'inAppPurchasePriceSchedules',
      relationships: {
        inAppPurchase: { data: { type: 'inAppPurchases', id: iapId } },
        baseTerritory: { data: { type: 'territories', id: 'USA' } },
        manualPrices: { data: [{ type: 'inAppPurchasePrices', id: '${price}' }] },
      },
    },
    included: [
      {
        type: 'inAppPurchasePrices',
        id: '${price}',
        attributes: { startDate: null, endDate: null },
        relationships: { inAppPurchasePricePoint: { data: { type: 'inAppPurchasePricePoints', id: point.id } } },
      },
    ],
  })
  console.log(`      price: $${t.usd} (USA base, all territories)`)
}

main().catch((e) => {
  console.error('\nFAILED:', e.message)
  process.exit(1)
})
