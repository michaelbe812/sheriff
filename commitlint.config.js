module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'never',
      ['core', 'eslint-plugin', 'docs', 'test-projects'],
    ],
  },
};
