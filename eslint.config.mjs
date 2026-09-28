import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    files: ['**/*.mjs', '**/*.js'],
    languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: { console: 'readonly', process: 'readonly', Buffer: 'readonly', URL: 'readonly', fetch: 'readonly', setTimeout: 'readonly', document: 'readonly', window: 'readonly', getComputedStyle: 'readonly', CSS: 'readonly', Event: 'readonly', localStorage: 'readonly', sessionStorage: 'readonly' } },
    rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }] }
  },
  { ignores: ['node_modules/', 'bench/results/generations/', 'playwright-report/', 'test-results/'] }
];
