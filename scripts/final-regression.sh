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

function cleanup {
  echo "Killing servers..."
  kill -9 $API_PID 2>/dev/null || true
  kill -9 $WEB_PID 2>/dev/null || true
  wait $API_PID 2>/dev/null || true
  wait $WEB_PID 2>/dev/null || true
}
trap cleanup EXIT

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

echo "ALL TESTS PASSED!"
