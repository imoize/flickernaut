import antfu from '@antfu/eslint-config';
import jsdoc from 'eslint-plugin-jsdoc';

export default antfu({
    type: 'lib',
    typescript: true,
    stylistic: {
        indent: 4,
        semi: true,
        quotes: 'single',

    },
    formatters: {
        css: true,
    },
    ignores: [
        'build/**/*',
        'node_modules/**',
    ],
    plugins: {
        jsdoc,
    },
    rules: {
        '@typescript-eslint/no-unused-vars': [
            'error',
            {
                args: 'all',
                argsIgnorePattern: '^_',
                caughtErrors: 'all',
                caughtErrorsIgnorePattern: '^_',
                destructuredArrayIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                ignoreRestSiblings: true,
            },
        ],
        '@typescript-eslint/explicit-function-return-type': 'off',
        'no-console': 'off',
        'yml/indent': ['error', 2, { indentBlockSequences: true }],
    },
});
