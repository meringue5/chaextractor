#!/usr/bin/env python3
"""Check the app input bundle contract against small ZIP/folder fixtures."""

from __future__ import annotations

import json
import subprocess
import sys
import zipfile
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
NODE_HELPER = REPO_ROOT / "harness" / "scripts" / "parse_with_index.mjs"
IOS_ZIP = REPO_ROOT / "test" / "dataset" / "ios" / "ios-zip-minimal.zip"
IOS_SOURCE_DIR = REPO_ROOT / "test" / "fixtures" / "ios-zip-minimal"


def parse_with_index(payload: dict[str, Any]) -> dict[str, Any]:
    result = subprocess.run(
        ["node", str(NODE_HELPER)],
        input=json.dumps(payload, ensure_ascii=False),
        text=True,
        capture_output=True,
        cwd=REPO_ROOT,
        check=False,
    )
    if result.returncode != 0:
        raise AssertionError(result.stderr.strip() or result.stdout.strip())
    return json.loads(result.stdout)


def build_zip_entries() -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    with zipfile.ZipFile(IOS_ZIP) as archive:
        for info in archive.infolist():
            entry: dict[str, Any] = {
                "name": info.filename,
                "entryPath": info.filename,
                "isDirectory": info.is_dir(),
                "size": info.file_size,
            }
            if info.filename.lower().endswith((".txt", ".csv")):
                entry["content"] = archive.read(info.filename).decode("utf-8-sig")
            entries.append(entry)
    return entries


def build_folder_entries() -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for path in sorted(IOS_SOURCE_DIR.iterdir()):
        if not path.is_file():
            continue
        entry: dict[str, Any] = {
            "name": path.name,
            "entryPath": f"ios-zip-minimal/{path.name}",
            "isDirectory": False,
            "size": path.stat().st_size,
            "lastModified": 1234,
            "hasFile": True,
        }
        if path.suffix.lower() in {".txt", ".csv"}:
            entry["content"] = path.read_text(encoding="utf-8-sig")
        entries.append(entry)
    return entries


def assert_common_ios_bundle(bundle: dict[str, Any], source_type: str) -> None:
    expected_attachments = {
        "20260610_093200_1.jpeg",
        "20260610_093300.pdf",
        "20260610_093400_2.webp",
    }

    assert bundle["sourceType"] == source_type
    assert bundle["detectedPlatform"] == "ios"
    assert bundle["fileCount"] == 4
    assert bundle["chatCandidateCount"] == 1
    assert bundle["validChatFileCount"] == 1
    assert bundle["attachmentCandidateCount"] == 3
    assert bundle["attachmentExtensions"] == ["jpeg:1", "pdf:1", "webp:1"]
    assert bundle["chatFiles"][0]["filename"] == "Talk_2026.6.10 09_30-1.txt"
    assert bundle["chatFiles"][0]["contentLength"] > 300
    assert {item["filename"] for item in bundle["attachmentFiles"]} == expected_attachments


def main() -> int:
    zip_bundle = parse_with_index({
        "mode": "inputBundle",
        "sourceType": "zip",
        "sourceName": IOS_ZIP.name,
        "cacheKey": "zip-cache-key",
        "entries": build_zip_entries(),
    })
    assert_common_ios_bundle(zip_bundle, "zip")
    assert zip_bundle["sourceName"] == IOS_ZIP.name
    assert zip_bundle["cacheKey"] == "zip-cache-key"
    assert all(not item["hasFile"] for item in zip_bundle["attachmentFiles"])

    folder_bundle = parse_with_index({
        "mode": "inputBundle",
        "sourceType": "folder",
        "sourceName": "folder",
        "entries": build_folder_entries(),
    })
    assert_common_ios_bundle(folder_bundle, "folder")
    assert folder_bundle["cacheKey"].startswith("Talk_2026.6.10 09_30-1.txt_count1_")
    assert all(item["hasFile"] for item in folder_bundle["attachmentFiles"])

    print("PASS input bundle")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AssertionError as error:
        print("FAIL input bundle", file=sys.stderr)
        if str(error):
            print(f"  {error}", file=sys.stderr)
        raise SystemExit(1)
