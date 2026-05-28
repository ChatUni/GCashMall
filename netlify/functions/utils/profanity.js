import { Filter, collapseSpacedCharacters } from 'glin-profanity'

// Latin-script languages use word boundaries (ASCII \b) to avoid substring false
// positives (class, password) while still catching leetspeak/obfuscation.
const latinFilter = new Filter({
  languages: ['english', 'french', 'spanish'],
  detectLeetspeak: true,
  leetspeakLevel: 'aggressive',
  wordBoundaries: true,
})

// Chinese has no word boundaries (ASCII \b doesn't recognize CJK), so match substrings.
const chineseFilter = new Filter({
  languages: ['chinese'],
  wordBoundaries: false,
})

// Single chars that are vulgar standalone but also appear in many legit compounds.
const AMBIGUOUS_ZH = ['操', '艹', '肏']

// Legit compounds containing an ambiguous char; stripped before matching so the
// bare char (and glin substrings like "操比") don't false-trigger inside them.
const ZH_WHITELIST = [
  '操作', '操控', '操纵', '操心', '操劳', '操办', '操练', '操守', '操行',
  '操持', '操盘', '操场', '操琴', '操刀', '操胜券', '操之过急', '体操',
  '早操', '出操', '做操', '课间操', '广播体操', '重操旧业', '节操',
  '情操', '贞操', '操典',
]

const stripWhitelist = (text) =>
  ZH_WHITELIST.reduce((acc, word) => acc.split(word).join(''), text)

// Collapse separator-based obfuscation: "f-u-c-k-i-n-g" / "f.u.c.k" / "f u c k" -> "fucking".
const SEPARATORS = /[-_.*•·~|]+/g
const deobfuscate = (text) => collapseSpacedCharacters(text.replace(SEPARATORS, ' '))

// Mask chars stand in for a hidden letter ("sh*t", "f**k", "f#ck"). Treat each as a
// wildcard and flag the token only if it fully matches a known profanity.
const MASK_CHARS = /[*#]/
const MASK_TOKEN = /[a-z*#]+/g
const CORE_PROFANITY = [
  'fuck', 'fuckin', 'fucking', 'fucked', 'fucker', 'fuckers', 'fucks', 'motherfucker',
  'shit', 'shits', 'shitty', 'bullshit', 'bitch', 'bitches', 'cunt', 'cunts',
  'ass', 'asshole', 'assholes', 'dick', 'dickhead', 'pussy', 'bastard', 'slut',
  'whore', 'cock', 'nigger', 'nigga', 'faggot', 'fag', 'twat', 'wanker', 'prick',
]
const containsMaskedProfanity = (text) =>
  (text.toLowerCase().match(MASK_TOKEN) || [])
    .filter((token) => MASK_CHARS.test(token))
    .some((token) => {
      const pattern = new RegExp(`^${token.replace(/[*#]/g, '[a-z]')}$`)
      return CORE_PROFANITY.some((word) => pattern.test(word))
    })

const containsProfanity = (text) => {
  if (!text || typeof text !== 'string') return false
  const cleanedZh = stripWhitelist(text)
  return (
    latinFilter.checkProfanity(deobfuscate(text)).containsProfanity ||
    latinFilter.checkProfanity(text).containsProfanity ||
    containsMaskedProfanity(text) ||
    chineseFilter.checkProfanity(cleanedZh).containsProfanity ||
    AMBIGUOUS_ZH.some((char) => cleanedZh.includes(char))
  )
}

export { containsProfanity }
