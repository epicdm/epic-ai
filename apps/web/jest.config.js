module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    'driver.js': '<rootDir>/src/__mocks__/driver.js.ts',
    'canvas-confetti': '<rootDir>/src/__mocks__/canvas-confetti.ts',
    'cmdk': '<rootDir>/src/__mocks__/cmdk.ts'
  }
};
