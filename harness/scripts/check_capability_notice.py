#!/usr/bin/env python3
"""Verify recoverable browser capability notices and upload disabling."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
NODE_HELPER = REPO_ROOT / "harness" / "scripts" / "parse_with_index.mjs"


def run_status(status: dict) -> dict:
    result = subprocess.run(
        ["node", str(NODE_HELPER)],
        input=json.dumps({"mode": "capabilityNotice", "status": status}),
        text=True,
        capture_output=True,
        cwd=REPO_ROOT,
        check=False,
    )

    if result.returncode != 0:
        raise AssertionError(result.stderr.strip() or result.stdout.strip())

    return json.loads(result.stdout)


def main() -> int:
    failures: list[str] = []

    full = run_status({"file": True, "blob": True, "indexedDB": True, "objectURL": True})
    if full["snapshot"]["warningActive"]:
        failures.append("full support: warning should be hidden")
    if full["snapshot"]["zipInputDisabled"] or full["snapshot"]["folderInputDisabled"]:
        failures.append("full support: upload controls should stay enabled")

    no_cache = run_status({"file": True, "blob": True, "indexedDB": False, "objectURL": True})
    if not no_cache["snapshot"]["warningActive"]:
        failures.append("missing IndexedDB: warning should be visible")
    if "캐시 없이 동작" not in no_cache["snapshot"]["warningText"]:
        failures.append("missing IndexedDB: warning should explain cache fallback")
    if no_cache["snapshot"]["zipInputDisabled"] or no_cache["snapshot"]["folderInputDisabled"]:
        failures.append("missing IndexedDB: upload controls should stay enabled")

    critical = run_status({"file": False, "blob": False, "indexedDB": True, "objectURL": False})
    if not critical["result"]["critical"]:
        failures.append("missing File/Blob/ObjectURL: result should be critical")
    if not critical["snapshot"]["warningActive"]:
        failures.append("missing File/Blob/ObjectURL: warning should be visible")
    if not critical["snapshot"]["zipInputDisabled"] or not critical["snapshot"]["folderInputDisabled"]:
        failures.append("missing File/Blob/ObjectURL: upload controls should be disabled")

    if failures:
        print("FAIL capability notice")
        for failure in failures:
            print(f"  {failure}")
        return 1

    print("PASS capability notice")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
