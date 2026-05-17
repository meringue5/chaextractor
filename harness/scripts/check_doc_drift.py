#!/usr/bin/env python3
"""Check high-risk documentation drift for chaextractor."""

from __future__ import annotations

import re
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (REPO_ROOT / path).read_text(encoding="utf-8")


def exists(path: str) -> bool:
    return (REPO_ROOT / path).exists()


def check(condition: bool, message: str, errors: list[str]) -> None:
    if not condition:
        errors.append(message)


def check_markdown_links(errors: list[str]) -> None:
    files = [
        *REPO_ROOT.glob("*.md"),
        *REPO_ROOT.glob("harness/*.md"),
        *REPO_ROOT.glob("harness/reviews/*.md"),
        *REPO_ROOT.glob("tools/*.md"),
        *REPO_ROOT.glob(".agents/skills/*/SKILL.md"),
    ]

    for file in files:
        text = file.read_text(encoding="utf-8")
        for line_no, line in enumerate(text.splitlines(), start=1):
            for raw_target in re.findall(r"\[[^\]]+\]\(([^)]+)\)", line):
                target = raw_target.strip()
                if target.startswith(("http://", "https://", "mailto:", "#")):
                    continue
                if target.startswith("<") and target.endswith(">"):
                    target = target[1:-1]
                target = target.split("#", 1)[0]
                if not target:
                    continue
                target_path = (file.parent / target).resolve()
                if not target_path.exists():
                    rel_file = file.relative_to(REPO_ROOT)
                    errors.append(f"{rel_file}:{line_no}: missing link target {raw_target}")


def main() -> int:
    errors: list[str] = []

    readme = read("README.md")
    agents = read("AGENTS.md")
    manifest = read("harness/MANIFEST.md")
    domain = read("harness/DOMAIN_RULES.md")
    decisions = read("harness/DECISIONS.md")
    testing = read("harness/TESTING.md")
    tester_skill = read(".agents/skills/chaextractor-tester/SKILL.md")
    history = read("HISTORY.md")
    index = read("index.html")

    check_markdown_links(errors)

    check("iOS / Android" in readme, "README must publicly support iOS / Android", errors)
    check(
        not re.search(r"(Windows|macOS)[^.\n]{0,30}지원", readme),
        "README must not advertise Windows/macOS support before fixtures exist",
        errors,
    )
    check("iOS / Android 카카오톡 내보내기 파일 모두 지원" in agents, "AGENTS must state iOS / Android support", errors)

    if "MESSAGE_WINDOWS" in index or "DATE_HEADER_WINDOWS" in index:
        check("Windows 파서 후보" in agents, "AGENTS must classify Windows parser as candidate", errors)
        check("Windows | 후보 구현 존재" in domain, "DOMAIN_RULES must classify Windows as implementation-only candidate", errors)
        check("Windows는 구현 후보" in decisions, "DECISIONS must keep Windows support on hold", errors)
        check("Windows 파서 후보" in manifest, "MANIFEST must list Windows parser as implementation-only", errors)

    if "JSZip v3.10.1" in index:
        check("JSZip은 `index.html`에 인라인" in readme, "README must say JSZip is inlined", errors)
        check("JSZip 인라인" in agents, "AGENTS must say JSZip is inlined", errors)
        check("JSZip 인라인" in manifest, "MANIFEST must track JSZip inline dependency", errors)
        check("JSZip 3.10.1 인라인" in decisions, "DECISIONS must record JSZip inline status", errors)

    if "cdn.jsdelivr.net" in index:
        check("폰트는 CDN에서 로드" in readme, "README must document font CDN loading", errors)
        check("폰트 CDN" in agents, "AGENTS must mention font CDN", errors)
        check("cdn.jsdelivr.net/gh/neodgm" in manifest, "MANIFEST must list NeoDunggeunmo CDN surface", errors)
        check("cdn.jsdelivr.net/gh/projectnoonnu" in manifest, "MANIFEST must list RIDIBatang CDN surface", errors)

    check(not exists("parse_kakao_chat.py"), "root parse_kakao_chat.py should remain moved to tools/", errors)
    check("tools/parse_kakao_chat.py" in readme, "README must point to tools/parse_kakao_chat.py", errors)
    check("tools/parse_kakao_chat.py" in agents, "AGENTS must point to tools/parse_kakao_chat.py", errors)

    android_samples = list((REPO_ROOT / "test" / "dataset" / "android").glob("*.zip"))
    if android_samples:
        check("test/dataset/android" in history, "HISTORY must mention tracked Android sample path", errors)
        check("test/dataset/android" in decisions, "DECISIONS must mention tracked Android sample path", errors)

    if exists("harness/scripts/run_parser_golden.py"):
        check(
            "python3 harness/scripts/run_parser_golden.py" in testing,
            "TESTING must document parser golden command",
            errors,
        )
        check(
            "python3 harness/scripts/run_parser_golden.py" in tester_skill,
            "tester skill must include parser golden command",
            errors,
        )

    if errors:
        print("FAIL doc drift")
        for error in errors:
            print(f"  {error}")
        return 1

    print("PASS doc drift")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
