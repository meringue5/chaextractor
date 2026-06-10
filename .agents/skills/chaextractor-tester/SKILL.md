---
name: chaextractor-tester
description: Use for chaextractor tests, fixtures, regression checks, parser golden work, browser smoke tests, doc drift checks, validation of harness backlog items, and evidence collection. This skill separates pass/fail/not-run results and connects test evidence back to harness requirements.
---

# Chaextractor Tester

## Purpose

Turn harness requirements into repeatable evidence. This skill is for testing, fixture work, regression checks, and validation summaries.

Do not redefine expected product behavior in this skill. Read the harness documents first.

## Read Order

1. `harness/BACKLOG.md` for the target item and completion criteria.
2. `harness/REQUIREMENTS.md` for product/UI/nonfunctional expectations.
3. `harness/DOMAIN_RULES.md` for parser and fixture expectations.
4. `harness/MANIFEST.md` for security/privacy/doc-drift standards.
5. The relevant implementation or test files.

## Baseline Checks

Run these when relevant and safe:

```bash
git diff --check
python3 harness/scripts/check_doc_drift.py
python3 harness/scripts/check_diagnostic_report.py
python3 harness/scripts/check_input_bundle.py
PYTHONDONTWRITEBYTECODE=1 python3 -c "from tools.parse_kakao_chat import main; print(main.__name__)"
python3 harness/scripts/run_parser_golden.py
npm run test:browser
```

Run `npm run test:browser` only when Playwright dependencies and browser binaries are installed or when the task specifically concerns browser/runtime UI behavior.

## Future Harness Checks

When implemented, prefer these evidence sources:

- performance smoke for synthetic large logs

## Reporting Rules

Separate results into:

- `PASS`: command or scenario completed as expected
- `FAIL`: command or scenario failed, with the important error
- `NOT RUN`: not available, unsafe, too slow, or out of scope

When a test proves or fails a harness item, mention the backlog ID if one exists.

## Fixture Rules

- Parser fixtures must have expected JSON before they count as regression tests.
- Platform support cannot become official from code alone.
- Android expected results must cover hash image filenames, consecutive image lines, system message exclusion, URL-encoded filenames, and attachment mapping.
- iOS minimal fixtures must cover date headers, text merging, photo/PDF mapping, and missing attachments.

## Example Triggers

- "Add expected JSON for Android sample"
- "Run the doc drift checker"
- "Validate search highlight regression"
- "Check whether H-006 is done"
- "Create browser smoke for settings and mobile sidebar"
