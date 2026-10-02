// Third-party sign-in (Google, Apple) — proof of identity, then one shared login step.
//
// The server never takes an email from the client as proof of who someone is. Google: the
// server exchanges the authorization code itself and issues a short-lived signed ticket
// carrying what Google said. Apple: the app hands over Apple's signed identity token, which is
// verified here against Apple's public keys. Either way, only verified claims reach
// signInWithOAuth.

import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { getJwtSecret } from './jwt.js'

const TICKET_PURPOSE = 'oauth-ticket'
const TICKET_TTL = '10m'

const APPLE_ISSUER = 'https://appleid.apple.com'
const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys'
const APPLE_TOKEN_URL = 'https://appleid.apple.com/auth/token'
const APPLE_REVOKE_URL = 'https://appleid.apple.com/auth/revoke'
export const APPLE_CLIENT_ID = 'io.ganime.app'

// ── Tickets (Google) ──

export const issueOAuthTicket = (identity) => {
  if (!identity?.provider || !identity?.oauthId || !identity?.email) throw new Error('Incomplete OAuth identity')
  return jwt.sign({ ...identity, purpose: TICKET_PURPOSE }, getJwtSecret(), { expiresIn: TICKET_TTL })
}

export const readOAuthTicket = (ticket) => {
  if (!ticket) throw new Error('Sign-in ticket is required')
  let claims
  try {
    claims = jwt.verify(String(ticket), getJwtSecret())
  } catch {
    throw new Error('Sign-in expired, please try again')
  }
  if (claims.purpose !== TICKET_PURPOSE) throw new Error('Invalid sign-in ticket')
  return claims
}

// ── Apple identity token ──

let appleKeysCache = { at: 0, keys: [] }

const appleKeys = async () => {
  if (Date.now() - appleKeysCache.at < 60 * 60 * 1000 && appleKeysCache.keys.length) return appleKeysCache.keys
  const res = await fetch(APPLE_KEYS_URL)
  if (!res.ok) throw new Error('Could not reach Apple to verify sign-in')
  appleKeysCache = { at: Date.now(), keys: (await res.json()).keys || [] }
  return appleKeysCache.keys
}

const applePublicKey = async (kid) => {
  const jwk = (await appleKeys()).find((k) => k.kid === kid)
  if (!jwk) throw new Error('Unknown Apple signing key')
  return crypto.createPublicKey({ key: jwk, format: 'jwk' })
}

// The verified claims of an Apple identity token: sub (stable Apple user id), email,
// email_verified. Apple sends the user's name to the app only on the first sign-in, never in
// the token, so the name comes separately and is only used as a display default.
export const verifyAppleIdentityToken = async (identityToken) => {
  if (!identityToken) throw new Error('Apple identity token is required')
  const decoded = jwt.decode(String(identityToken), { complete: true })
  if (!decoded?.header?.kid) throw new Error('Malformed Apple identity token')
  const key = await applePublicKey(decoded.header.kid)
  return jwt.verify(String(identityToken), key, { algorithms: ['RS256'], issuer: APPLE_ISSUER, audience: APPLE_CLIENT_ID })
}

// ── Apple token revocation (account deletion) ──
//
// Apple requires apps offering Sign in with Apple to revoke the user's tokens when the
// account is deleted. That needs a Sign in with Apple key: APPLE_SIWA_KEY_ID plus
// APPLE_SIWA_PRIVATE_KEY (the .p8 contents) and IOS_TEAM_ID. Without them both steps no-op.

const siwaConfigured = () =>
  !!(process.env.APPLE_SIWA_KEY_ID && process.env.APPLE_SIWA_PRIVATE_KEY && process.env.IOS_TEAM_ID)

const appleClientSecret = () =>
  jwt.sign({}, process.env.APPLE_SIWA_PRIVATE_KEY.replace(/\\n/g, '\n'), {
    algorithm: 'ES256',
    expiresIn: '5m',
    issuer: process.env.IOS_TEAM_ID,
    audience: APPLE_ISSUER,
    subject: APPLE_CLIENT_ID,
    keyid: process.env.APPLE_SIWA_KEY_ID,
  })

const appleForm = (url, fields) =>
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: APPLE_CLIENT_ID, client_secret: appleClientSecret(), ...fields }),
  })

// Trade the one-time authorization code for a refresh token, kept so it can be revoked later.
export const appleRefreshToken = async (authorizationCode) => {
  if (!authorizationCode || !siwaConfigured()) return null
  try {
    const res = await appleForm(APPLE_TOKEN_URL, { code: String(authorizationCode), grant_type: 'authorization_code' })
    return res.ok ? (await res.json()).refresh_token || null : null
  } catch (error) {
    console.error('[apple] code exchange failed:', error.message)
    return null
  }
}

export const revokeAppleToken = async (refreshToken) => {
  if (!refreshToken || !siwaConfigured()) return
  try {
    await appleForm(APPLE_REVOKE_URL, { token: refreshToken, token_type_hint: 'refresh_token' })
  } catch (error) {
    console.error('[apple] revoke failed:', error.message)
  }
}
