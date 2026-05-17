# chaextractor 하네스 백로그

작성일: 2026-05-17

## 역할

이 문서는 [reviews/2026-05-17.md](reviews/2026-05-17.md)의 검토 결과 중 아직 구현 또는 검증으로 닫히지 않은 항목을 추적한다. 리뷰 문서는 스냅샷이고, 이 문서는 실행 대기열이다.

상태 기준:

| 상태 | 의미 |
|---|---|
| 반영 | 문서, 결정, 코드 위치 또는 공개 약속에 반영됨 |
| 대기 | 아직 구현/검증이 없음 |
| 결정 필요 | 제품 또는 보안 판단이 먼저 필요 |
| 구현 필요 | 요구사항은 분명하지만 코드 또는 테스트가 없음 |

## 반영 완료

| 항목 | 반영 위치 | 상태 |
|---|---|---|
| 루트 Markdown 역할 정리 | `README.md`, `AGENTS.md`, `CLAUDE.md`, `HISTORY.md` | 반영 |
| 하네스 계약 레이어 추가 | `harness/MANIFEST.md` | 반영 |
| 요구사항 정본 분리 | `harness/REQUIREMENTS.md` | 반영 |
| 도메인 규칙 정본 분리 | `harness/DOMAIN_RULES.md` | 반영 |
| 현재 유효한 결정 분리 | `harness/DECISIONS.md` | 반영 |
| 하네스 리뷰 이동 | `harness/reviews/2026-05-17.md` | 반영 |
| Windows 후보 파서 분류 | `harness/MANIFEST.md`, `harness/DOMAIN_RULES.md`, `AGENTS.md` | 반영 |
| JSZip 인라인/폰트 CDN 문서화 | `README.md`, `harness/MANIFEST.md`, `harness/DECISIONS.md` | 반영 |
| 개인정보 문구 정밀화 | `README.md`, `harness/MANIFEST.md` | 반영 |
| Android 샘플 경로 정리 | `HISTORY.md`, `harness/DECISIONS.md` | 반영 |
| `RESULT_STEP1.md` 미포함 상태 명시 | `HISTORY.md` | 반영 |
| Python CSV 파서 위치 정리 | `tools/parse_kakao_chat.py`, `tools/README.md`, `pyproject.toml` | 반영 |
| Maintainer project skill 추가 | `.agents/skills/chaextractor-maintainer/SKILL.md`, `AGENTS.md`, `CLAUDE.md` | 반영 |
| Tester project skill 추가 | `.agents/skills/chaextractor-tester/SKILL.md`, `AGENTS.md`, `CLAUDE.md` | 반영 |
| Parser golden runner 추가 | `harness/scripts/run_parser_golden.py`, `harness/scripts/parse_with_index.mjs`, `harness/TESTING.md` | 반영 |
| Android 실제 ZIP expected 추가 | `test/parser-golden/android-sample.json` | 반영 |
| iOS 최소 fixture와 expected 추가 | `test/fixtures/ios-minimal/`, `test/parser-golden/ios-minimal.json` | 반영 |
| `index.html` parser test API 추가 | `window.__CHAEXTRACTOR_ENABLE_TEST_API__` guard 기반 test hook | 반영 |
| Doc drift checker 추가 | `harness/scripts/check_doc_drift.py`, `harness/TESTING.md` | 반영 |
| Windows 텍스트 내보내기 정식 지원 승격 | `README.md`, `AGENTS.md`, `harness/DOMAIN_RULES.md`, `test/parser-golden/windows-minimal.json` | 반영 |
| H-005 파일명/첨부 ref HTML escape 보강 | `index.html`, `test/parser-golden/security-xss.json` | 반영 |
| H-006 Escape 모달 닫기와 키보드 접근성 보강 | `index.html`, `harness/scripts/check_modal_escape.py` | 반영 |
| H-007 cache hit 날짜 정렬 회귀 고정 | `index.html`, `harness/scripts/check_cache_date_sort.py` | 반영 |
| H-009 주요 UI 흐름 smoke 추가 | `harness/scripts/check_ui_smoke.py`, `harness/scripts/parse_with_index.mjs` | 반영 |
| H-010 브라우저 기능 제한 안내 구현 | `index.html`, `harness/scripts/check_capability_notice.py` | 반영 |
| H-011 캐시 삭제 UX와 Blob URL 해제 정책 구현 | `index.html`, `harness/scripts/check_cache_privacy.py` | 반영 |
| H-012 Android 일반 파일/PDF 매핑 결정 및 구현 | `harness/DOMAIN_RULES.md`, `test/parser-golden/android-files.json`, `index.html` | 반영 |
| H-013 합성 대용량 성능 smoke 추가 | `harness/scripts/check_performance_smoke.py`, `harness/TESTING.md` | 반영 |
| 가이드 이미지 정적 자산 분리 | `assets/guide/*.png`, `index.html`, `README.md`, `AGENTS.md`, `harness/DECISIONS.md` | 반영 |
| 앱 CSS 정적 자산 분리 | `assets/styles/app.css`, `index.html`, `README.md`, `AGENTS.md`, `harness/DECISIONS.md` | 반영 |
| Open Graph/hero 이미지 정적 자산 위치 정리 | `assets/og-image.png`, `index.html`, `README.md`, `AGENTS.md`, `harness/DECISIONS.md` | 반영 |

## 우선순위 백로그

현재 자동화 가능한 우선순위 백로그는 없다. Windows 첨부파일 매핑은 아래 외부 샘플 필요 항목으로 남긴다.

## 외부 샘플 필요

| ID | 영역 | 상태 | 다음 필요 증거 |
|---|---|---|---|
| H-014 | Windows attachment | 실제 Windows 첨부파일 export 구조 미확인. `windows-attachments-unsupported` fixture로 현재 미지원 범위를 고정 | 실제 Windows 첨부파일 포함 export 샘플과 파일 구조 |

## 다음 구현 묶음

다음 구현 묶음은 JS/vendor를 빌드 없는 정적 파일로 분리할지 검토하거나, 실제 Windows 첨부파일 export 샘플 확보 후 결정한다.
