module.exports = {
    collectCoverage: true,
    coverageThreshold: {
        global: {
            branches: 89,
            functions: 92,
            lines: 95,
            statements: 94,
        },
    },
    coveragePathIgnorePatterns: ['<rootDir>/src/config.ts', '<rootDir>/__tests__/test-tmp-files'],
};
