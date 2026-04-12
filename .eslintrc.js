module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    {
      files: ['e2e/**/*.js'],
      env: {
        jest: true,
        'jest/globals': true,
      },
      globals: {
        jasmine: 'readonly',
      },
    },
  ],
};
