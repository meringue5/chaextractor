<!-- AGENTS.md 권장 구조
# 프로젝트 개요        — 한 줄 요약, 기술 스택, 배포 URL
# 요구사항             — 기능 요구사항 + 화면 설계 + 비기능 요구사항
# 도메인 지식          — 앱이 다루는 외부 데이터의 규칙/패턴
# 앱 콘텐츠 데이터     — 앱에 내장된 정적 콘텐츠 (URL, 텍스트 등)
# 코드 구조            — HTML/CSS/JS 컴포넌트, 함수, 상태, 패턴
# 진행 이력            — HISTORY.md 참조
-->

# 프로젝트 개요
카카오톡 오픈채팅방 대화 내역 뷰어. 단일 HTML 파일, 서버 불필요, 클라이언트 사이드 처리.
- 배포: https://meringue5.github.io/chaextractor/
- 기술: HTML + CSS + JS (단일 파일), JSZip (CDN), IndexedDB (캐시)
- 플랫폼: iOS / Android 카카오톡 내보내기 파일 모두 지원

# 요구사항

## 기능 요구사항
<!-- TODO: 사용자가 직접 작성 -->
<!--
1단계: 대화 내용 확인 → 완료
2단계: 대화 포맷 재구성 (CSV) → 완료
  - 시스템 메시지 제외
  - 연속 발화 병합 (사진/파일/이모티콘은 별도 행)
  - 타임스탬프 기반 첨부파일 매핑
2-1단계: 간이 시각화 도구 → 완료
  - 캘린더/슬라이드로 날짜별 대화 조회
  - ZIP 직접 선택 → 파싱+뷰어 한 번에
  - 채상욱 리더 하이라이트 + 스크롤 마커
3단계: 요약 추출 → 미착수
  - 날짜별 요약 파일 작성
  - 총 정리 파일 작성
4단계: 시각화 도구 → 미착수
  - 날짜별 요약 조회 + 총 정리 검색/조회
-->


## 화면 설계
<!-- TODO: 사용자가 직접 작성
각 화면(View)마다 다음을 정의:
- 명칭 (코드에서 사용할 이름)
- 진입 조건 (언제 이 화면이 보이는가)
- 주요 구성 요소
- 사용자 워크플로우 (이 화면에서 할 수 있는 것)
- 전환 (다음 화면으로 넘어가는 조건)
-->

## 비기능 요구사항
<!-- TODO: 사용자가 직접 작성 (브라우저 호환, 성능, 접근성 등)
  참고: CLAUDE.md 핵심 작업 규칙과 중복되지 않게 작성 -->

# 도메인 지식

## 카카오톡 내보내기 파일 패턴
* 대화 내용 파일명 (플랫폼별 다름)
  * **iOS**: `Talk_YYYY.M.D HH_mm-n.txt` (예: `Talk_2026.1.27 21_37-1.txt`)
    - 월/일은 한 자리일 때 0 패딩 없음, 날짜와 시간 사이 공백
  * **Android**: `KakaoTalkChats.txt` (고정 파일명!)
* 사진 및 첨부파일 (플랫폼별 패턴 다름)
  * **iOS 첨부파일**: `YYYYMMDD_HHMMSS(_n)?.(jpeg|jpg|png|webp|pdf)`
    - 이미지: `20250725_200815_1.jpeg` (번호 있음)
    - PDF: `20250922_180822.pdf` (번호 없음)
  * **Android 첨부파일**: `{64자리 hex hash}.(jpg|jpeg|png|gif|webp)`
    - 예: `5bb9f52bba8bbca2649ff696c703f29b5af20acf3b1913908a4614546640c28d.jpg`
    - 파일명에 날짜/시간 정보 없음 (순수 hash)
* 참고: 카카오톡 내보내기는 이미지와 PDF만 저장함
  * 대화에서 공유된 .html, .wav, .mp4, .zip, .xlsx 등은 내보내기에서 제외됨
  * iOS: 대화 내 "파일: {원본파일명}" 메시지의 파일명과 실제 파일명 다름
  * Android: 대화 내에 직접 파일명을 명시함 → 실제 첨부파일과 직접 매핑 가능

## 대화 메시지 패턴

### 시스템 메시지
* 첫행부터 5행까지는 제목 행 (1행: 파일명, 2행: 저장 날짜, 3-5행: 빈 줄)
* **날짜 구분선**:
  - iOS: `YYYY년 M월 D일 d요일` (요일 포함 별도 행)
  - Android: 없음! (각 메시지에 날짜+시간 포함)
  - Android에는 시간만 있는 행 존재: `YYYY년 M월 D일 오전/오후 H:mm` → 스킵 필요
* **입장/퇴장**:
  - iOS: "YYYY. M. D. HH:mm: {사용자 이름}님이 들어왔습니다."
  - Android: "YYYY년 M월 D일 오전/오후 H:mm, {사용자 이름}님이 들어왔습니다."
* "메시지가 삭제되었습니다."

### 일반 대화 (플랫폼별)
* **iOS 패턴**: `YYYY. M. D. HH:mm, {사용자 이름} : {발언 내용}`
  - 예: "2026. 1. 27. 21:37, 채상욱 리더 : 안녕하세요"
  - 파일: "YYYY. M. D. HH:mm, {사용자 이름} : 파일: {파일명}"
  - 사진: "YYYY. M. D. HH:mm, {사용자 이름} : 사진"
  - 이모티콘: "YYYY. M. D. HH:mm, {사용자 이름} : 이모티콘"
* **Android 패턴**: `YYYY년 M월 D일 오전/오후 H:mm, {사용자 이름} : {발언 내용}`
  - 예: "2026년 2월 8일 오후 3:17, 티비 보는 라이언 : 후후"
  - 파일: "YYYY년 M월 D일 오전/오후 H:mm, {사용자 이름} : 파일: {파일명}" (URL 인코딩 가능)
  - **사진**: "YYYY년 M월 D일 오전/오후 H:mm, {사용자 이름} : {64자리 hex}.jpg" (iOS의 '사진'과 다름!)
  - 이모티콘: "YYYY년 M월 D일 오전/오후 H:mm, {사용자 이름} : 이모티콘"
  - **연속 사진**: 두번째부터는 파일명만 새 줄에 나열 (사용자/시간 없음):
    ```
    2026년 2월 8일 오후 3:18, 테스터 : f5c8fbdb...jpg
    5bb9f52bba8...jpg
    f92f6c1f66...jpg
    ```

# 앱 콘텐츠 데이터

## 머니버스 꿀팁
### 개발자: 춤추는 토끼 171879
머니버스 하지 마라 15계명 https://moneybus-labs.github.io/hidden-gems/
머니버스 톡 추천 도서 https://github.com/moneybus-labs/books/blob/main/머니버스톡.md
채부심 북스 추천 도서 https://github.com/moneybus-labs/books/blob/main/채부심북스.md

### 개발자: 우드워커
액티브 ETF 구성 변화 시각화 앱 https://drive.google.com/file/d/1NIq8BKHki7ccSFCqTDEGDAxgL2iYOXDX/view

# 코드 구조: index.html

단일 HTML 파일. 구조: `<style>` → `<body>` (HTML) → `<script>` (JSZip CDN + 앱 로직)

## HTML 컴포넌트
- `#setupScreen` — 초기 화면
  - `.guide-section` — 사용 가이드 (base64 스크린샷 6장)
  - `#step1` — 파일 업로드 영역
    - `#zipBtn` / `#zipInput` — ZIP 파일 선택 (iOS)
    - `#folderBtn` / `#folderInput` — 폴더 선택 (Android, webkitdirectory)
    - `#dropZone` — 드래그앤드롭 영역
    - `#zipName` — 파일 상태 메시지
    - `#progressContainer` > `#progressFill` + `.progress-text` — 진행률 바
  - `#startBtn` — 대화 보기 시작 버튼 (처리 완료 전 hidden)
  - `#setupTipsBtn` — 꿀팁 모달 열기
  - `#heroImage` — 히어로 이미지 (처리 완료 후 표시)
- `#app` — 메인 뷰어 (초기 hidden)
  - `.sidebar` — 좌측 패널 (320px, 모바일: 86vw 슬라이드)
    - `.sidebar-header` — 제목 + 헤더 버튼들
      - `#tipsBtn` — 꿀팁 모달 (📌)
      - `#leaderFilterBtn` — 리더 필터 토글 (👑)
      - `#settingsBtn` — 설정 모달 (⚙️)
    - `#stats` — 통계 (메시지 수, 참여자)
    - `#searchInput` — 메시지 검색
    - `.calendar` — 월별 캘린더
      - `#prevMonth` / `#nextMonth` — 월 이동
      - `#monthYear` — 현재 월 표시
      - `#calendarGrid` — 7열 그리드 (.day, .day.has-messages, .day.selected)
    - `#dateList` — 날짜 목록 (.date-item, .date-item.selected)
  - `#sidebarToggle` — 모바일 햄버거 버튼 (position: fixed)
  - `#sidebarOverlay` — 모바일 배경 오버레이
  - `#chatArea` — 우측 대화 영역
    - `#scrollMarkers` — 리더 발언 위치 마커 (금색 바)
    - `.chat-header` — 날짜 제목 + 통계
      - `#chatTitle` — 날짜/요일
      - `#chatInfo` — 메시지 수, 참여자, 리더 발언 수, 사진 수
    - `#chatMessages` — 메시지 목록
- `#imageModal` — 이미지 확대 모달 (`#modalImage`, `#modalClose`)
- `#tipsModal` — 꿀팁 모달 (`.tips-group` > `.tip-link-btn`)
- `#settingsModal` — 설정 모달 (`.theme-btn`, `.font-btn`)

## CSS 주요 클래스
- 레이아웃: `.setup-screen`, `.setup-box`, `.app`, `.sidebar`, `.chat-area`
- 가이드: `.guide-section`, `.guide-row`, `.guide-item`, `.guide-step`
- 업로드: `.file-btn-group`, `.file-btn`, `.file-btn.selected`, `.drop-zone`, `.drop-zone.drag-over`
- 진행률: `.progress-container`, `.progress-container.active`, `.progress-bar`, `.fill`
- 버튼: `.start-btn`, `.header-btn`, `.header-btns`
- 캘린더: `.calendar`, `.calendar-nav`, `.calendar-grid`, `.day`, `.day.has-messages`, `.day.selected`
- 날짜목록: `.date-list`, `.date-item`, `.date-item.selected`, `.leader-ratio`
- 메시지: `.message`, `.message-bubble`, `.user-name`, `.content`, `.time`
- 리더: `.message.leader` (황금색 그라데이션), `#leaderFilterBtn.active` (금색 배경)
- 첨부파일: `.attachment`, `.attachment img`, `.file-link`, `.emoticon`, `.no-file`, `.loading-placeholder`
- 스크롤마커: `.scroll-markers`, `.scroll-marker`
- 모달: `.modal`, `.modal.active`, `.modal-overlay`, `.modal-overlay.open`, `.modal-box`, `.modal-header`, `.modal-close-btn`
- 설정: `.settings-group`, `.settings-options`, `.theme-btn`, `.font-btn`, `.theme-btn.active`, `.font-btn.active`
- 꿀팁: `.tips-group`, `.tips-group-header`, `.tips-links`, `.tip-link-btn`, `.tips-open-btn`
- 상태: `.setup-step.completed` (녹색), `.setup-step.processing` (주황), `.setup-step.error` (적색)
- 모바일: `@media (max-width: 900px)` — `.sidebar.open`, `.sidebar-overlay.active`, `.sidebar-toggle`
- 테마: `[data-theme="dark"]`, `[data-font="ridi"]` (RIDIBatang), `[data-font="neodgm"]` (NeoDunggeunmo Pro)

## JavaScript 주요 함수

파일 처리:
- `processFilesOrFolder(files)` — 파일 라우팅 (ZIP vs 폴더)
- `processZipFile(file)` — ZIP 해제, 검증, 파싱
- `processFolderFiles(files)` — 폴더 파일 처리 (Android)
- `validateChatFile(content)` — 카카오톡 대화 형식 검증
- `updateProgress(percent, text)` — 진행률 바 업데이트

파싱:
- `parseKakaoChat(content)` — 대화 파싱 (iOS/Android 정규식 분기)
- `parseMergedChatFiles(chatContents)` — 다중 대화 파일 병합 + 정렬
- `classifyContent(content)` — 메시지 유형 분류 (text/photo/emoticon/file)
- `detectPlatform(txtFilenames, attachFilenames)` — iOS/Android 감지
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
- `generateCacheKey(fileName, fileSize, lastModified)` — 캐시 키 생성

UI 렌더링:
- `initApp()` — 앱 초기화 (파일 처리 완료 후)
- `renderCalendar()` — 월별 캘린더
- `renderDateList(searchQuery)` — 날짜 목록 (검색 필터 적용)
- `renderChat(date)` — 선택된 날짜의 메시지 렌더링
- `renderScrollMarkers(positions)` — 리더 발언 마커 생성
- `selectDate(date)` — 날짜 선택 + 캘린더 하이라이트 + 메시지 렌더링
- `focusDateForMonth(year, month)` — 월 이동 시 가장 가까운 날짜 자동 선택
- `scrollToDateInList(date)` — 날짜 목록 스크롤 동기화
- `showImage(url)` — 이미지 확대 모달

설정/테마:
- `applyTheme(theme)` — light/dark/system 테마 적용
- `applyFont(font, isAutoSwitch)` — 폰트 적용, 자동 전환 관리
- `initSettings()` — 저장된 테마/폰트 로드 (localStorage)
- `updateSettingsUI()` — 설정 모달 활성 버튼 표시
- `applyLeaderFilter()` — 리더 발언만 표시/전체 표시 토글

모달:
- `openModal(modalId)` / `closeModal(modalId)` — 모달 열기/닫기

유틸리티:
- `isLeader(username)` — "채상욱 리더" 여부 확인
- `escapeHtml(text)` — HTML 이스케이프
- `formatSize(bytes)` — 파일 크기 포맷 (KB/MB/GB)
- `isMobileView()` — 900px 미만 여부
- `openSidebar()` / `closeSidebar()` — 모바일 사이드바 제어
- `parseDateTime(str)` — datetime 문자열 → Date 객체

## 전역 상태
- `messages` — 전체 파싱된 메시지 배열
- `messagesByDate` — 날짜별 메시지 그룹 (YYYY-MM-DD → [])
- `attachmentFiles` — 파일명 → Blob URL (폴더 모드)
- `attachmentEntries` — 파일명 → ZIP 엔트리 경로 (ZIP 모드)
- `zipInstance` — JSZip 인스턴스 (지연 로딩용)
- `dates` — 날짜 배열 (내림차순)
- `leaderCountByDate` — 날짜별 리더 발언 수 (사전 계산)
- `currentMonth` — 현재 캘린더 월
- `selectedDate` — 선택된 날짜
- `leaderFilterActive` — 리더 필터 상태
- `detectedPlatform` — 'ios' 또는 'android'

## 정규식 패턴 (PATTERNS 객체)
- `DATE_HEADER` — iOS 날짜 구분선 (`YYYY년 M월 D일 d요일`)
- `DATE_HEADER_ANDROID` — Android 날짜 줄 (`YYYY년 M월 D일 오전/오후 H:mm`, 사용자 없음)
- `MESSAGE_IOS` — iOS 메시지 (24시간 + 12시간 오전/오후 두 패턴)
- `MESSAGE_ANDROID` — Android 메시지 (`YYYY년 M월 D일 오전/오후 H:mm, 사용자 : 내용`)
- `ENTER_LEAVE` — iOS 입장/퇴장 (24시간 + 12시간 두 패턴)
- `ENTER_LEAVE_ANDROID` — Android 입장/퇴장
- `URL` — URL 감지
- `ATTACHMENT_FILENAME_IOS` — iOS 첨부파일명 (`YYYYMMDD_HHMMSS[_n].ext`)
- `ATTACHMENT_FILENAME_ANDROID` — Android 첨부파일명 (`[0-9a-f]{64}.ext`)

# 진행 이력
**상세 진행 이력은 [HISTORY.md](HISTORY.md)를 참고하세요.**
