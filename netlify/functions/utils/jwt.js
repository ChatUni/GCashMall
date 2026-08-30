// The signing key for every auth token.
//
// Deliberately NO fallback. A default here ships in the repository, so anyone who can read
// the source could forge a token for any account — including an admin one, which now
// carries the moderation queue. A missing JWT_SECRET has to fail loudly instead of quietly
// authenticating everyone against a published key.
//
// Read on use rather than at module load, so a misconfigured environment breaks
// authentication only, instead of taking down the public read endpoints in the same bundle.
export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error(
      'JWT_SECRET is not configured — set it in the site environment. Refusing to sign or verify tokens without it.',
    )
  }
  return secret
}
