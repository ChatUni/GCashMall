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

export const languageIcons: Record<Language, string> = {
  en: '🇺🇸',
  zh: '🇨🇳',
}

export const supportedLanguages: Language[] = ['en', 'zh']