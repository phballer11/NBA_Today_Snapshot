#!/usr/bin/env bash
# Bounded retries; collectors retain accepted saved data across failed attempts.
set -u
case "${1:-}" in
  snapshot|highlights) collector="$1" ;;
  *) echo "Expected snapshot or highlights" >&2; exit 2 ;;
esac
for attempt in 1 2 3; do
  if node "scripts/${collector}.mjs"; then exit 0; else result=$?; fi
  if [ "$attempt" -lt 3 ]; then
    echo "::warning::${collector} collection attempt ${attempt} failed; retrying."
    sleep "$((attempt * 10))"
  fi
done
exit "$result"
