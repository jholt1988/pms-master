module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json'],
  testMatch: ['**/*.spec.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  rootDir: '.',
  testTimeout: 30000,
  collectCoverageFrom: [
    '../src/**/*.ts',
    '!../src/**/*.spec.ts',
  ],
};
