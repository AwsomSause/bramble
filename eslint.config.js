import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'public/catalog', 'public/games', 'node_modules', 'test-results', 'playwright-report', '.superpowers'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      'no-restricted-syntax': [
        'error',
        { selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']", message: 'Not allowed in Bramble.' },
      ],
    },
  },
  {
    files: ['scripts/**/*.{ts,mjs}', 'tests/**/*.ts', '*.config.{ts,js}'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['games/**/*.js', 'public/**/*.js'],
    languageOptions: { globals: { ...globals.browser }, sourceType: 'script' },
  },
);
