/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@epic-ai/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@epic-ai/database$': '<rootDir>/../../packages/database/src/index.ts',
    '^@epic-ai/workers/processors$': '<rootDir>/../../apps/workers/src/processors/index.ts',
    '^@epic-ai/workers/processors/agent-os$': '<rootDir>/../../apps/workers/src/processors/agent-os/index.ts',
    '^@epic-ai/workers/types$': '<rootDir>/../../apps/workers/src/types/index.ts',
    'driver.js': '<rootDir>/src/__mocks__/driver.js.ts',
    'canvas-confetti': '<rootDir>/src/__mocks__/canvas-confetti.ts',
    'cmdk': '<rootDir>/src/__mocks__/cmdk.ts'
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@epic-ai)/)'
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
