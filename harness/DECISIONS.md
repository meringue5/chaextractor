# chaextractor 결정 기록 하네스

작성일: 2026-05-17

## 역할

이 문서는 `HISTORY.md`에 시간순으로 쌓인 내용 중 앞으로의 구현 기준으로 계속 사용해야 하는 결정을 추린 것이다. `HISTORY.md`는 사건의 기록이고, 이 문서는 현재 유효한 운영 기준이다.

## 현재 유효한 결정

| 결정 | 상태 | 근거/메모 |
|---|---|---|
| 앱 런타임은 빌드 없는 정적 앱으로 유지한다. `index.html`은 진입점이고 정적 자산은 별도 파일로 둘 수 있다. | 채택 | GitHub Pages 직접 배포와 소스/배포 드리프트 방지 |
| 공식 서비스 제공 경로는 GitHub Pages로 둔다. 로컬 개발/검증 경로는 정적 서버로 `http://127.0.0.1:<port>/`에서 실행한다. | 채택 | 사용자는 GitHub Pages에서 서비스를 이용한다. 개발/검증은 GitHub Pages와 같은 HTTP 정적 호스팅 조건을 로컬에서 재현한다. `file://` 직접 실행은 공식 검증 경로로 보장하지 않는다. |
| JS/vendor 분리는 빌드 산출물을 만들지 않는 범위에서 단계적으로 진행한다. 앱 JS는 ES module을 허용하고, 로컬 검증은 정적 서버를 사용한다. | 채택 | Chromium 계열 `file://`에서 외부 module script가 CORS로 차단되어 파일 선택 버튼 초기화가 실패함을 확인. 모듈 경계를 유지하기 위해 로컬 정적 서버 경로를 표준화한다. |
| 앱 CSS는 `assets/styles/app.css`로 분리한다. | 채택 | 스타일 변경 가독성 개선, 빌드 없는 정적 배포 유지 |
| 앱 JS는 `assets/scripts/app.js`로 분리한다. | 채택 | 파서/UI 로직 유지보수성 개선, 빌드 없는 정적 배포 유지 |
| UI 없는 대화 파싱 코어는 `assets/scripts/chat-core.js`로 분리한다. | 채택 | `app.js`는 DOM/앱 상태 반영에 집중하고, 대화 파싱/병합은 결과 객체를 반환하는 단일 코어 경계로 둔다. 파일 세분화 자체가 목적이 아니라 플랫폼 규칙 변경 시 UI 결합을 줄이는 것이 목적 |
| 저수준 대화 도메인 헬퍼는 `assets/scripts/chat-domain.js`로 분리하고 ES module export로 제공한다. | 채택 | 정규식, 플랫폼 감지, CSV/첨부파일/메시지 분류 계약을 DOM/UI 전역 상태에서 떼어내 다음 파서 분리의 기준점으로 삼음 |
| 앱 버전 매니페스트는 `assets/version.json`에 둔다. | 채택 | GitHub Pages 캐시 환경에서 새 배포 감지와 캐시 우회 새로고침 기준 제공 |
| JSZip 3.10.1은 `assets/vendor/jszip-3.10.1.min.js` 로컬 vendor 파일로 둔다. | 채택 | CDN 버전 드리프트 없이 GitHub Pages 배포 파일과 저장소 소스가 동일하게 동작 |
| Playwright browser smoke는 선택 실행 개발 하네스로 둔다. | 채택 | 실제 브라우저 자산 로드, 파일 업로드, 모바일 UI는 Node VM만으로 검증하기 어려움 |
| 가이드 스크린샷은 `assets/guide/*.png` 개별 파일로 둔다. | 채택 | 내용 이미지라 스프라이트보다 alt/lazy loading/cache/replacement가 유리 |
| Open Graph 이미지는 `assets/og-image.png`에 둔다. | 채택 | 런타임 정적 이미지 자산 위치 일관화 |
| 하네스, fixture, 문서, 테스트 도구는 앱 런타임 밖의 보조 파일로 둔다. | 채택 | 앱 런타임과 개발 검증 레이어 분리 |
| 테스트 API는 버전 있는 내부 하네스 계약으로 둔다. | 채택 | `window.__CHAEXTRACTOR_TEST__`는 테스트 플래그가 켜진 환경에서만 노출한다. 현재 `contractVersion: 1`이며 `parser`/`ui`/`runtime`/`diagnostics`/`state` 네임스페이스를 정식 하네스 호출 경로로 사용한다. 기존 평면 함수는 호환용으로 유지 |
| 대화 원문과 첨부파일은 클라이언트 로컬에서 처리한다. | 채택 | 개인정보 표준 |
| iOS, Android, Windows, macOS는 공식 지원 플랫폼으로 유지한다. | 채택 | README/AGENTS 약속, parser golden fixture |
| Windows는 데스크톱 텍스트 내보내기 파싱을 공식 지원한다. | 채택 | `windows-minimal` fixture/expected 추가 |
| macOS는 데스크톱 CSV 텍스트 내보내기 파싱을 공식 지원한다. | 채택 | 실제 CSV 형식 확인 후 `macos-csv` fixture/expected 추가 |
| `tools/parse_kakao_chat.py`는 보조 iOS CSV 파서로 취급한다. | 채택 | 브라우저 앱과 범위 분리 |
| 첨부파일 로드는 순차 처리와 진행률 표시를 유지한다. | 채택 | 2026-02-05 성능 테스트에서 순차 처리가 병렬보다 빠름 |
| 날짜 목록은 최신 날짜부터 표시한다. | 채택 | UI/UX 개선 이력 |
| 필터 대상 사용자 비중은 기본 대상 기준으로 계산하고, 사용자가 필터 대상을 바꾸면 재계산한다. | 채택 | 기본값은 `채상욱 리더`, 사용자 입력은 런타임 UI 상태로만 사용 |
| 갈무리 내보내기 1차 범위는 TXT 복사/다운로드로 둔다. | 채택 | LLM 요약 호환성을 우선하고 이미지/base64 포함은 후속 검토로 분리 |
| 버그 제보 1차 경로는 GitHub Issue가 아니라 Google Form으로 둔다. | 채택 | 일반 사용자가 GitHub 계정 없이 제보할 수 있어야 함. 진단 리포트는 오류 메시지, 파일명/경로/크기, ZIP 구조, 후보 대화 파일 검증 결과와 샘플 라인을 내용 칸에 사전 입력하고, GitHub Issue Form은 개발자용 보조 채널 |
| 기본 테마는 1995로 둔다. | 채택 | 주 사용층에 맞춰 PC통신/이야기 감성을 첫 화면 기본 경험으로 제공 |
| 테마별 폰트 자동 전환을 제공한다. | 채택 | Light=RIDI바탕, Dark=Neo둥근모Pro, 1995=IyagiGGC, 수동 선택 시 자동 전환 비활성화 |
| IndexedDB 캐시는 로컬 편의 기능이며 민감 데이터로 취급한다. | 채택 | 설정 모달에서 캐시 삭제 제공 |
| Blob URL은 새 업로드 전 해제한다. | 채택 | 런타임 첨부 URL 메모리/개인정보 잔류 최소화 |
| Android 일반 파일/PDF는 URL 인코딩/디코딩 비교로 직접 매핑한다. | 채택 | `android-files` parser golden fixture |
| Windows 첨부파일 매핑은 실제 export 샘플 확보 전까지 미지원으로 둔다. | 보류 | `windows-attachments-unsupported` fixture로 현 범위 고정 |
| macOS 첨부파일 매핑은 실제 export 샘플 확보 전까지 미지원으로 둔다. | 보류 | macOS CSV 텍스트 파싱과 첨부파일 지원 혼동 방지 |
| 하네스 리뷰의 미반영 항목은 `harness/BACKLOG.md`에서 추적한다. | 채택 | 리뷰 문서는 스냅샷, 백로그는 실행 대기열 |

## 문서화로 정정한 결정

| 항목 | 이전 문서 표현 | 현재 기준 |
|---|---|---|
| JSZip | CDN 의존성/인라인으로 표현 | 현재 기준은 `assets/vendor/jszip-3.10.1.min.js` 로컬 vendor |
| 앱 JS | `index.html` 내부 `<script>` | 현재 기준은 `assets/scripts/app.js` 외부 앱 스크립트 |
| 개인정보 | 외부 전송 없음 | 대화 데이터 자동 외부 전송 없음. 폰트 CDN 자동 요청과 사용자 클릭 외부 링크는 별도 표면으로 문서화 |
| Android 샘플 | `tmp/android/` 확보 | tracked 샘플 기준은 `test/dataset/android/` |
| Windows | 구현-only | 데스크톱 텍스트 내보내기 파싱은 fixture/expected를 추가해 공식 지원으로 승격 |
| 앱 파일 구조 | 단일 `index.html` 파일 | 현재 기준은 빌드 없는 정적 앱. `index.html`은 진입점이고 `assets/guide/*.png` 같은 정적 자산 분리와 `assets/scripts/app.js`, `assets/scripts/chat-core.js`, `assets/scripts/chat-domain.js` ES module 기반 JS 분리 허용 |
| 앱 스타일 | `index.html` 내부 `<style>` | 현재 기준은 `assets/styles/app.css` 외부 스타일시트 |
| Open Graph 이미지 | 루트 `og-image.png` | 현재 기준은 `assets/og-image.png` |

## 미결정 결정

| 질문 | 기본 입장 | 결정에 필요한 증거 |
|---|---|---|
| Windows/macOS 첨부파일 매핑을 지원할 것인가? | 보류 | 실제 첨부파일 export 구조와 fixture |
| CSP를 도입할 것인가? | 보류 | inline script/style과 정적 파일 분리 경계 검토 |
| 20줄 미만 대화 파일을 허용할 것인가? | 보류 | 최소 대화 fixture와 사용자 오류 메시지 기준 |

## 결정 변경 규칙

1. 새 결정은 이 문서에 먼저 추가한다.
2. 결정이 사용자 약속을 바꾸면 `README.md`를 함께 갱신한다.
3. 결정이 에이전트 작업 규칙을 바꾸면 `AGENTS.md` 또는 `CLAUDE.md`를 함께 갱신한다.
4. 결정이 파서 규칙을 바꾸면 [DOMAIN_RULES.md](DOMAIN_RULES.md)와 fixture/expected를 함께 갱신한다.
5. 결정의 배경과 검증 결과는 `HISTORY.md`에 시간순으로 남긴다.
