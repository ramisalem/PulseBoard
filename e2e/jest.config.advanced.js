module.exports = {
  testEnvironment: './CustomDetoxEnvironment.js',
  testTimeout: 120000,
  setupFilesAfterEnv: ['./init.js'],
  verbose: true,
  reporters: ['detox/runners/jest/streamlineReporter'],
  testMatch: ['**/*.test.ts', '**/*.test.js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
};
