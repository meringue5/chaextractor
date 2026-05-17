#!/usr/bin/env python3
"""Verify cache deletion plumbing and Blob URL cleanup."""

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
        input=json.dumps({"mode": "cachePrivacy"}),
        text=True,
        capture_output=True,
        cwd=REPO_ROOT,
        check=False,
    )

    if result.returncode != 0:
        print(result.stderr.strip() or result.stdout.strip(), file=sys.stderr)
        return 1

    payload = json.loads(result.stdout)
    failures: list[str] = []

    if payload["beforeCleanup"]["attachmentFileCount"] != 3:
        failures.append("runtime setup did not create three attachment entries")
    if payload["revokedCount"] != 2:
        failures.append(f"expected 2 Blob URLs revoked, got {payload['revokedCount']}")
    if payload["revokedObjectUrls"] != ["blob:test-image", "blob:test-file"]:
        failures.append(f"unexpected revoked URLs: {payload['revokedObjectUrls']}")
    if payload["afterCleanup"]["attachmentFileCount"] != 0:
        failures.append("runtime attachment files were not cleared")
    if payload["afterCleanup"]["attachmentEntriesCount"] != 0:
        failures.append("runtime attachment entries were not cleared")
    if not payload["clearCacheResult"]["ok"]:
        failures.append(f"cache clear failed: {payload['clearCacheResult']}")

    if failures:
        print("FAIL cache privacy")
        for failure in failures:
            print(f"  {failure}")
        return 1

    print("PASS cache privacy")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
