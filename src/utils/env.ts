// Boolean environment flags.
//
// These are set by hand in a hosting dashboard, so they arrive spelled however the person
// typed them — "1", "true", "TRUE", "yes". Comparing against one exact literal makes a flag
// silently do nothing when it's spelled another way, which is how VITE_COMING_SOON=true sat
// on production without ever showing the splash.
//
// Anything not recognised as on — absent, empty, "false", "0" — is off.
const TRUTHY = new Set(['1', 'true', 'yes', 'on'])

export const isFlagOn = (value: unknown): boolean =>
  TRUTHY.has(String(value ?? '').trim().toLowerCase())
