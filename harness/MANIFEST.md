# chaextractor 하네스 매니페스트

작성일: 2026-05-17

## 목적

이 문서는 chaextractor에서 무엇이 요구사항이고, 무엇이 표준이며, 무엇이 구현으로만 존재하는지를 구분한다. 목표는 에이전트의 자율성을 줄이는 것이 아니라, 자율적으로 움직일 때 벗어나면 안 되는 경계와 갱신해야 할 문서를 명확히 하는 것이다.

소스 오브 트루스의 우선순위:

| 순위 | 문서/대상 | 역할 |
|---:|---|---|
| 1 | `harness/MANIFEST.md` | 범위, 표준, 구현-only, 미결정 항목의 분류 |
| 2 | `harness/REQUIREMENTS.md` | 기능, 화면, 비기능 요구사항의 정본 |
| 3 | `harness/DOMAIN_RULES.md` | 플랫폼별 내보내기 규칙과 파싱 불변식 |
| 4 | `harness/DECISIONS.md` | 현재 유효한 기술/제품 결정 |
| 5 | `harness/BACKLOG.md` | 리뷰에서 나온 미반영 실행 과제 |
| 6 | `AGENTS.md` | 에이전트 작업 진입점과 코드 구조 맵 |
| 7 | `README.md` | 사용자에게 공개되는 약속 |
| 8 | `HISTORY.md` | 시간순 변경 이력과 검증 기록 |
| 9 | `index.html` | 현재 구현. 단독으로는 요구사항의 근거가 아님 |
| 10 | `tools/parse_kakao_chat.py` | 보조 CSV 파서. 브라우저 앱과 별도 범위 |

## 분류 기준

| 분류 | 의미 | 변경 규칙 |
|---|---|---|
| 표준 | 어떤 구현에도 지켜야 하는 상위 계약 | 구현 전 이 문서에 먼저 명시 |
| 요구사항 | 제품이 제공하기로 한 사용자/도메인 기능 | `REQUIREMENTS.md` 또는 `DOMAIN_RULES.md`와 fixture/test를 함께 갱신 |
| 구현-only | 코드에는 있으나 공식 지원/보장으로 정의되지 않은 동작 | 정식화, 실험 명시, 제거 중 하나를 결정 |
| 미결정 | 제품/보안/구조 판단이 필요한 항목 | 구현으로 확장하지 않고 결정을 기록 |

## 표준으로 정의된 것

### 개인정보와 데이터 경계

| 표준 | 현재 상태 | 필요한 하네스 |
|---|---|---|
| 대화 원문, 첨부파일, 파싱 결과는 외부 서버로 자동 전송하지 않는다. | 구현은 클라이언트 로컬 처리 중심 | doc drift checker로 문구 일부 점검 |
| 오류 진단 리포트는 대화 원문, 사용자명, 파일명, 첨부파일 내용을 자동 포함하지 않는다. | JS 오류/처리 실패 시 환경, 단계, 파일 확장자 분포, 스택, 최근 `console.error` 요약만 자동 작성/복사 | `check_diagnostic_report.py`로 원본 파일명 미포함 점검 |
| 사용자가 명시적으로 클릭한 외부 링크는 허용하되, 대화 데이터가 URL/query/body로 포함되면 안 된다. | 링크 사이드바와 버그 제보 링크가 있음 | 링크 목록 매니페스트와 회귀 체크 |
| 자동 외부 요청은 문서화되어야 한다. | 폰트 CDN 요청이 자동 발생함 | doc drift checker로 문서화 여부 점검 |
| IndexedDB 캐시는 로컬 캐시이며 민감 데이터로 취급한다. | 30일 정리 로직과 설정 모달 캐시 삭제 UX가 있음 | `check_cache_privacy.py`로 clear 경로 점검 |
| localStorage에는 UI 설정만 저장한다. | theme/font/fontAutoSwitch만 사용 | 설정 키 allowlist 체크 |

현재 외부 네트워크 표면:

| 유형 | 엔드포인트 | 자동 여부 | 비고 |
|---|---|---:|---|
| 폰트 | `cdn.jsdelivr.net/gh/neodgm/...` | 예 | NeoDunggeunmo Pro |
| 폰트 | `cdn.jsdelivr.net/gh/projectnoonnu/...` | 예 | RIDIBatang |
| 공개 메타 | `meringue5.github.io/chaextractor/assets/og-image.png` | 아니오 | 소셜/크롤러용 메타 |
| 링크 사이드바 | `moneybus-labs.github.io`, `github.com`, `drive.google.com`, `www.etfcheck.co.kr` | 아니오 | 사용자 클릭 |
| 버그 제보 | `github.com/meringue5/chaextractor/issues/new` | 아니오 | 사용자 클릭, Issue Form |

### 보안 표준

| 표준 | 현재 상태 | 필요한 하네스 |
|---|---|---|
| 대화 내용, 사용자명, 파일명은 신뢰하지 않는 입력으로 취급한다. | 메시지 본문, 사용자명, 파일명/첨부 ref는 렌더링 전 `escapeHtml` 처리 | `security-xss` golden fixture로 렌더링 결과 점검 |
| untrusted 파일 내용은 스크립트로 실행하지 않는다. | Blob URL로 이미지/파일 표시 | MIME/확장자 정책 테스트 필요 |
| `innerHTML` 사용 시 사용자 입력은 반드시 escape 후 삽입한다. | 파일명/첨부 ref raw 삽입 경로 보강 완료 | 새 `innerHTML` 경로 추가 시 security fixture 확장 |
| `target="_blank"` 외부 링크는 `rel="noopener"`를 사용한다. | 현재 주요 외부 링크에 적용됨 | 링크 lint 가능 |
| Blob URL은 새 업로드/정리 시 해제 가능해야 한다. | 새 업로드 전 런타임 첨부 Blob URL 해제 | `check_cache_privacy.py`로 revoke 경로 점검 |
| 오류는 복구 가능하게 사용자에게 표시한다. | 업로드 오류 메시지와 자동 작성/복사되는 오류 보고 모달 있음 | `check_diagnostic_report.py`와 오류 taxonomy fixture |

### 아키텍처 표준

| 표준 | 현재 상태 | 필요한 하네스 |
|---|---|---|
| 앱은 서버 없이 실행 가능한 빌드 없는 정적 앱이다. | `index.html` 진입점, `assets/styles/app.css` 스타일시트, `assets/scripts/app.js` 앱 로직, `assets/vendor/jszip-3.10.1.min.js` JSZip vendor, `assets/guide/*.png` 가이드 이미지, `assets/og-image.png` 공개 메타/hero 이미지 | GitHub Pages 직접 배포 경로와 문서 일치 점검 |
| 런타임 정적 자산은 소스와 배포본이 같은 파일이어야 한다. | 별도 빌드 산출물 없음 | doc drift checker와 파일 경로 존재 점검 |
| 브라우저 앱의 런타임 의존성은 명시되어야 한다. | JSZip 3.10.1 로컬 vendor, 폰트 CDN | doc drift checker로 일부 점검 |
| 플랫폼 파서 변경은 fixture와 expected 결과를 동반한다. | Android 실제 ZIP/iOS 최소/Windows 최소 fixture parser golden 시작 | macOS 확장 시 fixture 추가 |
| 구현-only 플랫폼 지원은 공개 지원으로 홍보하지 않는다. | Windows 텍스트 파서는 공식 지원으로 승격, Windows 첨부파일/macOS는 미결정 | 미결정 항목은 README에 홍보하지 않음 |
| 에이전트 작업은 문서/구현/검증/HISTORY를 함께 남긴다. | project skill, parser golden/doc drift, 선택 실행 Playwright browser smoke 하네스 시작 | 로컬 표준 명령 유지 |

## 요구사항으로 정의된 것

아래 항목은 [REQUIREMENTS.md](REQUIREMENTS.md) 기준으로 요구사항이다.

| 영역 | 요구사항 | 현재 검증 수준 |
|---|---|---|
| 입력 | ZIP 또는 폴더 입력으로 대화 로그와 첨부파일 파싱 | parser golden, Node UI smoke, browser smoke에서 Windows TXT 업로드 검증 |
| 플랫폼 | iOS/Android/Windows 내보내기 지원 | Android 실제 ZIP/iOS 최소/Windows 최소/Windows 첨부 미지원 fixture golden 검증 |
| 파싱 | 날짜 그룹화, 시스템 메시지 제외, 연속 텍스트 병합 | parser golden 부분 검증 |
| 메시지 타입 | text/photo/file/emoticon 분리 | parser golden 부분 검증 |
| 첨부파일 | 플랫폼별 매핑, 누락 시 앱 중단 없음 | parser golden: iOS PDF/사진, Android hash/일반 파일, 누락 첨부 검증 |
| 검색 | 전체 메시지 대상, 날짜 목록/결과 반영 | Node UI smoke와 browser smoke에서 날짜 목록 필터 검증 |
| 통계 | 날짜별 메시지 수, 참여자, 필터 대상 사용자 발언 수, 사진 수 | parser golden이 타입/기본 대상 수 일부 검증 |
| UI | 오른쪽 링크 사이드바, 사용자 지정 필터, 설정, 테마/폰트 유지 | Node UI smoke와 browser smoke에서 주요 흐름 부분 검증 |
| 접근성 | 키보드 주요 기능, 포커스, 대비 | 모달 Escape 닫기는 `check_modal_escape.py`로 검증 |
| 기능 제한 | `File`/`Blob`/`IndexedDB`/`URL.createObjectURL` 미지원 안내 | capability notice 검증 |
| 성능 | 50만 메시지 10초 내 파싱 목표 | 합성 1만 자동 smoke, 50만 수동 측정 절차 |

## 구현으로만 존재하는 것

아래 항목은 코드에는 있으나 요구사항 또는 표준으로 확정되지 않았다.

| 항목 | 구현 위치/근거 | 리스크 | 다음 결정 |
|---|---|---|---|
| JSZip 로컬 vendor | `assets/vendor/jszip-3.10.1.min.js` | 런타임 의존성 설명이 드리프트될 수 있음 | doc drift checker로 점검 |
| 폰트 CDN 자동 요청 | CSS `@font-face` | 개인정보 문구와 외부 요청 범위 혼선 | 외부 네트워크 표면으로 공식 등재 완료 |
| 20줄 미만 대화 파일 거부 | `validateChatFile` | 짧은 실제 내보내기 거부 가능 | 요구사항으로 인정할지 결정 |
| 캐시 키 전략 | 파일명/크기/mtime 중심 | 폴더/첨부 변경 감지 부족 가능 | 캐시 정책 표준화 |
| 검색 결과 하이라이트 부재 | 검색은 `renderDateList`에만 연결 | AGENTS와 불일치 | 구현 또는 요구사항 수정 |
| Windows 첨부파일 매핑 | 텍스트 파싱은 지원하나 첨부파일 패턴은 미확정. 현재 직접 매핑하지 않도록 fixture로 고정 | Windows 사용자 기대 혼선 | 실제 샘플 확보 후 정식화 |

## 미결정 항목

| 질문 | 왜 중요한가 | 권장 기본값 |
|---|---|---|
| 외부 폰트 CDN을 허용할 것인가? | "외부 전송 없음" 문구와 충돌할 수 있다 | 허용하되 대화 데이터 외부 전송 없음으로 표현 정밀화 |
| Windows 첨부파일 매핑을 공식화할 것인가? | 텍스트 지원과 첨부파일 지원을 혼동할 수 있다 | 실제 export 구조 확인 전까지 공식 범위 밖으로 둠 |
| CSP 같은 브라우저 보안 정책을 둘 것인가? | inline script/style과 정적 파일 분리 경계 때문에 정책 설계가 필요하다 | 우선 위협 모델 문서화 후 적용 검토 |
| Python CSV 파서를 유지할 것인가? | 브라우저 파서와 기능 차이가 커질 수 있다 | 보조 iOS-only 도구로 명시 |
| vendor 업데이트 절차를 어떻게 관리할 것인가? | 로컬 vendor 파일은 CDN 드리프트를 줄이지만 출처/버전/무결성 기록이 필요하다 | `THIRD_PARTY` 또는 dependency manifest 추가를 검토 |
| 테스트 도구를 앱 런타임 밖에 둘 것인가? | 하네스 구현에 파일 추가가 필요하다 | 앱 런타임과 하네스는 별도 레이어로 유지 |

## 변경 프로토콜

새 작업은 아래 순서로 분류한다.

1. 이 변경이 표준, 요구사항, 구현-only, 미결정 중 어디에 속하는지 판단한다.
2. 표준 또는 요구사항이면 구현 전에 해당 하네스 문서와 `AGENTS.md`를 갱신한다.
3. 사용자에게 보이는 약속이면 `README.md`도 갱신한다.
4. 파서/플랫폼 변경이면 fixture와 expected 결과를 추가한다.
5. UI 흐름 변경이면 browser smoke 대상에 추가한다.
6. 작업 종료 시 `HISTORY.md`에 무엇을 검증했는지 남긴다.

## 다음 문서화 작업

남은 실행 과제는 [BACKLOG.md](BACKLOG.md)를 기준으로 추적한다. 문서화 관점의 우선순위:

1. XSS/파일명 escape 표준을 구현 요구사항으로 승격한다.
2. cache retention과 삭제 정책을 요구사항으로 정의한다.
3. parser golden과 doc drift checker를 로컬 표준 명령으로 유지한다.
