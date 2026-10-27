import tseslint from 'typescript-eslint'
export default [
  { ignores: ['node_modules/**','dist/**','src-tauri/**','test-results/**','playwright-report/**'] },
  { files: ['src/**/*.{ts,tsx}'], languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } }, rules: { 'no-debugger': 'error', 'no-duplicate-case': 'error', 'no-dupe-keys': 'error', 'no-unreachable': 'error', 'valid-typeof': 'error' } }
]
