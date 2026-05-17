#!/usr/bin/env python3
"""Run parser golden cases against the parser embedded in index.html."""

from __future__ import annotations

import json
import re
import subprocess
import sys
import zipfile
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
CASE_DIR = REPO_ROOT / "test" / "parser-golden"
NODE_HELPER = REPO_ROOT / "harness" / "scripts" / "parse_with_index.mjs"
ATTACHMENT_RE = re.compile(
    r"(^\d{8}_\d{6}(?:_\d+)?\.(?:jpeg|jpg|png|webp|pdf)$)"
    r"|(^[0-9a-f]{64}\.(?:jpg|jpeg|png|gif|webp)$)",
    re.IGNORECASE,
)
ANDROID_FILE_RE = re.compile(
    r"^.+\.(?:pdf|doc|docx|xls|xlsx|ppt|pptx|hwp|hwpx|zip)$",
    re.IGNORECASE,
)


def read_case(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as file:
        return json.load(file)


def load_input(case: dict[str, Any]) -> dict[str, Any]:
    input_spec = case["input"]

    if "zip" in input_spec:
        zip_path = (REPO_ROOT / input_spec["zip"]).resolve()
        with zipfile.ZipFile(zip_path) as archive:
            names = archive.namelist()
            chat_candidates = [
                name for name in names
                if name.lower().endswith(".txt") and not name.endswith("/")
            ]
            if "chatFile" in input_spec:
                suffix = input_spec["chatFile"]
                chat_candidates = [
                    name for name in chat_candidates
                    if name == suffix or name.endswith("/" + suffix)
                ]
            if not chat_candidates:
                raise AssertionError(f"{case['id']}: no chat txt found in {zip_path}")

            chat_name = chat_candidates[0]
            content = archive.read(chat_name).decode("utf-8-sig")
            attachments = [
                name for name in names
                if not name.endswith("/")
                and (
                    ATTACHMENT_RE.match(Path(name).name)
                    or ANDROID_FILE_RE.match(Path(name).name)
                )
            ]

        return {
            "content": content,
            "attachments": attachments,
            "platform": case["platform"],
        }

    if "text" in input_spec:
        text_path = (REPO_ROOT / input_spec["text"]).resolve()
        content = text_path.read_text(encoding="utf-8-sig")
        attachments = input_spec.get("attachments", [])
        return {
            "content": content,
            "attachments": attachments,
            "platform": case["platform"],
        }

    raise AssertionError(f"{case['id']}: unsupported input spec")


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


def compare_value(case_id: str, key: str, expected: Any, actual: Any, errors: list[str]) -> None:
    if actual != expected:
        errors.append(f"{case_id}: {key} expected {expected!r}, got {actual!r}")


def message_matches(message: dict[str, Any], expected: dict[str, Any]) -> bool:
    for key, value in expected.items():
        if key == "index":
            continue
        if key == "contentContains":
            if value not in message.get("content", ""):
                return False
        elif message.get(key) != value:
            return False
    return True


def compare_case(case: dict[str, Any], actual: dict[str, Any]) -> list[str]:
    case_id = case["id"]
    expected = case["expected"]
    errors: list[str] = []

    for key in [
        "detectedPlatform",
        "messageCount",
        "dateCount",
        "dates",
        "typeCounts",
        "attachmentRefCount",
        "attachmentMappedCount",
        "leaderCountByDate",
    ]:
        if key in expected:
            compare_value(case_id, key, expected[key], actual.get(key), errors)

    messages = actual.get("messages", [])

    for expected_message in expected.get("messages", []):
        index = expected_message["index"]
        if index >= len(messages):
            errors.append(f"{case_id}: message index {index} missing")
            continue
        if not message_matches(messages[index], expected_message):
            errors.append(
                f"{case_id}: message {index} did not match "
                f"{json.dumps(expected_message, ensure_ascii=False)}; "
                f"got {json.dumps(messages[index], ensure_ascii=False)}"
            )

    for expected_message in expected.get("containsMessages", []):
        if not any(message_matches(message, expected_message) for message in messages):
            errors.append(
                f"{case_id}: no message matched "
                f"{json.dumps(expected_message, ensure_ascii=False)}"
            )

    rendered = actual.get("rendered", {})
    rendered_html = "\n".join(rendered.get("messagesHtml", []))

    if "renderedMessageCount" in expected:
        compare_value(
            case_id,
            "rendered.messageCount",
            expected["renderedMessageCount"],
            rendered.get("messageCount"),
            errors,
        )

    for expected_text in expected.get("renderedHtmlContains", []):
        if expected_text not in rendered_html:
            errors.append(f"{case_id}: rendered HTML missing {expected_text!r}")

    for forbidden_text in expected.get("renderedHtmlNotContains", []):
        if forbidden_text in rendered_html:
            errors.append(f"{case_id}: rendered HTML contained {forbidden_text!r}")

    return errors


def main() -> int:
    case_paths = [Path(arg) for arg in sys.argv[1:]]
    if not case_paths:
        case_paths = sorted(CASE_DIR.glob("*.json"))

    if not case_paths:
        print("No parser golden cases found", file=sys.stderr)
        return 1

    failed = False
    for case_path in case_paths:
        case = read_case(case_path)
        payload = load_input(case)
        if "renderDate" in case:
            payload["renderDate"] = case["renderDate"]
        actual = parse_with_index(payload)
        errors = compare_case(case, actual)

        if errors:
            failed = True
            print(f"FAIL {case['id']}")
            for error in errors:
                print(f"  {error}")
        else:
            print(f"PASS {case['id']}")

    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
