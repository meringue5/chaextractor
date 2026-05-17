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
ruby -e 'Dir["*.md", "harness/*.md", "harness/reviews/*.md", "tools/*.md", ".agents/skills/*/SKILL.md"].each do |file|; dir = File.dirname(file); File.readlines(file).each_with_index do |line, idx|; line.scan(/\[[^\]]+\]\(([^)#]+\.md)\)/).each do |match|; target = match[0]; path = File.expand_path(target, dir); puts "#{file}:#{idx + 1}: missing #{target}" unless File.exist?(path); end; end; end'
PYTHONDONTWRITEBYTECODE=1 python3 -c "from tools.parse_kakao_chat import main; print(main.__name__)"
python3 harness/scripts/run_parser_golden.py
```

Only run heavier checks when the repo has the required runner and fixtures.

## Future Harness Checks

When implemented, prefer these evidence sources:

- doc drift checker for README/AGENTS/harness/index.html consistency
- browser smoke for upload, date navigation, search, leader filter, settings, image modal, and mobile sidebar
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
