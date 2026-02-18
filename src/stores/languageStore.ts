import { createStore } from 'solid-js/store'
import { createMemo } from 'solid-js'
import { getResource, type Language, type Resources } from '../i18n'

interface LanguageState {
  language: Language
}

const [languageState, setLanguageState] = createStore<LanguageState>({
  language: 'en',
})

export const languageStore = languageState

export const t = createMemo((): Resources => getResource(languageState.language))

export const languageStoreActions = {
  setLanguage: (lang: Language) => setLanguageState({ language: lang }),
}
