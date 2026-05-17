# chaextractor 결정 기록 하네스

작성일: 2026-05-17

## 역할

이 문서는 `HISTORY.md`에 시간순으로 쌓인 내용 중 앞으로의 구현 기준으로 계속 사용해야 하는 결정을 추린 것이다. `HISTORY.md`는 사건의 기록이고, 이 문서는 현재 유효한 운영 기준이다.

## 현재 유효한 결정

| 결정 | 상태 | 근거/메모 |
|---|---|---|
| 앱 런타임은 빌드 없는 정적 앱으로 유지한다. `index.html`은 진입점이고 정적 자산은 별도 파일로 둘 수 있다. | 채택 | GitHub Pages 직접 배포와 소스/배포 드리프트 방지 |
| JS/vendor 분리는 빌드 산출물을 만들지 않는 범위에서 단계적으로 검토한다. | 채택 | 저장소 가독성과 Pages 직접 동작 균형 |
| 앱 CSS는 `assets/styles/app.css`로 분리한다. | 채택 | 스타일 변경 가독성 개선, 빌드 없는 정적 배포 유지 |
| 가이드 스크린샷은 `assets/guide/*.png` 개별 파일로 둔다. | 채택 | 내용 이미지라 스프라이트보다 alt/lazy loading/cache/replacement가 유리 |
| 하네스, fixture, 문서, 테스트 도구는 앱 런타임 밖의 보조 파일로 둔다. | 채택 | 앱 런타임과 개발 검증 레이어 분리 |
| 대화 원문과 첨부파일은 클라이언트 로컬에서 처리한다. | 채택 | 개인정보 표준 |
| iOS, Android, Windows는 공식 지원 플랫폼으로 유지한다. | 채택 | README/AGENTS 약속, parser golden fixture |
| Windows는 데스크톱 텍스트 내보내기 파싱을 공식 지원한다. | 채택 | `windows-minimal` fixture/expected 추가 |
| macOS는 규칙 확인 전까지 지원 대상으로 홍보하지 않는다. | 보류 | 실제 내보내기 구조 미확인 |
| `tools/parse_kakao_chat.py`는 보조 iOS CSV 파서로 취급한다. | 채택 | 브라우저 앱과 범위 분리 |
| 첨부파일 로드는 순차 처리와 진행률 표시를 유지한다. | 채택 | 2026-02-05 성능 테스트에서 순차 처리가 병렬보다 빠름 |
| 날짜 목록은 최신 날짜부터 표시한다. | 채택 | UI/UX 개선 이력 |
| 리더 비중 계산은 파싱 시점에 사전 계산한다. | 채택 | 렌더링 비용 완화 |
| 테마별 폰트 자동 전환을 제공한다. | 채택 | Light=RIDI바탕, Dark=Neo둥근모Pro, 수동 선택 시 자동 전환 비활성화 |
| IndexedDB 캐시는 로컬 편의 기능이며 민감 데이터로 취급한다. | 채택 | 설정 모달에서 캐시 삭제 제공 |
| Blob URL은 새 업로드 전 해제한다. | 채택 | 런타임 첨부 URL 메모리/개인정보 잔류 최소화 |
| Android 일반 파일/PDF는 URL 인코딩/디코딩 비교로 직접 매핑한다. | 채택 | `android-files` parser golden fixture |
| Windows 첨부파일 매핑은 실제 export 샘플 확보 전까지 미지원으로 둔다. | 보류 | `windows-attachments-unsupported` fixture로 현 범위 고정 |
| 하네스 리뷰의 미반영 항목은 `harness/BACKLOG.md`에서 추적한다. | 채택 | 리뷰 문서는 스냅샷, 백로그는 실행 대기열 |

## 문서화로 정정한 결정

| 항목 | 이전 문서 표현 | 현재 기준 |
|---|---|---|
| JSZip | CDN 의존성으로 표현 | 현재 구현은 JSZip 3.10.1 인라인. README/AGENTS는 인라인 런타임 의존성으로 정리 |
| 개인정보 | 외부 전송 없음 | 대화 데이터 자동 외부 전송 없음. 폰트 CDN 자동 요청과 사용자 클릭 외부 링크는 별도 표면으로 문서화 |
| Android 샘플 | `tmp/android/` 확보 | tracked 샘플 기준은 `test/dataset/android/` |
| Windows | 구현-only | 데스크톱 텍스트 내보내기 파싱은 fixture/expected를 추가해 공식 지원으로 승격 |
| 앱 파일 구조 | 단일 `index.html` 파일 | 현재 기준은 빌드 없는 정적 앱. `index.html`은 진입점이고 `assets/guide/*.png` 같은 정적 자산 분리 허용 |
| 앱 스타일 | `index.html` 내부 `<style>` | 현재 기준은 `assets/styles/app.css` 외부 스타일시트 |

## 미결정 결정

| 질문 | 기본 입장 | 결정에 필요한 증거 |
|---|---|---|
| Windows 첨부파일 매핑을 지원할 것인가? | 보류 | 실제 첨부파일 export 구조와 fixture |
| CSP를 도입할 것인가? | 보류 | inline script/style과 정적 파일 분리 경계 검토 |
| 20줄 미만 대화 파일을 허용할 것인가? | 보류 | 최소 대화 fixture와 사용자 오류 메시지 기준 |

## 결정 변경 규칙

1. 새 결정은 이 문서에 먼저 추가한다.
2. 결정이 사용자 약속을 바꾸면 `README.md`를 함께 갱신한다.
3. 결정이 에이전트 작업 규칙을 바꾸면 `AGENTS.md` 또는 `CLAUDE.md`를 함께 갱신한다.
4. 결정이 파서 규칙을 바꾸면 [DOMAIN_RULES.md](DOMAIN_RULES.md)와 fixture/expected를 함께 갱신한다.
5. 결정의 배경과 검증 결과는 `HISTORY.md`에 시간순으로 남긴다.
