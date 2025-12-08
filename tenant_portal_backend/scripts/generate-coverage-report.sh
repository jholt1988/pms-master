#!/bin/bash

# P0-004: Generate Coverage Reports
# Generates both unit test and E2E test coverage reports

echo "🧪 Generating Test Coverage Reports..."

# Unit test coverage
echo "📊 Running unit tests with coverage..."
npm run test:coverage

# E2E test coverage
echo "📊 Running E2E tests with coverage..."
npm run test:e2e:coverage

# Combine reports (if using lcov-merge or similar tool)
echo "📈 Coverage reports generated:"
echo "  - Unit tests: coverage/index.html"
echo "  - E2E tests: coverage/e2e/index.html"

# Open reports (optional)
if command -v open &> /dev/null; then
    open coverage/index.html
elif command -v xdg-open &> /dev/null; then
    xdg-open coverage/index.html
fi

