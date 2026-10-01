import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // No emoji in source. They depend on a platform emoji font that is not always available
      // to the webview — on the iOS Simulator every emoji renders as a missing-glyph box, and
      // a flag (two regional indicators) renders as two. Use <Icon name="..."> instead; add a
      // shape to src/components/Icon.tsx if the one you need is missing.
      //
      // U+2713-2718 (the check and ballot marks) are deliberately NOT covered: they have
      // text presentation, come from ordinary text fonts, and are not emoji.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "Literal[value=/[\\u{1F000}-\\u{1FAFF}\\u{1F1E6}-\\u{1F1FF}\\u{2600}-\\u{2712}\\u{2719}-\\u{27BF}\\u{FE0F}]/u]",
          message:
            'No emoji in source — they render as missing-glyph boxes where the platform emoji font is unavailable. Use <Icon name="..."> (src/components/Icon.tsx).',
        },
        {
          selector:
            "JSXText[value=/[\\u{1F000}-\\u{1FAFF}\\u{1F1E6}-\\u{1F1FF}\\u{2600}-\\u{2712}\\u{2719}-\\u{27BF}\\u{FE0F}]/u]",
          message:
            'No emoji in markup — use <Icon name="..."> (src/components/Icon.tsx).',
        },
        {
          selector:
            "TemplateElement[value.raw=/[\\u{1F000}-\\u{1FAFF}\\u{1F1E6}-\\u{1F1FF}\\u{2600}-\\u{2712}\\u{2719}-\\u{27BF}\\u{FE0F}]/u]",
          message:
            'No emoji in template strings — use <Icon name="..."> (src/components/Icon.tsx).',
        },
      ],
    },
  },
])
