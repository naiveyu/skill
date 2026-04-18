#!/bin/bash
# Blocks destructive commands during release process

COMMAND="$1"

BLOCKED_PATTERNS=(
  "rm -rf"
  "git push --force"
  "git push -f"
  "git reset --hard"
  "git clean -f"
  "DROP TABLE"
  "DELETE FROM"
)

for pattern in "${BLOCKED_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qi "$pattern"; then
    echo "BLOCKED: Command contains dangerous pattern '$pattern'"
    exit 1
  fi
done

echo "Command approved."
