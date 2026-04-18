#!/bin/bash
# Prevents developer agent from completing if there's uncommitted code
set -e

cd /Users/spring/ai-note

UNCOMMITTED=$(git status --porcelain)
if [ -n "$UNCOMMITTED" ]; then
  echo "ERROR: Uncommitted changes detected. Commit all code before completing."
  echo "$UNCOMMITTED"
  exit 1
fi

echo "Developer stop-check passed."
