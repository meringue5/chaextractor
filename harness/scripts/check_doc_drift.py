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


def asset_paths(pattern: str, text: str) -> list[str]:
    return sorted({match.split("?", 1)[0] for match in re.findall(pattern, text)})


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

    style_assets = asset_paths(r'href="(assets/styles/[^"]+\.css(?:\?[^"]*)?)"', index)
    app_script_assets = asset_paths(r'src="(assets/scripts/[^"]+\.js(?:\?[^"]*)?)"', index)
    vendor_script_assets = asset_paths(r'src="(assets/vendor/[^"]+\.js(?:\?[^"]*)?)"', index)
    styles = "\n".join(read(asset) for asset in style_assets if exists(asset))
    scripts = "\n".join(read(asset) for asset in [*app_script_assets, *vendor_script_assets] if exists(asset))
    runtime = index + "\n" + styles + "\n" + scripts

    check_markdown_links(errors)

    check("iOS / Android / Windows / macOS" in readme, "README must publicly support iOS / Android / Windows / macOS", errors)
    check("iOS / Android / Windows / macOS 카카오톡 내보내기 파일 지원" in agents, "AGENTS must state iOS / Android / Windows / macOS support", errors)

    if "MESSAGE_WINDOWS" in runtime or "DATE_HEADER_WINDOWS" in runtime:
        check("Windows 데스크톱 텍스트 내보내기는 공식 지원" in agents, "AGENTS must state Windows text export support", errors)
        check("Windows | 공식 지원" in domain, "DOMAIN_RULES must classify Windows as official support", errors)
        check("Windows는 데스크톱 텍스트 내보내기 파싱을 공식 지원" in decisions, "DECISIONS must adopt Windows text support", errors)
        check(
            "Windows 첨부파일 매핑" in manifest or "Windows/macOS 첨부파일 매핑" in manifest,
            "MANIFEST must keep Windows attachment mapping unresolved",
            errors,
        )
        check(exists("test/parser-golden/windows-minimal.json"), "Windows support requires parser golden expected", errors)
        check(exists("test/fixtures/windows-minimal/KakaoTalk_20260301_2110_00_123_windows.txt"), "Windows support requires fixture txt", errors)

    if "DATETIME_MACOS_CSV" in runtime or "parseMacOSCsvChat" in runtime:
        check("macOS 데스크톱 CSV" in readme, "README must document macOS CSV support", errors)
        check("macOS 데스크톱 CSV 텍스트 내보내기는 공식 지원" in agents, "AGENTS must state macOS CSV text export support", errors)
        check("macOS | 공식 지원" in domain, "DOMAIN_RULES must classify macOS as official support", errors)
        check("macOS는 데스크톱 CSV 텍스트 내보내기 파싱을 공식 지원" in decisions, "DECISIONS must adopt macOS CSV support", errors)
        check("Windows/macOS 첨부파일 매핑" in manifest, "MANIFEST must keep desktop attachment mapping unresolved", errors)
        check(exists("test/parser-golden/macos-csv.json"), "macOS support requires parser golden expected", errors)
        check(
            exists("test/fixtures/macos-csv/KakaoTalk_Chat_[테스트방]_2026-05-18-12-03-00.csv"),
            "macOS support requires CSV fixture",
            errors,
        )

    if app_script_assets:
        check("assets/scripts" in readme, "README must document app script asset directory", errors)
        check("assets/scripts/app.js" in agents, "AGENTS must document app script path", errors)
        check("assets/scripts/app.js" in manifest, "MANIFEST must classify app script as runtime static asset", errors)
        check("assets/scripts/app.js" in decisions, "DECISIONS must record app script asset policy", errors)
        for asset in app_script_assets:
            check(exists(asset), f"app script referenced by index.html is missing: {asset}", errors)

    if vendor_script_assets:
        check("assets/vendor" in readme, "README must document vendor script asset directory", errors)
        check("assets/vendor/jszip-3.10.1.min.js" in agents, "AGENTS must document JSZip vendor path", errors)
        check("assets/vendor/jszip-3.10.1.min.js" in manifest, "MANIFEST must classify JSZip vendor asset", errors)
        check("assets/vendor/jszip-3.10.1.min.js" in decisions, "DECISIONS must record JSZip vendor asset policy", errors)
        for asset in vendor_script_assets:
            check(exists(asset), f"vendor script referenced by index.html is missing: {asset}", errors)

    if "JSZip v3.10.1" in runtime:
        check("JSZip은 `assets/vendor/jszip-3.10.1.min.js`" in readme, "README must say JSZip is local vendor", errors)
        check("assets/vendor/jszip-3.10.1.min.js" in agents, "AGENTS must say JSZip is local vendor", errors)
        check("assets/vendor/jszip-3.10.1.min.js" in manifest, "MANIFEST must track JSZip local vendor dependency", errors)
        check("JSZip 3.10.1은 `assets/vendor/jszip-3.10.1.min.js`" in decisions, "DECISIONS must record JSZip local vendor status", errors)

    if style_assets:
        check("assets/styles" in readme, "README must document stylesheet asset directory", errors)
        check("assets/styles/app.css" in agents, "AGENTS must document app stylesheet path", errors)
        check("assets/styles/app.css" in manifest, "MANIFEST must classify app stylesheet as runtime static asset", errors)
        check("assets/styles/app.css" in decisions, "DECISIONS must record stylesheet asset policy", errors)
        for asset in style_assets:
            check(exists(asset), f"stylesheet referenced by index.html is missing: {asset}", errors)

    if "cdn.jsdelivr.net" in runtime:
        check("폰트는 CDN에서 로드" in readme, "README must document font CDN loading", errors)
        check("폰트 CDN" in agents, "AGENTS must mention font CDN", errors)
        check("cdn.jsdelivr.net/gh/neodgm" in manifest, "MANIFEST must list NeoDunggeunmo CDN surface", errors)
        check("cdn.jsdelivr.net/gh/projectnoonnu" in manifest, "MANIFEST must list RIDIBatang CDN surface", errors)
        check("cdn.jsdelivr.net/gh/JuwanPark/IyagiGGC" in manifest, "MANIFEST must list IyagiGGC CDN surface", errors)

    if "reportIssueModal" in runtime or "diagnosticState" in runtime:
        check("오류 진단 리포트" in readme, "README must document diagnostic report behavior", errors)
        check("오류 진단 리포트" in agents, "AGENTS must document diagnostic report UI", errors)
        check("진단 리포트는 오류 재현" in manifest, "MANIFEST must classify diagnostic report debugging boundary", errors)
        check("오류 보고" in read("harness/REQUIREMENTS.md"), "REQUIREMENTS must include diagnostic issue reporting", errors)
        check("대화 파일 검증 결과" in read("harness/REQUIREMENTS.md"), "REQUIREMENTS must require diagnostic validation details", errors)
        check("Google Form 내용 칸에 자동 입력" in readme, "README must document prefilled Google Form reporting", errors)
        check("docs.google.com/forms/d/e/1FAIpQLSeLjAqqVMEjSz2tbCs7tUpzRwDRnK41LAxDwuIyylU6XTnIlA/viewform" in runtime, "runtime must open Google Form for ordinary bug reporting", errors)
        check("entry.315233821" in runtime and "entry.1161180918" in runtime, "runtime must prefill Google Form report fields", errors)
        check("진단 리포트 사전입력 Google Form" in manifest, "MANIFEST must list prefilled Google Form surface", errors)
        check("python3 harness/scripts/check_diagnostic_report.py" in testing, "TESTING must document diagnostic report check", errors)
        check("python3 harness/scripts/check_diagnostic_report.py" in tester_skill, "tester skill must include diagnostic report check", errors)
        check("GitHub Issue Form은 개발자용 보조 채널" in read("harness/DECISIONS.md"), "DECISIONS must keep GitHub as a developer fallback, not primary reporting", errors)

    if "captureModal" in runtime or "buildCaptureText" in runtime:
        requirements = read("harness/REQUIREMENTS.md")
        check("갈무리 TXT" in readme, "README must document capture TXT behavior", errors)
        check("갈무리 TXT" in agents, "AGENTS must document capture TXT UI", errors)
        check("갈무리 TXT" in requirements, "REQUIREMENTS must include capture TXT feature", errors)
        check("갈무리 TXT" in manifest, "MANIFEST must classify capture TXT privacy boundary", errors)
        check("갈무리 내보내기" in decisions, "DECISIONS must record capture TXT scope", errors)
        check("갈무리 TXT 생성" in testing, "TESTING must document capture TXT smoke coverage", errors)

    guide_assets = sorted(set(re.findall(r'src="(assets/guide/[^"]+)"', index)))
    if guide_assets:
        check("assets/guide" in readme, "README must document guide asset directory", errors)
        check("assets/guide" in agents, "AGENTS must document guide asset directory", errors)
        check("assets/guide/*.png" in manifest, "MANIFEST must classify guide images as runtime static assets", errors)
        check("assets/guide/*.png" in decisions, "DECISIONS must record guide image asset policy", errors)
        for asset in guide_assets:
            check(exists(asset), f"guide asset referenced by index.html is missing: {asset}", errors)

    if "og-image.png" in index:
        check("assets/og-image.png" in index, "index.html must reference OG image under assets/", errors)
        check("assets/og-image.png" in readme, "README must document OG image asset path", errors)
        check("assets/og-image.png" in agents, "AGENTS must document OG image asset path", errors)
        check("assets/og-image.png" in manifest, "MANIFEST must classify OG image as runtime static asset", errors)
        check("assets/og-image.png" in decisions, "DECISIONS must record OG image asset policy", errors)
        check(exists("assets/og-image.png"), "OG image asset is missing: assets/og-image.png", errors)
        check(not exists("og-image.png"), "root og-image.png should remain moved to assets/", errors)

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
