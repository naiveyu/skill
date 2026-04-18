#!/bin/bash
# Prevents tester agent from completing if no tests exist for new code
set -e

cd /Users/spring/ai-note

# Get list of new/modified source files (non-test)
CHANGED_SRC=$(git diff --name-only HEAD~1 HEAD -- '*.ts' '*.tsx' 2>/dev/null | grep -v '__tests__' | grep -v '.test.' || true)

if [ -n "$CHANGED_SRC" ]; then
  # Check that at least one test file was also changed/added
  CHANGED_TESTS=$(git diff --name-only HEAD~1 HEAD -- '*.test.ts' '*.test.tsx' 2>/dev/null || true)
  if [ -z "$CHANGED_TESTS" ]; then
    echo "WARNING: Source files changed but no test files added/modified."
    echo "Changed source files:"
    echo "$CHANGED_SRC"
  fi
fi

# Verify tests pass
pnpm test 2>&1 || {
  echo "ERROR: Tests are failing. Fix tests before completing."
  exit 1
}

echo "Tester stop-check passed."
