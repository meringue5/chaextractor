#!/usr/bin/env sh
set -eu

PORT="${1:-8000}"
HOST="${HOST:-127.0.0.1}"
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"

cd "$ROOT"

echo "Serving $ROOT"
echo "Open http://$HOST:$PORT/"

if command -v python3 >/dev/null 2>&1; then
  exec python3 -m http.server "$PORT" --bind "$HOST"
fi

if command -v python >/dev/null 2>&1; then
  exec python -m http.server "$PORT" --bind "$HOST"
fi

echo "Python 3 is required. Install Python or run from an environment that provides python3." >&2
exit 1
