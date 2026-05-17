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

    check("iOS / Android / Windows" in readme, "README must publicly support iOS / Android / Windows", errors)
    check(
        not re.search(r"macOS[^.\n]{0,30}지원", readme),
        "README must not advertise macOS support before fixtures exist",
        errors,
    )
    check("iOS / Android / Windows 카카오톡 내보내기 파일 지원" in agents, "AGENTS must state iOS / Android / Windows support", errors)

    if "MESSAGE_WINDOWS" in index or "DATE_HEADER_WINDOWS" in index:
        check("Windows 데스크톱 텍스트 내보내기는 공식 지원" in agents, "AGENTS must state Windows text export support", errors)
        check("Windows | 공식 지원" in domain, "DOMAIN_RULES must classify Windows as official support", errors)
        check("Windows는 데스크톱 텍스트 내보내기 파싱을 공식 지원" in decisions, "DECISIONS must adopt Windows text support", errors)
        check("Windows 첨부파일 매핑" in manifest, "MANIFEST must keep Windows attachment mapping unresolved", errors)
        check(exists("test/parser-golden/windows-minimal.json"), "Windows support requires parser golden expected", errors)
        check(exists("test/fixtures/windows-minimal/KakaoTalk_20260301_2110_00_123_windows.txt"), "Windows support requires fixture txt", errors)

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

    guide_assets = sorted(set(re.findall(r'src="(assets/guide/[^"]+)"', index)))
    if guide_assets:
        check("assets/guide" in readme, "README must document guide asset directory", errors)
        check("assets/guide" in agents, "AGENTS must document guide asset directory", errors)
        check("assets/guide/*.png" in manifest, "MANIFEST must classify guide images as runtime static assets", errors)
        check("assets/guide/*.png" in decisions, "DECISIONS must record guide image asset policy", errors)
        for asset in guide_assets:
            check(exists(asset), f"guide asset referenced by index.html is missing: {asset}", errors)

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
