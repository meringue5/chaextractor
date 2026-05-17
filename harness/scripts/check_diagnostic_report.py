#!/usr/bin/env python3
"""Verify privacy-preserving diagnostic report generation."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
NODE_HELPER = REPO_ROOT / "harness" / "scripts" / "parse_with_index.mjs"


def fail_if(condition: bool, failures: list[str], message: str) -> None:
    if condition:
        failures.append(message)


def main() -> int:
    result = subprocess.run(
        ["node", str(NODE_HELPER)],
        input=json.dumps({"mode": "diagnosticReport"}),
        text=True,
        capture_output=True,
        cwd=REPO_ROOT,
        check=False,
    )

    if result.returncode != 0:
        print(result.stderr.strip() or result.stdout.strip(), file=sys.stderr)
        return 1

    payload = json.loads(result.stdout)
    report = payload["reportText"]
    issue_url = payload["issueUrl"]
    failures: list[str] = []

    fail_if(payload["eventCount"] != 1, failures, "diagnostic event was not captured")
    fail_if(not payload["toastVisible"], failures, "diagnostic toast was not shown")
    fail_if(not payload["reportModalOpen"], failures, "diagnostic report modal did not open")
    fail_if("synthetic diagnostic failure" not in report, failures, "error message missing from report")
    fail_if("private-chat-name.txt" in report, failures, "raw chat filename leaked into report")
    fail_if("20260517_120000.jpeg" in report, failures, "raw attachment filename leaked into report")
    fail_if("private-chat-name" in issue_url, failures, "raw chat filename leaked into issue URL")
    fail_if("20260517_120000" in issue_url, failures, "raw attachment filename leaked into issue URL")
    fail_if("txt:1" not in report or "jpeg:1" not in report, failures, "extension-only input summary missing")
    fail_if("template=bug_report.yml" not in issue_url, failures, "issue URL does not select bug report template")
    fail_if("diagnostic_report=" not in issue_url, failures, "issue URL does not prefill diagnostic field")

    if failures:
        print("FAIL diagnostic report")
        for failure in failures:
            print(f"  {failure}")
        return 1

    print("PASS diagnostic report")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
