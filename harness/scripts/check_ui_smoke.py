#!/usr/bin/env python3
"""Run a deterministic UI smoke against index.html in the Node VM harness."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
NODE_HELPER = REPO_ROOT / "harness" / "scripts" / "parse_with_index.mjs"
FIXTURE = REPO_ROOT / "test" / "fixtures" / "windows-minimal" / "KakaoTalk_20260301_2110_00_123_windows.txt"


def fail_if(condition: bool, failures: list[str], message: str) -> None:
    if condition:
        failures.append(message)


def main() -> int:
    fixture_text = FIXTURE.read_text(encoding="utf-8-sig")
    result = subprocess.run(
        ["node", str(NODE_HELPER)],
        input=json.dumps(
            {
                "mode": "uiSmoke",
                "platform": "windows",
                "content": fixture_text,
                "selectDate": "2026-03-01",
                "searchQuery": "링크",
            },
            ensure_ascii=False,
        ),
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

    fail_if(payload["parseResult"]["messageCount"] != 8, failures, "fixture upload/parse did not produce 8 messages")
    fail_if(payload["afterInit"]["dateListCount"] != 2, failures, "date list did not render both dates")
    fail_if(payload["afterInit"]["calendarCellCount"] < 35, failures, "calendar grid did not render")
    fail_if(payload["afterSelect"]["selectedDate"] != "2026-03-01", failures, "selected date was not applied")
    fail_if(payload["afterSelect"]["chatMessageCount"] != 5, failures, "chat view did not render selected date messages")
    fail_if("3월 1일" not in payload["afterSelect"]["chatTitle"], failures, "chat title did not reflect selected date")
    fail_if(payload["afterSearch"]["dateListCount"] != 1, failures, "search did not filter date list")
    fail_if(not payload["afterLeaderFilter"]["leaderFilterActive"], failures, "leader filter did not activate")
    fail_if(payload["afterLeaderFilter"]["leaderFilterTarget"] != "테스터", failures, "custom leader filter target was not applied")
    fail_if(payload["afterLeaderFilter"]["leaderMessageCount"] != 4, failures, "custom leader filter target did not mark matching messages")
    fail_if(payload["afterLeaderFilter"]["hiddenChatMessageCount"] != 1, failures, "custom leader filter did not hide non-matching messages")
    fail_if(payload["afterSettings"]["theme"] != "dark", failures, "theme setting did not apply")
    fail_if(payload["afterSettings"]["font"] != "ridi", failures, "font setting did not apply")
    fail_if(not payload["afterSettingsModal"]["settingsModalOpen"], failures, "settings modal did not open")
    fail_if(not payload["afterSidebarOpen"]["sidebarOpen"], failures, "sidebar did not open")
    fail_if(payload["afterSidebarClose"]["sidebarOpen"], failures, "sidebar did not close")
    fail_if(not payload["afterMobileSidebarOpen"]["sidebarOpen"], failures, "mobile left sidebar did not open")
    fail_if(payload["afterMobileSidebarOpen"]["linkSidebarOpen"], failures, "mobile right sidebar was open while left opened")
    fail_if(not payload["afterMobileLinkSidebarOpen"]["linkSidebarOpen"], failures, "mobile right sidebar did not open")
    fail_if(payload["afterMobileLinkSidebarOpen"]["sidebarOpen"], failures, "mobile left sidebar stayed open while right opened")
    fail_if(not payload["afterMobileSidebarReopen"]["sidebarOpen"], failures, "mobile left sidebar did not reopen")
    fail_if(payload["afterMobileSidebarReopen"]["linkSidebarOpen"], failures, "mobile right sidebar stayed open while left reopened")
    fail_if(payload["afterMobilePanelsClose"]["sidebarOpen"], failures, "mobile left sidebar did not close with shared close")
    fail_if(payload["afterMobilePanelsClose"]["linkSidebarOpen"], failures, "mobile right sidebar did not close with shared close")
    fail_if(payload["afterMobilePanelsClose"]["sidebarOverlayActive"], failures, "mobile overlay stayed active after panels closed")

    if failures:
        print("FAIL UI smoke")
        for failure in failures:
            print(f"  {failure}")
        return 1

    print("PASS UI smoke")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
