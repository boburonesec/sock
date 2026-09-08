#!/bin/bash
set -e

echo "Building..."
pnpm build

echo "Starting API..."
pnpm api:start &
API_PID=$!

echo "Starting Web..."
pnpm start &
WEB_PID=$!

sleep 8

echo "Running UI Routes test..."
node scripts/ui-route-case-test.mjs

echo "Running Responsive/Mobile regression test..."
node scripts/mobile-e2e-suite.mjs

echo "Running form UX lifecycle test..."
node scripts/form-ux-lifecycle-test.mjs

echo "Running API/RBAC Acceptance..."
node scripts/business-api-rbac-acceptance.mjs

echo "Running Mobile UI Acceptance..."
node scripts/mobile-ui-acceptance.mjs

echo "Killing servers..."
kill $API_PID
kill $WEB_PID
wait $API_PID || true
wait $WEB_PID || true

echo "ALL TESTS PASSED!"
