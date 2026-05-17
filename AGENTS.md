<!-- AGENTS.md 권장 구조
# 프로젝트 개요        — 한 줄 요약, 기술 스택, 배포 URL
# 요구사항             — 기능 요구사항 + 화면 설계 + 비기능 요구사항
# 도메인 지식          — 앱이 다루는 외부 데이터의 규칙/패턴
# 앱 콘텐츠 데이터     — 앱에 내장된 정적 콘텐츠 (URL, 텍스트 등)
# 코드 구조            — HTML/CSS/JS 컴포넌트, 함수, 상태, 패턴
# 진행 이력            — HISTORY.md 참조
-->

# 프로젝트 개요
카카오톡 오픈채팅방 대화 내역 뷰어. 빌드 없는 정적 앱, 서버 불필요, 클라이언트 사이드 처리.
- 배포: https://meringue5.github.io/chaextractor/
- 기술: HTML (`index.html`), CSS (`assets/styles/app.css`), JS (`assets/scripts/app.js`), JSZip local vendor (`assets/vendor/jszip-3.10.1.min.js`), `assets/guide` 정적 이미지, `assets/og-image.png`, IndexedDB (캐시), 폰트 CDN
- 개발 검증: Python/Node VM 하네스 + 선택 실행 Playwright browser smoke (`npm run test:browser`)
- 플랫폼: iOS / Android / Windows 카카오톡 내보내기 파일 지원
- TODO: macOS 카카오톡 데스크톱 내보내기 지원 예정

# 하네스 문서

작업을 시작할 때는 이 파일을 진입점으로 읽되, 아래 하네스 문서를 정본으로 삼는다.

- [harness/MANIFEST.md](harness/MANIFEST.md): 표준, 요구사항, 구현-only, 미결정 항목의 분류
- [harness/REQUIREMENTS.md](harness/REQUIREMENTS.md): 기능/화면/비기능 요구사항
- [harness/DOMAIN_RULES.md](harness/DOMAIN_RULES.md): 카카오톡 플랫폼별 내보내기 규칙과 파싱 불변식
- [harness/DECISIONS.md](harness/DECISIONS.md): HISTORY에서 추린 현재 유효한 기술/제품 결정
- [harness/BACKLOG.md](harness/BACKLOG.md): 하네스 리뷰에서 나온 미반영 실행 과제
- [harness/TESTING.md](harness/TESTING.md): 현재 사용 가능한 검증 명령과 예정 검증
- [harness/reviews/2026-05-17.md](harness/reviews/2026-05-17.md): 2026-05-17 기준 문서-구현-하네스 검토 결과

`index.html`에 코드가 존재하더라도 하네스에 분류되기 전까지는 공식 요구사항이 아니다. 사용자에게 공개되는 약속은 `README.md`, 시간순 진행 기록은 `HISTORY.md`에 남긴다.

보조 Python 파서는 [tools/parse_kakao_chat.py](tools/parse_kakao_chat.py)에 둔다. 본 앱의 기준 구현은 `index.html`이며, Python 파서는 iOS CSV 변환용 선택 유틸로만 취급한다.

# 프로젝트 스킬

이 저장소는 project-specific skill 절차를 [.agents/skills/](.agents/skills/) 아래에 둔다. 각 스킬의 정본은 `SKILL.md`다.

이 디렉터리는 Codex 계열 repo-local skill 관례에 맞춘다. 다른 LLM이 자동 skill로 해석하지 못하는 환경에서도 `SKILL.md`를 절차 문서로 읽으면 같은 작업 순서를 사용할 수 있다. 도구별 어댑터는 실제 필요가 생겼을 때 해당 도구의 공식 위치와 규격에 맞춰 별도 작업으로 추가한다.

- [.agents/skills/chaextractor-maintainer/SKILL.md](.agents/skills/chaextractor-maintainer/SKILL.md): 요구사항, 하네스, 구현, 문서, HISTORY 사이의 드리프트 방지
- [.agents/skills/chaextractor-tester/SKILL.md](.agents/skills/chaextractor-tester/SKILL.md): 테스트, fixture, 회귀 검증, 증거 수집

작업 성격별 권장:

- 요구사항/문서/플랫폼 파서/사용자 공개 약속 변경: `chaextractor-maintainer`
- fixture/test/검증/하네스 백로그 완료 판정: `chaextractor-tester`
- 보안/개인정보 변경: 우선 `chaextractor-maintainer`, 검증 단계에서 `chaextractor-tester`

작업 시작 라우팅:

| 요청 성격 | 먼저 읽을 스킬 | 적용 규칙 |
|---|---|---|
| 요구사항, 문서, 구현, 플랫폼 파서, 공개 약속, HISTORY 변경 | `.agents/skills/chaextractor-maintainer/SKILL.md` | 파일 수정 전 분류와 영향 문서를 먼저 결정 |
| 테스트, fixture, expected, 회귀 검증, 백로그 완료 판정 | `.agents/skills/chaextractor-tester/SKILL.md` | 검증 대상을 백로그/요구사항에 연결하고 PASS/FAIL/NOT RUN으로 기록 |
| 보안, 개인정보, XSS, 캐시, 외부 요청 | maintainer → tester | 표준 분류 후 검증 증거를 남김 |
| 단순 질문/현황 확인 | 필요 시만 | 스킬을 읽지 않아도 되지만 하네스 정본과 충돌하면 하네스를 우선 |

스킬을 적용한 작업은 최종 응답에 어떤 스킬 절차를 따랐는지와 실행/미실행 검증을 명시한다.

# 요구사항 요약

세부 요구사항은 [harness/REQUIREMENTS.md](harness/REQUIREMENTS.md)를 우선한다.

- ZIP 또는 폴더 입력으로 대화 로그와 첨부파일을 파싱한다.
- iOS/Android/Windows 카카오톡 내보내기 파일을 공식 지원한다.
- 날짜별 탐색, 검색, 통계, 기본값 `채상욱 리더`인 사용자 하이라이트/필터, 설정 유지, 오른쪽 링크 사이드바를 제공한다.
- 시스템 메시지는 제외하고, 동일 사용자 연속 텍스트는 병합한다.
- 사진/파일/이모티콘은 텍스트와 별도 타입으로 유지한다.
- 누락 첨부파일은 앱 중단 없이 복구 가능한 상태로 표시한다.
- 브라우저 호환, 성능, 접근성, 안정성, 개인정보 기준은 하네스의 비기능 요구사항과 매니페스트를 따른다.

# 도메인 지식 요약

세부 도메인 규칙은 [harness/DOMAIN_RULES.md](harness/DOMAIN_RULES.md)를 우선한다.

- iOS 대화 파일명: `Talk_YYYY.M.D HH_mm-n.txt`
- Android 대화 파일명: `KakaoTalkChats.txt`
- iOS 첨부파일: `YYYYMMDD_HHMMSS(_n)?.(jpeg|jpg|png|webp|pdf)`
- Android 이미지 첨부파일: `{64자리 hex}.(jpg|jpeg|png|gif|webp)`
- Android 일반 파일/PDF: `파일: {파일명}`. 파일명은 URL 인코딩될 수 있으며 디코딩 비교로 직접 매핑한다.
- Windows 첨부파일 매핑은 실제 export 구조 확인 전까지 공식 범위 밖이다.
- Windows 데스크톱 텍스트 내보내기는 공식 지원한다.
- macOS 공식 지원은 실제 export 규칙과 fixture가 확인되기 전까지 TODO다.
- 대화 내용, 사용자명, 파일명, 첨부파일 참조는 모두 신뢰하지 않는 입력으로 취급한다.

# 앱 콘텐츠 데이터

## 머니버스 꿀팁
### 개발자: 춤추는 토끼 171879
머니버스 하지 마라 15계명 https://moneybus-labs.github.io/hidden-gems/
머니버스 톡 추천 도서 https://github.com/moneybus-labs/books/blob/main/머니버스톡.md
채부심 북스 추천 도서 https://github.com/moneybus-labs/books/blob/main/채부심북스.md

### 개발자: 우드워커
액티브 ETF 구성 변화 시각화 앱 https://drive.google.com/file/d/1NIq8BKHki7ccSFCqTDEGDAxgL2iYOXDX/view

## 유용한 팁
ETF Checker https://www.etfcheck.co.kr

## 버그 제보
GitHub Issue Form https://github.com/meringue5/chaextractor/issues/new?template=bug_report.yml

# 코드 구조: index.html + 정적 자산

현재 앱 진입점은 `index.html`이다. 구조: `<head>`에서 `assets/styles/app.css` 로드 → `<body>` (HTML) → `assets/vendor/jszip-3.10.1.min.js` 로드 → `assets/scripts/app.js` 로드

빌드 산출물은 두지 않는다. 정적 자산은 소스 파일 그대로 GitHub Pages에 배포되며, 현재 앱 스타일은 `assets/styles/app.css`, 앱 로직은 `assets/scripts/app.js`, JSZip은 `assets/vendor/jszip-3.10.1.min.js`, 가이드 스크린샷은 `assets/guide/*.png`, Open Graph/hero 이미지는 `assets/og-image.png`에 둔다.

브라우저 회귀 검증은 `harness/browser/`의 Playwright smoke를 선택 실행한다. 이 하네스는 정적 서버로 저장소 루트의 `index.html`을 열고, 앱 배포 파일을 빌드 없이 그대로 검증한다.

## HTML 컴포넌트
- `#setupScreen` — 초기 화면
  - `.guide-section` — 사용 가이드 (`assets/guide` 스크린샷 6장)
  - `#step1` — 파일 업로드 영역
    - `#zipBtn` / `#zipInput` — ZIP/TXT 파일 선택 (iOS/Windows)
    - `#folderBtn` / `#folderInput` — 폴더 선택 (Android, webkitdirectory)
    - `#dropZone` — 드래그앤드롭 영역
    - `#zipName` — 파일 상태 메시지
    - `#progressContainer` > `#progressFill` + `.progress-text` — 진행률 바
  - `#startBtn` — 대화 보기 시작 버튼 (처리 완료 전 hidden)
  - `#heroImage` — 히어로 이미지 (`assets/og-image.png`, 처리 완료 후 표시)
  - `.setup-footer-btns` — 버그 제보 버튼
- `#app` — 메인 뷰어 (초기 hidden)
  - `.sidebar` — 좌측 패널 (320px, 모바일: 86vw 슬라이드)
    - `.sidebar-header` — 제목 + 헤더 버튼들
      - `#leaderFilterBtn` — 사용자 필터 패널 토글 및 필터 활성화 (👑)
      - `#leaderFilterPanel` / `#leaderFilterInput` — 필터 대상 사용자 입력 (기본값: `채상욱 리더`)
      - `#leaderFilterApplyBtn` / `#leaderFilterClearBtn` — 사용자 필터 적용/해제
      - `#settingsBtn` — 설정 모달 (⚙️)
    - `#stats` — 통계 (메시지 수, 참여자)
    - `#searchInput` — 메시지 검색
    - `.calendar` — 월별 캘린더
      - `#prevMonth` / `#nextMonth` — 월 이동
      - `#monthYear` — 현재 월 표시
      - `#calendarGrid` — 7열 그리드 (.day, .day.has-messages, .day.selected)
    - `#dateList` — 날짜 목록 (.date-item, .date-item.selected)
  - `#sidebarToggle` — 모바일 햄버거 버튼 (position: fixed)
  - `#linkSidebarToggle` — 모바일 링크 패널 토글 버튼 (position: fixed)
  - `#sidebarOverlay` — 모바일 배경 오버레이
  - `#chatArea` — 우측 대화 영역
    - `#scrollMarkers` — 필터 대상 사용자 발언 위치 마커 (금색 바)
    - `.chat-header` — 날짜 제목 + 통계
      - `#chatTitle` — 날짜/요일
      - `#chatInfo` — 메시지 수, 참여자, 필터 대상 발언 수, 사진 수
    - `#chatMessages` — 메시지 목록
  - `.link-sidebar` — 우측 링크 패널 (데스크톱 상시 표시, 모바일: 86vw 슬라이드)
    - `.link-sidebar-header` — 링크 패널 제목
    - `.link-group` — 머니버스 꿀팁/버그 제보 링크 그룹
    - `.link-item` — 외부 링크/제보 버튼
- `#imageModal` — 이미지 확대 모달 (`#modalImage`, `#modalClose`)
- `#settingsModal` — 설정 모달 (`.theme-btn`, `.font-btn`)
- `#reportIssueModal` — 오류 진단 리포트/오류 보고 모달 (`#diagnosticReportText`, `#copyDiagnosticBtn`, `#openIssueBtn`)
- `#diagnosticToast` — JS 오류/처리 실패 감지 시 표시되는 진단 리포트 토스트

## CSS 주요 클래스
정본 스타일시트는 `assets/styles/app.css`다.

- 레이아웃: `.setup-screen`, `.setup-box`, `.app`, `.sidebar`, `.chat-area`
- 가이드: `.guide-section`, `.guide-row`, `.guide-item`, `.guide-step`
- 업로드: `.file-btn-group`, `.file-btn`, `.file-btn.selected`, `.drop-zone`, `.drop-zone.drag-over`
- 진행률: `.progress-container`, `.progress-container.active`, `.progress-bar`, `.fill`
- 버튼: `.start-btn`, `.header-btn`, `.header-btns`
- 캘린더: `.calendar`, `.calendar-nav`, `.calendar-grid`, `.day`, `.day.has-messages`, `.day.selected`
- 날짜목록: `.date-list`, `.date-item`, `.date-item.selected`, `.leader-ratio`
- 메시지: `.message`, `.message-bubble`, `.user-name`, `.content`, `.time`
- 사용자 필터: `.leader-filter-panel`, `.leader-filter-controls`, `.message.leader` (황금색 그라데이션), `#leaderFilterBtn.active` (금색 배경)
- 첨부파일: `.attachment`, `.attachment img`, `.file-link`, `.emoticon`, `.no-file`, `.loading-placeholder`
- 스크롤마커: `.scroll-markers`, `.scroll-marker`
- 모달: `.modal`, `.modal.active`, `.modal-overlay`, `.modal-overlay.open`, `.modal-box`, `.modal-header`, `.modal-close-btn`
- 오류 보고: `.report-modal-box`, `.report-help`, `.report-actions`, `.report-action-btn`, `.diagnostic-report-text`, `.report-status`, `.diagnostic-toast`, `.diagnostic-toast-actions`
- 설정: `.settings-group`, `.settings-options`, `.theme-btn`, `.font-btn`, `.theme-btn.active`, `.font-btn.active`
- 링크 사이드바: `.link-sidebar`, `.link-sidebar.open`, `.link-sidebar-header`, `.link-group`, `.link-group-header`, `.link-list`, `.link-item`, `.link-button`, `.footer-link-btn`, `.link-sidebar-toggle`
- 상태: `.setup-step.completed` (녹색), `.setup-step.processing` (주황), `.setup-step.error` (적색)
- 모바일: `@media (max-width: 900px)` — `.sidebar.open`, `.link-sidebar.open`, `.sidebar-overlay.active`, `.sidebar-toggle`, `.link-sidebar-toggle`
- 테마: `[data-theme="dark"]`, `[data-font="ridi"]` (RIDIBatang), `[data-font="neodgm"]` (NeoDunggeunmo Pro)

## JavaScript 주요 함수
정본 앱 스크립트는 `assets/scripts/app.js`다.

파일 처리:
- `processFilesOrFolder(files)` — 파일 라우팅 (ZIP vs 폴더)
- `processZipFile(file)` — ZIP 해제, 검증, 파싱
- `processFolderFiles(files)` — 폴더 파일 처리 (Android)
- `validateChatFile(content)` — 카카오톡 대화 형식 검증
- `updateProgress(percent, text)` — 진행률 바 업데이트

파싱:
- `parseKakaoChat(content)` — 대화 파싱 (iOS/Android/Windows 정규식 분기)
- `parseMergedChatFiles(chatContents)` — 다중 대화 파일 병합 + 정렬
- `classifyContent(content)` — 메시지 유형 분류 (text/photo/emoticon/file)
- `detectPlatform(txtFilenames, attachFilenames)` — iOS/Android/Windows 감지
- `testPatternArray(line, patternArray)` — 정규식 배열 매칭 테스트
- `execPatternArray(line, patternArray)` — 정규식 배열 실행 + 첫 매치 반환

첨부파일:
- `isAttachmentFile(filename)` — iOS/Android 첨부파일 패턴 확인
- `parseAttachmentFilename(filename)` — iOS 파일명에서 datetime 추출
- `findClosestAttachment(list, targetDt, type, toleranceMinutes)` — 타임스탬프 기반 매핑 (iOS ±30분)
- `mapAttachments()` — 메시지-첨부파일 연결
- `loadAttachment(filename)` — ZIP에서 지연 로딩 + Blob URL 생성
- `loadAndRenderAttachment(elementId, filename, type, ref)` — 첨부파일 로딩 + DOM 업데이트

캐시 (IndexedDB):
- `initDB()` — IndexedDB 초기화
- `getCache(cacheKey)` / `setCache(cacheKey, data)` — 캐시 읽기/쓰기
- `cleanOldCache()` — 오래된 캐시 정리
- `clearAllCache()` — 설정 모달 캐시 삭제
- `generateCacheKey(fileName, fileSize, lastModified)` — 캐시 키 생성
- `sortDatesDescending(dateKeys)` — 날짜 목록 최신순 정규화
- `restoreCachedChatData(cachedData)` — 캐시 hit 상태 복원
- `clearRuntimeAttachmentFiles()` / `resetRuntimeAttachmentState()` — Blob URL 해제와 런타임 첨부 상태 초기화

UI 렌더링:
- `initApp()` — 앱 초기화 (파일 처리 완료 후)
- `renderCalendar()` — 월별 캘린더
- `renderDateList(searchQuery)` — 날짜 목록 (검색 필터 적용)
- `renderChat(date)` — 선택된 날짜의 메시지 렌더링
- `renderScrollMarkers(positions)` — 필터 대상 사용자 발언 마커 생성
- `selectDate(date)` — 날짜 선택 + 캘린더 하이라이트 + 메시지 렌더링
- `focusDateForMonth(year, month)` — 월 이동 시 가장 가까운 날짜 자동 선택
- `scrollToDateInList(date)` — 날짜 목록 스크롤 동기화
- `showImage(url)` — 이미지 확대 모달

설정/테마:
- `applyTheme(theme)` — light/dark/system 테마 적용
- `applyFont(font, isAutoSwitch)` — 폰트 적용, 자동 전환 관리
- `initSettings()` — 저장된 테마/폰트 로드 (localStorage)
- `updateSettingsUI()` — 설정 모달 활성 버튼 표시
- `applyLeaderFilter()` — 필터 대상 사용자 발언만 표시/전체 표시 토글

브라우저 기능 제한:
- `getBrowserCapabilityStatus()` — `File`/`Blob`/`IndexedDB`/`URL.createObjectURL` 지원 확인
- `applyBrowserCapabilityStatus(status)` — 미지원 기능 안내와 업로드 제한 상태 반영

오류 보고/진단:
- `recordDiagnosticInput(files, source)` — 파일명 원문 없이 파일 수/총 크기/확장자 분포만 기록
- `setDiagnosticStage(stage)` — 현재 처리 단계 기록
- `captureDiagnosticError(error, context)` — JS 오류/처리 실패를 안전 진단 이벤트로 기록하고 토스트 표시
- `buildDiagnosticReport(options)` — 대화 원문, 사용자명, 파일명, 첨부파일 내용 없이 마크다운 리포트 생성
- `copyDiagnosticReport()` — 진단 리포트를 클립보드에 복사
- `openIssueReportPage()` — GitHub Issue Form 버그 제보 링크 열기
- `openDiagnosticReportModal()` — 오류 보고 모달 열기

모달:
- `openModal(modalId)` / `closeModal(modalId)` — 모달 열기/닫기

유틸리티:
- `isLeader(username)` — 현재 필터 대상 사용자 여부 확인 (기본값: `채상욱 리더`)
- `escapeHtml(text)` — HTML 이스케이프
- `formatSize(bytes)` — 파일 크기 포맷 (KB/MB/GB)
- `isMobileView()` — 900px 미만 여부
- `openSidebar()` / `closeSidebar()` — 모바일 사이드바 제어
- `openLinkSidebar()` / `closeLinkSidebar()` — 모바일 링크 사이드바 제어
- `closeMobilePanels()` — 모바일 좌우 사이드바 상호 배제 및 닫기
- `parseDateTime(str)` — datetime 문자열 → Date 객체

## 전역 상태
- `messages` — 전체 파싱된 메시지 배열
- `messagesByDate` — 날짜별 메시지 그룹 (YYYY-MM-DD → [])
- `attachmentFiles` — 파일명 → Blob URL (폴더 모드)
- `attachmentEntries` — 파일명 → ZIP 엔트리 경로 (ZIP 모드)
- `zipInstance` — JSZip 인스턴스 (지연 로딩용)
- `dates` — 날짜 배열 (내림차순)
- `leaderCountByDate` — 날짜별 필터 대상 사용자 발언 수
- `currentMonth` — 현재 캘린더 월
- `selectedDate` — 선택된 날짜
- `leaderFilterActive` — 사용자 필터 상태
- `leaderFilterTarget` — 현재 필터 대상 사용자명 (기본값: `채상욱 리더`)
- `detectedPlatform` — 'ios', 'android', 'windows'
- `linkSidebar`/`linkSidebarToggle` — 오른쪽 링크 패널 DOM 상태 제어
- `diagnosticState` — 안전 진단 리포트용 처리 단계, 입력 요약, 최근 오류 이벤트

## 정규식 패턴 (PATTERNS 객체)
- `DATE_HEADER` — iOS 날짜 구분선 (`YYYY년 M월 D일 d요일`)
- `DATE_HEADER_ANDROID` — Android 날짜 줄 (`YYYY년 M월 D일 오전/오후 H:mm`, 사용자 없음)
- `DATE_HEADER_WINDOWS` — Windows 날짜 구분선
- `MESSAGE_IOS` — iOS 메시지 (24시간 + 12시간 오전/오후 두 패턴)
- `MESSAGE_ANDROID` — Android 메시지 (`YYYY년 M월 D일 오전/오후 H:mm, 사용자 : 내용`)
- `MESSAGE_WINDOWS` — Windows 메시지
- `ENTER_LEAVE` — iOS 입장/퇴장 (24시간 + 12시간 두 패턴)
- `ENTER_LEAVE_ANDROID` — Android 입장/퇴장
- `ENTER_LEAVE_WINDOWS` — Windows 입장/퇴장
- `URL` — URL 감지
- `ATTACHMENT_FILENAME_IOS` — iOS 첨부파일명 (`YYYYMMDD_HHMMSS[_n].ext`)
- `ATTACHMENT_FILENAME_ANDROID` — Android 첨부파일명 (`[0-9a-f]{64}.ext`)
- `ATTACHMENT_FILENAME_ANDROID_FILE` — Android 일반 문서 첨부파일명
- TODO: macOS 공식 패턴 확인 필요

# 진행 이력
**상세 진행 이력은 [HISTORY.md](HISTORY.md)를 참고하세요.**
