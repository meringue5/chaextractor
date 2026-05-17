#!/usr/bin/env python3
"""Verify that all app modals close through the shared Escape handler."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
NODE_HELPER = REPO_ROOT / "harness" / "scripts" / "parse_with_index.mjs"


def main() -> int:
    result = subprocess.run(
        ["node", str(NODE_HELPER)],
        input=json.dumps({"mode": "modalEscape"}),
        text=True,
        capture_output=True,
        cwd=REPO_ROOT,
        check=False,
    )

    if result.returncode != 0:
        print(result.stderr.strip() or result.stdout.strip(), file=sys.stderr)
        return 1

    payload = json.loads(result.stdout)
    failures = []
    for item in payload["results"]:
        if not item["before"]:
            failures.append(f"{item['modalId']}: did not open before Escape")
        if item["after"]:
            failures.append(f"{item['modalId']}: remained open after Escape")
        if not item["prevented"]:
            failures.append(f"{item['modalId']}: Escape did not prevent default")

    if failures:
        print("FAIL modal escape")
        for failure in failures:
            print(f"  {failure}")
        return 1

    print("PASS modal escape")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
