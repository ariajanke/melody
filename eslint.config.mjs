import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import stylistic from '@stylistic/eslint-plugin';
import stylistic_js from '@stylistic/eslint-plugin-js';

export default [
  {
    languageOptions: { globals: globals.browser },
    plugins: {
      '@stylistic': stylistic,
      '@stylistic/js': stylistic_js
    },
    rules: {
      '@stylistic/js/semi': ['error', 'always'],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_[0-9]+'
        }
      ]
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
];