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
    fail_if(payload["afterInit"]["theme"] != "light", failures, "default theme was not light")
    fail_if(payload["afterInit"]["font"] != "ridi", failures, "default theme did not use RIDI font")
    fail_if(payload["afterInit"]["storedTheme"] != "light", failures, "default theme was not persisted as light")
    fail_if(payload["afterInit"]["dateListCount"] != 2, failures, "date list did not render both dates")
    fail_if(payload["afterInit"]["calendarCellCount"] < 35, failures, "calendar grid did not render")
    fail_if(payload["afterInit"]["selectedDate"] is not None, failures, "date was selected during app init")
    fail_if(payload["afterInit"]["renderedChatDate"] is not None, failures, "chat date was rendered during app init")
    fail_if(not payload["afterInit"]["captureButtonDisabled"], failures, "capture button was enabled before date selection")
    fail_if(payload["afterInit"]["captureReady"], failures, "capture was ready before date selection")
    fail_if(payload["beforeSelectCaptureAttempt"]["ok"], failures, "capture modal opened before date selection")
    fail_if(payload["beforeSelectCaptureAttempt"]["reason"] != "date-not-selected", failures, "capture guard did not report missing date")
    fail_if(payload["afterCaptureBeforeSelect"]["captureModalOpen"], failures, "capture modal stayed open before date selection")
    fail_if(payload["afterSelect"]["selectedDate"] != "2026-03-01", failures, "selected date was not applied")
    fail_if(payload["afterSelect"]["renderedChatDate"] != "2026-03-01", failures, "selected date chat was not marked rendered")
    fail_if(payload["afterSelect"]["chatMessageCount"] != 5, failures, "chat view did not render selected date messages")
    fail_if("3월 1일" not in payload["afterSelect"]["chatTitle"], failures, "chat title did not reflect selected date")
    fail_if(payload["afterSelect"]["captureButtonDisabled"], failures, "capture button stayed disabled after selected chat rendered")
    fail_if(not payload["afterSelect"]["captureReady"], failures, "capture was not ready after selected chat rendered")
    fail_if(not payload["afterCaptureModal"]["captureModalOpen"], failures, "capture modal did not open")
    fail_if(payload["afterCaptureModal"]["scope"] != "current", failures, "capture modal did not default to current date")
    fail_if("카카오톡 대화 갈무리" not in payload["afterCaptureModal"]["text"], failures, "capture text did not include title")
    fail_if("[09:05] 채상욱 리더:" not in payload["afterCaptureModal"]["text"], failures, "capture text did not include selected date messages")
    fail_if("첨부파일 내용: 포함하지 않음" not in payload["afterCaptureModal"]["text"], failures, "capture text did not state attachment contents are excluded")
    fail_if(not payload["afterCaptureModal"]["filename"].endswith(".txt"), failures, "capture filename was not txt")
    fail_if(payload["afterSearch"]["dateListCount"] != 1, failures, "search did not filter date list")
    fail_if(not payload["afterLeaderFilter"]["leaderFilterActive"], failures, "leader filter did not activate")
    fail_if(payload["afterLeaderFilter"]["leaderFilterTarget"] != "테스터", failures, "custom leader filter target was not applied")
    fail_if(payload["afterLeaderFilter"]["leaderMessageCount"] != 4, failures, "custom leader filter target did not mark matching messages")
    fail_if(payload["afterLeaderFilter"]["hiddenChatMessageCount"] != 1, failures, "custom leader filter did not hide non-matching messages")
    fail_if(not payload["afterFilteredCaptureModal"]["useLeaderFilter"], failures, "capture did not inherit active user filter")
    fail_if("사용자 필터: 테스터" not in payload["afterFilteredCaptureModal"]["text"], failures, "capture text did not include user filter metadata")
    fail_if(payload["afterTheme1995"]["theme"] != "1995", failures, "1995 theme did not apply")
    fail_if(payload["afterTheme1995"]["font"] != "iyagi", failures, "1995 theme did not auto-apply Iyagi font")
    fail_if(payload["afterTheme1995"]["storedTheme"] != "1995", failures, "1995 theme choice was not persisted")
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
