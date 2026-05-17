#!/usr/bin/env python3
"""Verify cached chat snapshots restore dates in descending order."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
NODE_HELPER = REPO_ROOT / "harness" / "scripts" / "parse_with_index.mjs"
EXPECTED_DATES = ["2026-01-03", "2026-01-02", "2026-01-01"]


def run_case(name: str, cached_data: dict) -> tuple[str, list[str]]:
    result = subprocess.run(
        ["node", str(NODE_HELPER)],
        input=json.dumps({"mode": "cacheDateSort", "cachedData": cached_data}),
        text=True,
        capture_output=True,
        cwd=REPO_ROOT,
        check=False,
    )

    if result.returncode != 0:
        raise AssertionError(result.stderr.strip() or result.stdout.strip())

    payload = json.loads(result.stdout)
    return name, payload["dates"]


def main() -> int:
    cases = [
        (
            "cached ascending dates",
            {
                "messages": [],
                "messagesByDate": {
                    "2026-01-01": [],
                    "2026-01-02": [],
                    "2026-01-03": [],
                },
                "leaderCountByDate": {},
                "dates": ["2026-01-01", "2026-01-02", "2026-01-03"],
            },
        ),
        (
            "cached descending dates",
            {
                "messages": [],
                "messagesByDate": {
                    "2026-01-01": [],
                    "2026-01-02": [],
                    "2026-01-03": [],
                },
                "leaderCountByDate": {},
                "dates": ["2026-01-03", "2026-01-02", "2026-01-01"],
            },
        ),
        (
            "fallback messagesByDate keys",
            {
                "messages": [],
                "messagesByDate": {
                    "2026-01-01": [],
                    "2026-01-02": [],
                    "2026-01-03": [],
                },
                "leaderCountByDate": {},
            },
        ),
    ]

    failures = []
    for name, cached_data in cases:
        case_name, actual_dates = run_case(name, cached_data)
        if actual_dates != EXPECTED_DATES:
            failures.append(f"{case_name}: expected {EXPECTED_DATES}, got {actual_dates}")

    if failures:
        print("FAIL cache date sort")
        for failure in failures:
            print(f"  {failure}")
        return 1

    print("PASS cache date sort")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
