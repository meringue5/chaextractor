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

## 우선순위 백로그

| ID | 우선순위 | 영역 | 작업 | 완료 기준 |
|---|---|---|---|---|
| H-001 | P0 | Parser golden | Android 실제 ZIP expected JSON 추가 | `test/expected/android-sample.json`이 메시지 수, 날짜 수, 타입 수, 첨부 매핑 수를 고정 |
| H-002 | P0 | Parser golden | iOS 최소 fixture와 expected JSON 추가 | 날짜 헤더, 텍스트 병합, 사진, PDF, 누락 첨부파일을 검증 |
| H-003 | P0 | Parser golden | `index.html` test-only parser export 추가 | 브라우저 컨텍스트에서 파서 함수 호출 가능 |
| H-004 | P0 | Doc drift | Markdown/플랫폼/PATTERNS/의존성 drift checker 추가 | 로컬 명령이 통과/실패를 반환 |
| H-005 | P0 | Security | 파일명/첨부 ref HTML escape 보강 | XSS fixture가 실행되지 않고 텍스트로 렌더링 |
| H-006 | P0 | Accessibility | Escape 모달 닫기와 키보드 접근성 보강 | 이미지/꿀팁/설정 모달이 Escape로 닫힘 |
| H-007 | P0 | Cache | cache hit 날짜 정렬 회귀 고정 | 캐시 사용 시에도 날짜 목록이 최신순 유지 |
| H-008 | P0 | Platform | Windows 후보 지원 상태 결정 | 실험/정식/제거 중 하나로 결정하고 문서와 fixture를 맞춤 |
| H-009 | P1 | Browser smoke | 주요 UI 흐름 Playwright smoke 추가 | 업로드, 날짜 선택, 검색, 리더 필터, 설정, 모바일 사이드바 검증 |
| H-010 | P1 | Capability | 브라우저 기능 제한 안내 구현 | `File`/`Blob`/`IndexedDB`/`URL.createObjectURL` 미지원 시 복구 가능한 메시지 표시 |
| H-011 | P1 | Cache/privacy | 캐시 삭제 UX와 Blob URL 해제 정책 구현 | 설정에서 캐시 삭제 가능, 새 업로드 시 Blob URL 정리 |
| H-012 | P1 | Attachment | Android 일반 파일/PDF 매핑 결정 및 구현 | URL 인코딩 파일명 fixture와 expected 추가 |
| H-013 | P2 | Performance | 합성 대용량 성능 smoke 추가 | 1만 메시지 로컬 smoke와 50만 메시지 수동 측정 절차 문서화 |

## 다음 구현 묶음

가장 작은 첫 구현 단위:

1. Android sample expected JSON 추가
2. iOS minimal fixture와 expected JSON 추가
3. `index.html` test-only parser export 추가
4. Parser golden runner 추가
5. Doc drift checker 추가

이 묶음이 끝나야 리뷰에서 말한 "실행 가능한 하네스" 단계로 넘어간다.
