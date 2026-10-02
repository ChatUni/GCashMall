// Third-party sign-in on the client. The server does the proving: for Google it exchanges the
// code and returns a short-lived ticket, which is the only thing oauthLogin accepts; for Apple
// it verifies Apple's signed identity token. Both answer with { user, token } for an existing
// account (merged) or a newly created one.

import { apiPost } from './api'
import type { User } from '../types'

export interface OAuthSession {
  user: User
  token: string
  isNew: boolean
}

type Result = { success: boolean; data?: OAuthSession; error?: string }

export const signInWithOAuthCode = async (provider: string, code: string, redirectUri: string): Promise<Result> => {
  if (!provider || !code) return { success: false, error: 'Sign-in was cancelled' }
  const auth = await apiPost<{ ticket: string }>(`${provider}Auth`, { code, redirectUri })
  if (!auth.success || !auth.data?.ticket) return { success: false, error: auth.error || 'Sign-in failed' }
  return apiPost<OAuthSession>('oauthLogin', { ticket: auth.data.ticket })
}

// ── Sign in with Apple (iOS app, native sheet via cordova-plugin-sign-in-with-apple) ──

interface AppleSignInResponse {
  identityToken: string
  authorizationCode: string
  fullName?: { givenName?: string; familyName?: string }
}

interface AppleSignInPlugin {
  signin: (
    options: { requestedScopes: number[] },
    onSuccess: (res: AppleSignInResponse) => void,
    onError: (err: { code?: string; error?: string; localizedDescription?: string }) => void,
  ) => void
}

const applePlugin = (): AppleSignInPlugin | undefined =>
  (window as unknown as { cordova?: { plugins?: { SignInWithApple?: AppleSignInPlugin } } }).cordova?.plugins?.SignInWithApple

export const isAppleSignInAvailable = (): boolean => !!applePlugin()

// Apple's error 1001 is the user closing the sheet — not worth an error message.
const APPLE_CANCELLED = '1001'

export const signInWithApple = async (): Promise<Result> => {
  const plugin = applePlugin()
  if (!plugin) return { success: false, error: 'Sign in with Apple is not available' }
  const res = await new Promise<AppleSignInResponse | null>((resolve, reject) =>
    // Scopes: 0 = full name, 1 = email.
    plugin.signin({ requestedScopes: [0, 1] }, resolve, (err) =>
      String(err?.code) === APPLE_CANCELLED ? resolve(null) : reject(new Error(err?.localizedDescription || err?.error || 'Apple sign-in failed')),
    ),
  )
  if (!res) return { success: false }
  return apiPost<OAuthSession>('appleLogin', {
    identityToken: res.identityToken,
    authorizationCode: res.authorizationCode,
    fullName: res.fullName,
  })
}
