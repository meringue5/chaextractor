# 프로젝트 의도 설명
내가 참여하고 있는 카카오톡 오픈 채팅방의 지난 대화 내역으로부터 중요한 레슨과 인싸이트를 추출하고자 한다.

# 원본 파일 설명
카카오톡 오픈채팅방에서 추출해낸 대화 내역과 첨부파일을 프로젝트 디렉토리 하위 data 폴더에 넣어두었다.
* 대화 내용: 'Talk_YYYY.M.D HH_mm-n.txt' 파일에 다 들어가 있다
  * 예: `Talk_2026.1.27 21_37-1.txt`
  * 월/일은 한 자리일 때 0 패딩 없음, 날짜와 시간 사이 공백
* 사진 및 첨부파일 (플랫폼별 패턴 다름)
  * **iOS 패턴**: `YYYYMMDD_HHMMSS(_n)?.(jpeg|jpg|png|webp|pdf)`
    - 이미지: `20250725_200815_1.jpeg` (번호 있음)
    - PDF: `20250922_180822.pdf` (번호 없음)
  * **Android 패턴**: `KakaoTalk_Photo_YYYY-MM-DD-HH-MM-SS[ NNN].(jpeg|jpg|png)`
    - 이미지: `KakaoTalk_Photo_2026-02-07-18-57-46.jpeg`
    - 번호 있음: `KakaoTalk_Photo_2026-02-07-18-30-13 001.jpeg`
* 참고: 카카오톡 내보내기는 이미지와 PDF만 저장함
  * 대화에서 공유된 .html, .wav, .mp4, .zip, .xlsx 등은 내보내기에서 제외됨
  * 대화 내 "파일: {원본파일명}" 메시지의 파일명과 data 폴더의 실제 파일명은 다름

# 대화 내용 패턴
## 시스템 메시지 예시
* 첫행부터 5행까지는 제목 행 (1행: 파일명, 2행: 저장 날짜, 3-5행: 빈 줄)
* 각 날짜별로 "YYYY년 M월 D일 d요일" 형식의 한 줄로 내용이 시작돼.
* **iOS 패턴**:
  - "YYYY. M. D. HH:mm: {사용자 이름}님이 들어왔습니다."
  - "YYYY. M. D. HH:mm: {사용자 이름}님이 나갔습니다."
* **Android 패턴**:
  - "YYYY년 M월 D일 오전/오후 H:mm: {사용자 이름}님이 들어왔습니다."
  - "YYYY년 M월 D일 오전/오후 H:mm: {사용자 이름}님이 나갔습니다."
* "메시지가 삭제되었습니다."

## 일반 대화 (플랫폼별 패턴 다름)
* **iOS 패턴**: `YYYY. M. D. HH:mm, {사용자 이름} : {발언 내용}`
  - 예: "2026. 1. 27. 21:37, 채상욱 리더 : 안녕하세요"
  - 파일: "YYYY. M. D. HH:mm, {사용자 이름} : 파일: {파일명}"
  - 사진: "YYYY. M. D. HH:mm, {사용자 이름} : 사진"
  - 이모티콘: "YYYY. M. D. HH:mm, {사용자 이름} : 이모티콘"
* **Android 패턴**: `YYYY년 M월 D일 오전/오후 H:mm, {사용자 이름} : {발언 내용}`
  - 예: "2016년 2월 5일 오전 1:33, 회원님 : 공부하기"
  - 파일: "YYYY년 M월 D일 오전/오후 H:mm, {사용자 이름} : 파일: {파일명}"
  - 사진: "YYYY년 M월 D일 오전/오후 H:mm, {사용자 이름} : 사진"
  - 이모티콘: "YYYY년 M월 D일 오전/오후 H:mm, {사용자 이름} : 이모티콘"

# 할 일
## 1단계: 대화 내용 확인
* 대화 내용 파일과 기타 첨부 파일 이름 등을 확인하여 AGENTS.md 파일에 기술된 내용 패턴 및 파일명 패턴이 일치하는지 확인
## 2단계: 대화 포맷 재구성
* 대화 내용을 메시지 패턴을 고려하여 csv로 재구성하는 프로그램을 작성
* 대화 내용 중 시스템 메시지는 포함하지 않아도 좋음
* 한 사용자의 발화가 연속되는 경우 첫 발화에 줄바꿈으로 이어 붙일 것
* 단, 사진/파일/이모티콘 메시지는 별도 행으로 유지 (병합하지 않음)
* 사진/파일 메시지에 data 폴더의 실제 파일 경로 매핑 (타임스탬프 기반)
## 2-1단계: 간이 시각화 도구
* html 어플리케이션으로 캘린더 또는 슬라이드를 통해 타임라인을 이동하며 날짜별 대화 내용을 조회한다.
* 카카오톡 내보내기 ZIP 파일을 직접 선택하면 파싱과 뷰어가 한 번에 동작하도록 한다.
* 채상욱 리더의 발언을 하이라이트하고 스크롤 마커로 빠르게 찾을 수 있게 한다.
## 3단계: 요약 추출 
* 별도의 파일에 날짜별 요약을 정리한 파일을 작성한다.
* 날짜별 요약을 다시 정리하여 총 정리 파일을 작성한다.
## 4단계: 시각화 도구
* html 어플리케이션으로 캘린더 또는 슬라이드를 통해 타임라인을 이동하며 날짜별 요약을 조회하고, 총 정리를 조회하고 검색/조회하는 기능을 만든다. 

# index.html 구조

## HTML 섹션 (약 1,700줄)

| 섹션 | 라인 | ID/클래스 | 설명 |
|------|------|----------|------|
| setup-screen | ~970 | `#setupScreen` | 첫 화면 (가이드 + ZIP 선택) |
| ├ guide-section | ~970-1010 | `.guide-section` | 사용 가이드 (스크린샷 6장, base64) |
| ├ setup-step | ~1030 | `#step1` | ZIP 파일 선택 영역 |
| ├ tips-section | ~1045 | `#setupTipsSection` | 머니버스 꿀팁 (토글) |
| └ start-btn | ~1055 | `#startBtn` | 대화 보기 시작 버튼 |
| app | ~1060 | `#app` | 메인 앱 (대화 뷰어) |
| ├ sidebar | ~1060-1100 | `.sidebar` | 좌측 사이드바 |
| │ ├ sidebar-header | | `.sidebar-header` | 제목 + 통계 |
| │ ├ search-box | | `#searchInput` | 메시지 검색 |
| │ ├ calendar | | `.calendar` | 월별 캘린더 |
| │ ├ date-list | | `#dateList` | 날짜 목록 |
| │ └ tips-section | | `#sidebarTipsSection` | 꿀팁 (토글) |
| ├ sidebar-overlay | | `#sidebarOverlay` | 모바일 오버레이 |
| └ chat-area | ~1110 | `.chat-area` | 우측 대화 영역 |
|   ├ scroll-markers | | `#scrollMarkers` | 리더 발언 마커 |
|   ├ chat-header | | `.chat-header` | 날짜 제목 + 토글버튼 |
|   └ chat-messages | | `#chatMessages` | 메시지 목록 |

## CSS 구조 (~950줄)

| 영역 | 라인 | 주요 클래스 |
|------|------|------------|
| 기본 스타일 | ~1-280 | `body`, `.setup-screen`, `.setup-box` |
| 가이드 스타일 | ~100-180 | `.guide-section`, `.guide-row`, `.guide-item` |
| 버튼 스타일 | ~190-260 | `.file-btn`, `.start-btn` |
| 앱 레이아웃 | ~270-400 | `.app`, `.sidebar`, `.chat-area` |
| 캘린더 | ~300-380 | `.calendar`, `.calendar-grid`, `.day-btn` |
| 메시지 | ~400-550 | `.message`, `.message-bubble`, `.user-name` |
| 리더 하이라이트 | ~520-550 | `.message.leader` (황금색 배경) |
| 첨부파일 | ~550-620 | `.attachment`, `.lightbox` |
| 꿀팁 섹션 | ~690-790 | `.tips-section`, `.tips-toggle-btn`, `.tip-link-btn` |
| 모바일 반응형 | ~800-960 | `@media (max-width: 900px)` |

## JavaScript 구조 (~750줄)

| 영역 | 라인 | 주요 함수/변수 |
|------|------|---------------|
| DOM 요소 | ~1150-1180 | `setupScreen`, `app`, `sidebar`, etc. |
| 꿀팁 토글 | ~1180 | `.tips-toggle-btn` 이벤트 |
| ZIP 처리 | ~1190-1350 | `processZipFile()`, JSZip 사용 |
| 대화 파싱 | ~1350-1500 | `parseKakaoChat()`, 정규식 매칭 |
| 첨부파일 매핑 | ~1500-1550 | `findClosestAttachment()`, ±30분 허용 |
| 캘린더 렌더링 | ~1550-1650 | `renderCalendar()`, `renderDateList()` |
| 메시지 렌더링 | ~1650-1750 | `showMessages()`, 리더 하이라이트 |
| 검색 기능 | ~1750-1800 | `searchInput` 이벤트 |
| 라이트박스 | ~1800-1850 | 이미지 확대 보기 |
| 사이드바 토글 | ~1850-1900 | 모바일 사이드바 열기/닫기 |

## 주요 CSS 변수

```css
:root {
    --marker-width: 24px;           /* 스크롤 마커 너비 (모바일: 18px) */
    --sidebar-transition-duration: 0.25s;
    --name-column-width: 120px;     /* 사용자 이름 열 너비 */
    --message-gap: 12px;

    /* 테마 색상 변수 */
    --bg-primary: #f5f5f5;
    --bg-secondary: #ffffff;
    --bg-tertiary: #f8f9fa;
    --text-primary: #333;
    --text-secondary: #666;
    --text-muted: #999;
    --border-color: #e0e0e0;
    --chat-bg: #e5ddd5;
    --scroll-marker-bg: #f0f0f0;

    /* 폰트 변수 */
    --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Malgun Gothic", sans-serif;
}

/* 다크 테마 */
[data-theme="dark"] {
    --bg-primary: #1a1a1a;
    --bg-secondary: #2d2d2d;
    --bg-tertiary: #3d3d3d;
    --text-primary: #e0e0e0;
    --text-secondary: #b0b0b0;
    --chat-bg: #0d0d0d;
    --scroll-marker-bg: #1a1a1a;
}

/* 폰트 선택 */
[data-font="ridi"] { --font-family: "RIDIBatang", serif; }
[data-font="neodgm"] { --font-family: "NeoDunggeunmo Pro", sans-serif; }
```

## 색상 팔레트

### 라이트 테마
| 용도 | 색상 | 코드 |
|------|------|------|
| Primary (버튼) | 파란색 | `#4a90d9` |
| Primary Hover | 진한 파란색 | `#3a7bc8` |
| 리더 배경 | 황금 그라데이션 | `linear-gradient(135deg, #ffd700, #ffb347)` |
| 리더 테두리 | 금색 | `#daa520` |
| 리더 텍스트 | 어두운 금색 | `#3d3200` |
| 대화창 배경 | 베이지 | `#e5ddd5` |
| 메시지 버블 | 흰색 | `#ffffff` |

### 다크 테마
| 용도 | 색상 | 코드 |
|------|------|------|
| 배경 (primary) | 매우 어두운 회색 | `#1a1a1a` |
| 버블 배경 | 어두운 회색 | `#2d2d2d` |
| 대화창 배경 | 거의 검정 | `#0d0d0d` |
| 텍스트 | 밝은 회색 | `#e0e0e0` |

# 작업 지침
* 주요 개발: 단일 HTML 파일 (index.html) - 브라우저 기반, 서버 불필요
* 파이썬 3.12 사용 (parse_kakao_chat.py 등 보조 스크립트용)
* 구조 변경시 사용법, 구조 설명 등을 README.md에 업데이트

# 머니버스 꿀팁
## 개발자: 춤추는 토끼 171879 
머니버스 하지 마라 15계명 https://moneybus-labs.github.io/hidden-gems/
머니버스 톡 추천 도서 https://github.com/moneybus-labs/books/blob/main/머니버스톡.md
채부심 북스 추천 도서 https://github.com/moneybus-labs/books/blob/main/채부심북스.md

## 개발자: 우드워커
액티브 ETF 구성 변화 시각화 앱 https://drive.google.com/file/d/1NIq8BKHki7ccSFCqTDEGDAxgL2iYOXDX/view


# 진행상황

## 1단계: 완료 (2026-02-03)
* 상세 결과: [RESULT_STEP1.md](RESULT_STEP1.md)
* 데이터 규모: 95,786줄, 195일, 첨부파일 165개
* 발견사항:
  * 퇴장 메시지 패턴 누락 → AGENTS.md에 추가
  * 이모티콘 메시지 패턴 누락 → AGENTS.md에 추가
  * 파일명 패턴 상세화 (0패딩, 공백 등)
  * 기존 parse_kakao_chat.py는 45줄에서 중단된 미완성 상태

## 2단계: 완료 (2026-02-03, 수정)
* parse_kakao_chat.py 완성 (335줄)
* 출력: parsed_chat.csv
* 파싱 결과:
  * 메시지 수: 42,958개 (텍스트만 병합, 첨부파일은 별도 행)
  * 참여자: 824명
  * 대화 일수: 189일
  * 사진: 1,617건, 파일: 61건, 이모티콘: 219건, 링크: 1,204건
  * 첨부파일 매핑: 110건 (이미지 89건, PDF 21건)
* CSV 컬럼: datetime, date, time, user, message_type, content, has_attachment, attachment_type, attachment_ref, attachment_path, has_link, word_count
* 변경사항:
  * 사진/파일/이모티콘은 병합하지 않고 별도 행으로 유지
  * attachment_path 컬럼 추가 (data 폴더 내 실제 파일 경로)
  * 타임스탬프 기반 파일 매핑 (±30분 허용)

## 2-1단계: 완료 (2026-02-03 ~ 02-04, ZIP 통합 + 가이드 + 모바일)
* index.html 생성 (단일 HTML 파일, 서버 불필요, ~1.8MB)
* **ZIP 통합**: 카카오톡 내보내기 ZIP 파일을 직접 선택하면 파싱과 뷰어가 한 번에 동작
  * Python 스크립트 실행 불필요
  * JSZip 라이브러리 사용 (CDN)
  * 브라우저 내 대화 파싱 (JavaScript 포팅)
  * 첨부파일 Blob URL로 메모리 내 로딩
  * 진행 상태 프로그레스바 표시
* **사용 가이드 내장**: 스크린샷 6장을 base64로 HTML에 포함
  * 카카오톡 내보내기 방법 (4단계)
  * 뷰어 사용 방법 (2단계)
  * 마우스 오버 시 이미지 확대
* **모바일 반응형 지원** (PR #1~#12)
  * 반응형 레이아웃 (max-width: 900px 미디어쿼리)
  * 사이드바 토글 버튼 (터치 친화적)
  * 채팅 버블 너비 최적화
  * 가이드 스크린샷 캐러셀 (모바일용)
  * 스크롤 마커 레이아웃 조정
* 기능:
  * ZIP 파일 선택 (카카오톡 내보내기 파일)
  * 월별 캘린더 네비게이션
  * 날짜별 대화 목록
  * 메시지 검색 기능
  * 사진 표시 및 확대 보기
  * PDF/파일 링크
* UI 특징:
  * 채상욱 리더 발언 하이라이트 (황금색 배경)
  * 채상욱 리더 이름에 왕관 이모지 표시
  * 사용자 이름은 말풍선 왼쪽에 별도 배치
  * 스크롤 마커로 리더 발언 위치 표시 및 빠른 이동
* 배포: GitHub Pages 등 정적 호스팅 가능 (서버 불필요, 클라이언트 사이드 처리)
* 사용법: index.html 더블클릭 → ZIP 파일 선택 → 자동 파싱 후 대화 보기

## 2-1-1단계: UI/UX 개선 (2026-02-06)
* **테마 기반 폰트 자동 전환** ([index.html:1501-1531](d:\workspace\chae\index.html#L1501-L1531))
  * Light 테마 → RIDI바탕 자동 적용
  * Dark 테마 → Neo둥근모Pro 자동 적용
  * System 테마 → 시스템 밝기 따라 자동 전환
  * 수동 폰트 선택 시 자동 전환 비활성화 (localStorage: `fontAutoSwitch`)
  * 시스템 테마 변경 감지 및 자동 반영
* **모바일 사이드바 개선** ([index.html:1123-1144](d:\workspace\chae\index.html#L1123-L1144), [2682-2703](d:\workspace\chae\index.html#L2682-L2703))
  * 토글 버튼 위치 고정 (`position: fixed`, 스크롤 시 화면 상단에 고정)
  * 사이드바 열림 시 배경 스크롤 차단 (`overflow: hidden`)
  * 사이드바 닫힘 시 스크롤 복원
  * 모바일 전용 동작 (900px 이하에서만 적용)
* **모달 z-index 최적화** ([index.html:757](d:\workspace\chae\index.html#L757), [927](d:\workspace\chae\index.html#L927))
  * 모든 모달을 최상위 레이어로 배치 (`z-index: 9999`)
  * 모달이 토글 버튼 및 기타 요소보다 위에 표시
* **날짜 정렬 개선** ([index.html:2061](d:\workspace\chae\index.html#L2061), [1710](d:\workspace\chae\index.html#L1710), [1838](d:\workspace\chae\index.html#L1838))
  * 날짜 목록을 최신 날짜부터 표시 (내림차순)
  * 캐시 로드 시에도 내림차순 유지 (`.reverse()` 적용)
  * 사용자 경험 개선: 최신 대화를 먼저 확인 가능
* **브라우저 호환성 개선**
  * **MS Edge 특화 최적화** ([index.html:2357-2364](d:\workspace\chae\index.html#L2357-L2364))
    - 캘린더 날짜 파싱 개선 (ISO 8601 → 수동 컴포넌트 파싱)
    - 날짜 목록 자동 스크롤 동기화 (`scrollToDateInList()`)
  * **Firefox 성능 최적화** ([index.html:2543](d:\workspace\chae\index.html#L2543))
    - 스크롤 동작을 `smooth` → `auto`로 변경
    - 즉각적인 스크롤 반응 (성능 개선)
* **Sidebar Overlay 안정성** ([index.html:815-821](d:\workspace\chae\index.html#L815-L821))
  * `pointer-events` 속성으로 비활성 시 클릭 차단
  * 검은 패널 잔상 방지

# 테스트 절차

## 브라우저 성능 테스트
1. 브라우저에서 `index.html` 열기
2. 개발자 도구 열기 (F12)
3. Console 탭 선택
4. 대화 백업 선택
5. 콘솔에서 처리 시간 확인:
   ```
   ⏱️ ZIP 처리 시작
   ⏱️ 첨부파일 165개 로드: 7942ms
   ⏱️ 총 처리 시간: 12567ms
   ```

## Node.js 성능 비교 테스트
순차 처리와 병렬 처리의 성능을 비교하는 테스트:

```bash
# 1. 의존성 설치
npm init -y
npm install jszip

# 2. 테스트 스크립트 작성 (perf-test.js)
# 3. 실행
node perf-test.js

# 4. 정리
rm -rf node_modules package.json package-lock.json perf-test.js
```

### 테스트 스크립트 (perf-test.js)
```javascript
const JSZip = require('jszip');
const fs = require('fs');

async function testSequential(zip, entries) {
    const start = performance.now();
    for (const entry of entries) {
        await zip.files[entry].async('nodebuffer');
    }
    return performance.now() - start;
}

async function testParallel(zip, entries) {
    const start = performance.now();
    await Promise.all(entries.map(e => zip.files[e].async('nodebuffer')));
    return performance.now() - start;
}
```

# 테스트 이력

## 2026-02-05: 첨부파일 로드 성능 테스트
* **테스트 환경**: Node.js (Windows)
* **테스트 파일**: `Kakaotalk_Chat_[채상욱의 머니버스] 회원전용 커뮤니티_20260127_215546.zip`
  * 파일 크기: 221MB
  * 총 파일 수: 166개
  * 첨부파일: 165개 (이미지, PDF)
* **테스트 결과**:
  | 방식 | 처리 시간 | 비고 |
  |------|----------|------|
  | 순차 처리 | 7,942ms | **채택** |
  | 병렬 처리 | 10,075ms | 27% 느림 |
* **결론**:
  * 병렬 처리(Promise.all)가 오히려 27% 느림
  * ZIP 내부 데이터 읽기는 CPU 바운드 작업
  * 순차 처리 유지 + 프로그레스 바 점진적 표시
* **적용 사항**:
  * 첨부파일 로드: 순차 처리 유지
  * 리더 비중 계산: 파싱 시점에 사전 계산 (leaderCountByDate)

## 2-1-2단계: Android 플랫폼 지원 (2026-02-07)
* **Android 폴더 업로드 개선**
  * `multiple` 속성 추가: 여러 파일 동시 선택 가능
  * `accept="*/*"` 속성 추가: 모든 파일 타입 허용
  * 안내 문구 개선: Android 사용자를 위한 전체선택 가이드
  * 배포: commit f514d88 (2026-02-07)
* **Android 첨부파일 패턴 지원**
  * iOS 패턴: `YYYYMMDD_HHMMSS(_n)?.(jpeg|jpg|png|webp|pdf)`
  * Android 패턴: `KakaoTalk_Photo_YYYY-MM-DD-HH-MM-SS[ NNN].(jpeg|jpg|png)`
  * `parseAttachmentFilename()` 함수: 두 패턴 자동 감지 및 파싱
  * `isAttachmentFile()` 함수: 두 패턴 필터링
* **Android 대화 메시지 패턴 지원**
  * iOS 패턴: `YYYY. M. D. HH:mm, 사용자 : 내용`
  * Android 패턴: `YYYY년 M월 D일 오전/오후 H:mm, 사용자 : 내용`
  * `MESSAGE_IOS` / `MESSAGE_ANDROID` 정규식 분리
  * 오전/오후 → 24시간 형식 자동 변환
  * `ENTER_LEAVE_ANDROID` 패턴: 입장/퇴장 시스템 메시지
* **UI 버그 수정**
  * guide-step 다크 테마 지원 (CSS 변수 사용)
  * 리스트 불릿 위치 수정 (`padding-left` 추가)
  * 다크 테마에서 텍스트 가독성 개선
* **참고 자료**
  * GitHub 프로젝트: https://github.com/uoneway/kakaotalk_msg_preprocessor
  * Android 샘플: tests/datasets/KakaoTalk_export_file_exmple_android_kr.txt
* **테스트 대기**
  * 실제 Android 데이터로 최종 검증 예정
  * Samsung Remote Test Lab 또는 지인 데이터 활용

