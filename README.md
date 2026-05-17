# 채상욱의 머니버스 대화 뷰어

카카오톡 오픈채팅방 대화 내역을 브라우저에서 바로 보는 뷰어입니다.
대화 원문과 첨부파일은 서버 업로드 없이 브라우저에서 처리합니다.

**배포**: <https://meringue5.github.io/chaextractor/>

## 사용법

### Step 1: 카카오톡에서 대화 내보내기

1. 오픈채팅방에서 설정 메뉴(⚙️)로 들어갑니다
2. 대화내용 내보내기를 선택합니다
3. 모든 메시지 저장하기를 선택합니다
4. 저장된 파일을 PC로 전송합니다

### Step 2: 뷰어에서 대화 보기

1. **iOS**: ZIP 파일을 선택합니다
2. **Android**: 폴더를 선택하거나, 압축 해제 후 파일을 전체 선택합니다
3. **Windows**: 데스크톱 내보내기 TXT 파일을 선택합니다
4. 분석이 완료되면 날짜를 선택하여 대화를 복기합니다

## 주요 기능

- **브라우저 내 처리**: Python 등 별도 설치 없이 브라우저에서 바로 분석
- **iOS / Android / Windows 지원**: 모바일 내보내기와 Windows 데스크톱 텍스트 내보내기 파싱
- **월별 캘린더**: 날짜별 대화 탐색, 최신 날짜부터 표시
- **메시지 검색**: 키워드로 대화 찾기
- **사진/PDF 보기**: iOS/Android 첨부파일 인라인 표시, 클릭 시 확대/다운로드
- **사용자 하이라이트**: 기본값 `채상욱 리더`인 필터 대상 사용자 발언을 황금색으로 강조 + 스크롤 마커로 빠르게 이동
- **사용자 필터**: 왕관 버튼에서 사용자명을 입력해 특정 사용자 발언만 모아보기
- **링크 사이드바**: 머니버스 꿀팁, 유용한 팁, 버그 제보 링크를 대화 화면 오른쪽에서 확인
- **오류 진단 리포트**: JS 오류와 처리 실패가 발생하면 대화 원문 없이 리포트 초안을 자동 작성/복사하고 GitHub 이슈로 제보
- **테마 & 폰트**: Light / Dark / System 테마, 테마별 자동 폰트 전환 (RIDI바탕 / Neo둥근모Pro)
- **모바일 반응형**: 스마트폰에서도 사용 가능 (좌우 사이드바 토글, 터치 친화적 UI)
- **IndexedDB 캐시**: 같은 파일 재방문 시 빠른 로딩, 설정에서 로컬 캐시 삭제 가능
- **브라우저 호환성**: Chrome, Firefox, Edge, Safari

## 프로젝트 구조

```
chaextractor/
├── index.html           # 메인 앱 진입점 (HTML)
├── assets/og-image.png  # Open Graph 및 앱 hero 이미지
├── assets/styles/       # 앱 스타일시트
├── assets/scripts/      # 앱 JavaScript
├── assets/vendor/       # 로컬 vendor JavaScript (JSZip 등)
├── assets/guide/        # 사용 가이드 스크린샷 정적 자산
├── tools/               # 선택 유틸리티 (Python CSV 파서 등)
├── harness/browser/     # 선택 실행 Playwright browser smoke
├── .github/ISSUE_TEMPLATE/ # GitHub 버그 제보 Issue Form
├── pyproject.toml       # Python 프로젝트 설정
├── package.json         # 선택 실행 브라우저 테스트 의존성/명령
├── harness/             # 요구사항/도메인 규칙/결정/하네스 매니페스트
├── .agents/skills/      # Project-specific skill procedures
├── CLAUDE.md            # Claude Code용 AGENTS.md 포워딩 문서
├── AGENTS.md            # AI 에이전트 진입점 (하네스/코드 구조)
├── HISTORY.md           # 진행 이력
├── LICENSE              # MIT License
└── README.md            # 이 파일
```

## 요구사항

- 최신 웹 브라우저 (Chrome, Firefox, Edge, Safari)
- 모바일 브라우저 지원 (iOS Safari, Android Chrome)

## 배포

저장소 루트의 `index.html`과 `assets/` 정적 파일을 함께 호스팅하면 됩니다.
GitHub Pages처럼 저장소 루트를 그대로 배포하는 방식이면 별도 빌드 없이 동작합니다.
JSZip은 `assets/vendor/jszip-3.10.1.min.js` 로컬 vendor 파일로 제공되며, 폰트는 CDN에서 로드됩니다.

오프라인으로 열 때도 `index.html`과 `assets/` 디렉터리를 함께 보관하면 됩니다.

## 선택: 브라우저 smoke 테스트

실제 브라우저에서 정적 자산 로드, Windows TXT 업로드, 검색/사용자 필터/설정 모달, 모바일 사이드바를 확인하려면:

```bash
npm install
npm run test:browser:install
npm run test:browser
```

이 테스트는 개발 검증용이며, 앱 배포에는 빌드 단계가 필요하지 않습니다.

## 개인정보와 외부 요청

- 대화 원문, 첨부파일, 파싱 결과는 자동으로 외부 서버에 전송하지 않습니다.
- 오류 진단 리포트는 대화 원문, 사용자명, 파일명, 첨부파일 내용을 자동으로 포함하지 않습니다.
- JS 오류와 처리 실패가 감지되면 리포트 모달을 열고 클립보드 복사를 시도하지만, 외부 전송은 사용자가 `제보하기`를 눌렀을 때만 시작됩니다.
- 폰트 로드를 위한 CDN 요청은 발생할 수 있습니다.
- 링크 사이드바와 버그 제보 등 외부 링크는 사용자가 클릭했을 때만 열립니다.
- 버그 제보는 GitHub Issue Form으로 열리며, 캡처를 첨부할 때는 대화 내용과 이름을 가려야 합니다.

## 대안: Python CSV 파서

브라우저 뷰어 대신 CSV 파일로 추출해야 하는 경우:

```bash
python3 tools/parse_kakao_chat.py [입력파일] [출력파일]
```

- Python 3.12 이상 필요
- iOS 대화 파일만 지원
- 설치형 CLI가 필요하면 `uv run parse-chat [입력파일] [출력파일]`로도 실행할 수 있습니다.

### CSV 출력 컬럼

| 컬럼 | 설명 |
|------|------|
| datetime | 날짜시간 (YYYY-MM-DD HH:mm) |
| date | 날짜 (YYYY-MM-DD) |
| time | 시간 (HH:mm) |
| user | 사용자 이름 |
| message_type | text, photo, file, emoticon |
| content | 메시지 내용 |
| has_attachment | 첨부파일 유무 |
| attachment_type | 첨부파일 유형 (image, pdf) |
| attachment_ref | 대화 내 첨부파일 참조 텍스트 |
| attachment_path | 실제 파일 경로 |
| has_link | URL 포함 여부 |
| word_count | 단어 수 |
