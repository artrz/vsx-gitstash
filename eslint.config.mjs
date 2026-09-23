import eslint from '@eslint/js'
import globals from 'globals'
import stylistic from '@stylistic/eslint-plugin'
import tseslint from 'typescript-eslint'

const style = stylistic.configs.customize({
    arrowParens: true,
    blockSpacing: true,
    braceStyle: 'stroustrup',
    commaDangle: 'always-multiline',
    indent: 4,
    jsx: false,
    quoteProps: 'consistent-as-needed',
})

export default [
    {
        ignores: [
            'out',
            'dist',
            '**/*.d.ts',
            '*vscode-test.mjs',
        ],
    },
    eslint.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
    {
        languageOptions: {
            parserOptions: {
                ecmaVersion: 6,
                project: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        plugins: {
            '@stylistic': stylistic,
        },
        rules: {
            'curly': 'error',
            'eqeqeq': 'error',
            ...style.rules,
            '@typescript-eslint/prefer-string-starts-ends-with': ['warn'],
            '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
            '@stylistic/max-statements-per-line': ['error', { max: 2 }], // mainly for arrow funcs not returning a value
            '@stylistic/indent': ['error', 4, { ignoredNodes: ['ConditionalExpression'], SwitchCase: 1 }],
            '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
            '@stylistic/wrap-iife': ['error', 'inside', { functionPrototypeMethods: true }],
        },
    },
    {
        files: ['esbuild.js'],
        languageOptions: {
            // provides require, console, process: NodeJS.Process
            globals: { ...globals.node },
        },
        rules: {
            '@typescript-eslint/no-require-imports': 'off',
        },
    },
]
