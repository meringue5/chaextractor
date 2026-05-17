---
name: chaextractor-maintainer
description: Use for chaextractor work that changes requirements, implementation, docs, platform parsing, user-facing promises, harness classification, or HISTORY. This skill translates between harness contracts, index.html/tools implementation, tests, and project history while minimizing drift.
---

# Chaextractor Maintainer

## Purpose

Keep chaextractor's three layers aligned:

- harness contracts in `harness/`
- implementation in `index.html` and `tools/`
- evidence/history in tests and `HISTORY.md`

Do not copy domain rules into this skill. Read the harness documents as the source of truth.

## Read Order

Always start with:

1. `AGENTS.md`
2. `harness/MANIFEST.md`
3. The task-relevant harness doc:
   - requirements/UI/nonfunctional: `harness/REQUIREMENTS.md`
   - parser/platform rules: `harness/DOMAIN_RULES.md`
   - accepted decisions/open decisions: `harness/DECISIONS.md`
   - queued harness work: `harness/BACKLOG.md`
4. Current implementation: usually `index.html`, sometimes `tools/parse_kakao_chat.py`

Use `harness/reviews/2026-05-17.md` only for historical context.

## Workflow

1. Classify the change as `standard`, `requirement`, `implementation-only`, or `undecided` using `harness/MANIFEST.md`.
2. Map affected layers before editing:
   - harness docs
   - public docs such as `README.md`
   - agent entry docs such as `AGENTS.md` and `CLAUDE.md`
   - implementation
   - fixture/test expectations
   - `HISTORY.md`
3. If behavior exists only in implementation, do not present it as official support. Either keep it implementation-only, propose a decision, or add the required harness/fixture/test updates.
4. For platform parser changes, require fixture and expected-result work unless the task is explicitly documentation-only.
5. For user-facing promises, update `README.md` and the relevant harness document together.
6. For security/privacy-sensitive work, apply the untrusted-input and local-data standards from `harness/MANIFEST.md`.
7. At the end, record what changed and what was verified. If verification was not possible, say exactly why.

## Guardrails

- `index.html` is current behavior, not a requirements source by itself.
- Windows parser behavior remains implementation-only until fixture and expected results make it official.
- Python tools are optional utilities, not the main app runtime.
- Do not let `HISTORY.md` become the canonical place for stable requirements; move stable rules into `harness/`.

## Example Triggers

- "Windows export is now officially supported"
- "Implement search result highlighting"
- "Update README privacy language"
- "Move a rule from HISTORY into harness"
- "Change attachment mapping behavior"

## Expected Output

When finishing a task, summarize:

- classification chosen
- harness docs updated
- implementation files changed
- tests or checks run
- unresolved drift or decisions left in `harness/BACKLOG.md`
