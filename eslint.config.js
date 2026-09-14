import { createConfigForNuxt } from '@nuxt/eslint-config'

export default createConfigForNuxt({
  features: {
    typescript: true,
    tooling: true,
    stylistic: {
      semi: false,
      quotes: 'single',
    },
  },
}).append(
  {
    ignores: [
      'node_modules/',
      '.nuxt/',
      '.output/',
      'dist/',
      '.env*',
      '.eslintcache',
      '.DS_Store',
    ],
  },
  {
    files: ['**/*.vue'],
    rules: {
      // Vue-specific rules
      'vue/max-attributes-per-line': ['error', { singleline: 3, multiline: 1 }],
      'vue/html-self-closing': ['error', {
        html: { void: 'always', normal: 'always', component: 'always' },
        svg: 'always',
        math: 'always',
      }],
      'vue/component-name-in-template-casing': ['error', 'PascalCase', {
        registeredComponentsOnly: false,
      }],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // TypeScript-specific rules
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    files: ['pages/**/*.vue'],
    rules: {
      // Nuxt file-based routes use single-segment names (index, [slug], dashboard)
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    files: ['tests/**/*', '**/*.test.ts', '**/*.spec.ts'],
    rules: {
      // Test files can be more lenient
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
)
