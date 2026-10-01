import { en } from './en'
import { zh } from './zh'

export type Language = 'en' | 'zh'

export const resources = {
  en,
  zh,
}

export type Resources = typeof en

export const getResource = (lang: Language): Resources => {
  return resources[lang]
}

// Short text labels, not flag emoji.
//
// Flags are a pair of regional-indicator codepoints that depend on a platform emoji font, and
// where that font is unavailable to the webview each half renders as its own missing-glyph box
// — two tofu squares where the switcher should be. Text also avoids equating a language with a
// country, which flags do badly (English is not only the US).
export const languageIcons: Record<Language, string> = {
  en: 'EN',
  zh: '中文',
}

export const supportedLanguages: Language[] = ['en', 'zh']