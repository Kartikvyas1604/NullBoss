module.exports = {
  root: true,
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  env: {
    node: true,
    es2022: true
  },
  rules: {
    'no-unused-vars': 'warn',
    'no-console': 'off'
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
      extends: ['eslint:recommended'],
      rules: {
        'no-unused-vars': 'off'
      }
    }
  ]
}
