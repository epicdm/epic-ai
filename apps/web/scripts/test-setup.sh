#!/bin/bash
# Stop any running dev servers
pkill -f "next dev"

# Install test dependencies if needed
if [ ! -d "node_modules/driver.js" ]; then
  echo "Installing test dependencies..."
  npm install driver.js @types/driver.js canvas-confetti @types/canvas-confetti cmdk --save
fi

# Run tests
echo "Starting integration tests..."
npm run test:e2e global-ux.spec.ts
