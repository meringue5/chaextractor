#!/usr/bin/env python3
"""Verify useful diagnostic report generation."""

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
    report_url = payload["issueUrl"]
    diagnostic_filename = payload["diagnosticFilename"]
    failures: list[str] = []

    fail_if(payload["eventCount"] != 1, failures, "diagnostic event was not captured")
    fail_if(payload["toastVisible"], failures, "diagnostic toast should not be shown")
    fail_if(not payload["reportModalOpen"], failures, "diagnostic report modal did not open")
    fail_if("synthetic diagnostic failure" not in report, failures, "error message missing from report")
    fail_if("private-chat-name.txt" not in report, failures, "chat filename missing from report")
    fail_if("20260517_120000.jpeg" not in report, failures, "attachment filename missing from report")
    fail_if("private-chat-name" not in report_url, failures, "chat filename missing from prefilled report URL")
    fail_if("20260517_120000" not in report_url, failures, "attachment filename missing from prefilled report URL")
    fail_if("txt:1" not in report or "jpeg:1" not in report, failures, "extension-only input summary missing")
    fail_if("## 대화 파일 검증" not in report, failures, "chat validation section missing")
    fail_if("지원하는 날짜/메시지 패턴" not in report, failures, "chat validation sample lines missing")
    fail_if("20줄 미만" not in report, failures, "chat validation failure reason missing")
    fail_if("docs.google.com/forms/d/e/1FAIpQLSeLjAqqVMEjSz2tbCs7tUpzRwDRnK41LAxDwuIyylU6XTnIlA/viewform" not in report_url, failures, "report URL does not open Google Form")
    fail_if("entry.315233821=" not in report_url, failures, "report URL does not prefill report type")
    fail_if("entry.1161180918=" not in report_url, failures, "report URL does not prefill diagnostic content")
    fail_if(len(report_url) > 6500, failures, "prefilled Google Form URL is too long")
    fail_if("TXT" not in report_url, failures, "prefilled report URL should ask for diagnostic TXT attachment")
    fail_if(not diagnostic_filename.startswith("chaextractor-diagnostic-") or not diagnostic_filename.endswith(".txt"), failures, "diagnostic TXT filename is invalid")

    if failures:
        print("FAIL diagnostic report")
        for failure in failures:
            print(f"  {failure}")
        return 1

    print("PASS diagnostic report")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
