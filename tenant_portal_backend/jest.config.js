const common = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    'ts-jest': {
      diagnostics: false,
    },
  },
  roots: ['<rootDir>/src', '<rootDir>/test'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  transformIgnorePatterns: ['node_modules/(?!(@faker-js)/)'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testTimeout: 10000,
};

module.exports = {
  projects: [
    {
      ...common,
      displayName: 'unit',
      testMatch: ['**/?(*.)+(spec|test).ts'],
      testPathIgnorePatterns: ['/node_modules/', '\\.e2e\\.spec\\.ts$', '\\.e2e-spec\\.ts$', 'esignature\\.service\\.spec\\.ts$'],
      collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/*.interface.ts',
        '!src/main.ts',
        '!src/**/*.module.ts',
      ],
      coverageDirectory: '<rootDir>/coverage/unit',
      coverageThreshold: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        './src/auth/': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
        './src/payments/': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
      },
    },
    {
      ...common,
      displayName: 'integration',
      testMatch: ['**/*.integration.spec.ts'],
      coverageDirectory: '<rootDir>/coverage/integration',
    },
  ],
};
