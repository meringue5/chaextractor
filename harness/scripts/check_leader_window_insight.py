#!/usr/bin/env python3
"""Check experimental leader-window insight rendering with a synthetic chat."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
NODE_HELPER = REPO_ROOT / "harness" / "scripts" / "parse_with_index.mjs"


def build_chat() -> str:
    lines = [
        "테스트방 님과 카카오톡 대화",
        "저장한 날짜 : 2026년 3월 3일 오전 9:30",
        "",
        "",
        "---------------",
        "--------------- 2026년 3월 3일 화요일 ---------------",
    ]
    for minute in range(25):
        if minute == 8:
            lines.append("[참여자1] [오전 9:08] 네")
            continue
        if minute == 16:
            lines.append("[참여자2] [오전 9:16] 감사합니다")
            continue
        lines.append(f"[채상욱 리더] [오전 9:{minute:02d}] 설명 발화 {minute:02d}입니다")
    return "\n".join(lines)


def fail_if(condition: bool, failures: list[str], message: str) -> None:
    if condition:
        failures.append(message)


def main() -> int:
    result = subprocess.run(
        ["node", str(NODE_HELPER)],
        input=json.dumps(
            {
                "mode": "leaderWindowInsight",
                "platform": "windows",
                "content": build_chat(),
                "selectDate": "2026-03-03",
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
    ui = payload["ui"]
    leader_windows = payload["leaderWindows"]
    rendered = payload["rendered"]

    fail_if(leader_windows["candidateCount"] < 1, failures, "leader window candidate was not detected")
    fail_if(
        "semantic_long_explanation" not in ui["leaderWindowKinds"],
        failures,
        "synthetic leader-heavy window was not classified as semantic_long_explanation",
    )
    fail_if(ui["leaderWindowInsightHidden"], failures, "leader window insight stayed hidden")
    fail_if(ui["leaderWindowBannerCount"] < 2, failures, "leader window start/end banners were not rendered")
    fail_if(rendered["bannerCount"] < 2, failures, "rendered chat snapshot did not include banners")
    fail_if(rendered["messageCount"] != 5, failures, "rendered message count changed after adding banners")
    fail_if(
        leader_windows["summary"]["semanticLongCount"] < 1,
        failures,
        "day summary did not count a long semantic explanation candidate",
    )

    if failures:
        print("FAIL leader window insight")
        for failure in failures:
            print(f"  {failure}")
        return 1

    print("PASS leader window insight")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
