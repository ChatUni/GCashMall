import { Show, For } from 'solid-js'
import { t } from '../../stores/languageStore'
import { languageStore, languageStoreActions } from '../../stores/languageStore'
import {
  languageIcons,
  supportedLanguages,
  type Language,
} from '../../i18n'
import { topBarStore, topBarStoreActions } from '../../stores/topBarStore'

const LanguageSwitch = () => {
  const handleClick = () => {
    topBarStoreActions.toggleLanguageDropdown()
  }

  const handleSelect = (lang: Language) => {
    languageStoreActions.setLanguage(lang)
    topBarStoreActions.setShowLanguageDropdown(false)
  }

  return (
    <div class="language-switch" onClick={handleClick}>
      <span class="language-icon">
        {languageIcons[languageStore.language]}
      </span>
      <Show when={topBarStore.showLanguageDropdown}>
        <div class="language-dropdown">
          <For each={supportedLanguages}>
            {(lang) => (
              <div
                class="language-option"
                onClick={(e) => {
                  e.stopPropagation()
                  handleSelect(lang)
                }}
              >
                <span class="language-option-icon">
                  {languageIcons[lang]}
                </span>
                <span class="language-option-name">
                  {t().languages[lang]}
                </span>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}

export default LanguageSwitch
