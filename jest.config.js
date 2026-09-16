/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  roots: [
    '<rootDir>/src',
    '<rootDir>/tests'
  ],

  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  modulePathIgnorePatterns: [
    '<rootDir>/runtime/',
    '<rootDir>/_.*'
  ],

  testPathIgnorePatterns: [
    '/node_modules/',
    '/runtime/',
    '/_.*'
  ],

  watchPathIgnorePatterns: [
    '/_.*'
  ],

  coverageDirectory: 'coverage',

  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts'
  ]
};
