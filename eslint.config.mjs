import withNuxt from './.nuxt/eslint.config.mjs'
import eslintConfigPrettier from 'eslint-config-prettier'

export default withNuxt(
  {
    ignores: ['.output/**', 'node_modules/**', 'design_handoff_mobile_redesign/**']
  },
  {
    rules: {
      'no-console': ['warn', { allow: ['warn'] }],
      'no-unused-vars': ['error', { args: 'none', ignoreRestSiblings: true }],
      'vue/multi-word-component-names': 'off',
      'vue/html-self-closing': 'off'
    }
  },
  eslintConfigPrettier
)
