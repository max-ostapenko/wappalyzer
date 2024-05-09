module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
  },
  parser: '@babel/eslint-parser',
  parserOptions: {
    requireConfigFile: false,
  },
  extends: [
    '@nuxtjs',
    'prettier',
    'plugin:prettier/recommended',
    'plugin:nuxt/recommended',
    'plugin:json/recommended',
  ],
  plugins: ['prettier'],
  rules: {
    'array-callback-return': 'off',
  },
}
