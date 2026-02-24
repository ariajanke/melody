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
      ],
      // NOTE specifying a return type is not always desired or appropriate,
      //      but they are sometimes, consider a "bypass" for those instances??
      // '@typescript-eslint/explicit-function-return-type': 'error'
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
];