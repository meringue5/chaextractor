#!/usr/bin/env python3
"""Run a synthetic parser performance smoke through the index.html parser."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
NODE_HELPER = REPO_ROOT / "harness" / "scripts" / "parse_with_index.mjs"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--messages", type=int, default=10_000, help="synthetic message count")
    parser.add_argument("--budget-ms", type=float, default=3_000, help="maximum parser time in ms")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    result = subprocess.run(
        ["node", str(NODE_HELPER)],
        input=json.dumps({"mode": "performanceSmoke", "messageCount": args.messages}),
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

    if payload["messageCount"] != args.messages:
        failures.append(f"expected {args.messages} messages, got {payload['messageCount']}")
    if payload["dateCount"] != 10:
        failures.append(f"expected 10 dates, got {payload['dateCount']}")
    if payload["elapsedMs"] > args.budget_ms:
        failures.append(
            f"parser took {payload['elapsedMs']:.1f}ms, budget {args.budget_ms:.1f}ms"
        )

    if failures:
        print("FAIL performance smoke")
        for failure in failures:
            print(f"  {failure}")
        return 1

    print(
        f"PASS performance smoke "
        f"({payload['messageCount']} messages, {payload['elapsedMs']:.1f}ms)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
