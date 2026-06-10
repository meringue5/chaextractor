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
4. **macOS**: 데스크톱 내보내기 CSV 파일을 선택합니다
5. 분석이 완료되면 자동으로 대화 화면으로 전환되며, 날짜를 선택하여 대화를 복기합니다

사진이 `파일 없음`으로 보이면 카카오톡 원본 대화에서 해당 사진을 한 번 열어 기기에 내려받은 뒤, 첨부파일을 포함해 다시 내보내세요.

## 주요 기능

- **브라우저 내 처리**: Python 등 별도 설치 없이 브라우저에서 바로 분석
- **iOS / Android / Windows / macOS 지원**: 모바일 내보내기, Windows 데스크톱 TXT, macOS 데스크톱 CSV 파싱
- **월별 캘린더**: 날짜별 대화 탐색, 최신 날짜부터 표시
- **메시지 검색**: 키워드로 대화 찾기
- **사진/PDF 보기**: iOS/Android 첨부파일 인라인 표시, 클릭 시 확대/다운로드, 누락 사진은 원본 대화에서 내려받은 뒤 다시 내보내도록 안내
- **사용자 하이라이트**: 기본값 `채상욱 리더`인 필터 대상 사용자 발언을 황금색으로 강조 + 스크롤 마커로 빠르게 이동
- **사용자 필터**: 왕관 버튼에서 사용자명을 입력해 특정 사용자 발언만 모아보기
- **갈무리 TXT**: 날짜 선택 후 현재 날짜 또는 전체 대화를 LLM 요약에 붙여넣기 좋은 TXT로 복사/다운로드
- **링크 사이드바**: 채상욱 리더 필수 링크, 머니버스 꿀팁, 게임하는 판다 링크, 유용한 팁, 버그 제보 링크를 대화 화면 오른쪽에서 확인
- **오류 진단 리포트**: JS 오류와 처리 실패가 발생하면 오류 보고 창을 즉시 열고, 오류 메시지/처리 단계/파일명/경로/크기/ZIP 내부 파일/대화 파일 검증 결과와 샘플 라인을 복사하거나 TXT로 다운로드할 수 있는 리포트로 제공
- **테마 & 폰트**: 기본값 Light 테마, 새 앱 버전 배포 시 테마/폰트 저장값 1회 초기화, Light / Dark / 1995 / System 전환, 테마별 자동 폰트 전환 (Light/Dark: RIDI바탕, 1995: PJW48 이야기)
- **배포 업데이트 감지**: 새 앱 버전이 배포되면 시작 화면과 파일 처리 직전에 버전 매니페스트를 확인하고 캐시 우회 새로고침을 1회 시도
- **모바일 반응형**: 스마트폰에서도 사용 가능 (좌우 사이드바 토글, 터치 친화적 UI)
- **IndexedDB 캐시**: 같은 파일 재방문 시 빠른 로딩, 설정에서 로컬 캐시 삭제 가능
- **브라우저 호환성**: Chrome, Firefox, Edge, Safari

## 프로젝트 구조

```
chaextractor/
├── index.html           # 메인 앱 진입점 (HTML)
├── assets/og-image.png  # Open Graph 이미지
├── assets/styles/       # 앱 스타일시트
├── assets/scripts/      # 앱 JavaScript
├── assets/version.json  # 앱 버전 매니페스트
├── assets/vendor/       # 로컬 vendor JavaScript (JSZip 등)
├── assets/guide/        # 사용 가이드 스크린샷 정적 자산
├── scripts/             # 로컬 정적 서버 실행 스크립트
├── tools/               # 선택 유틸리티 (Python CSV 파서 등)
├── harness/browser/     # 선택 실행 Playwright browser smoke
├── .github/ISSUE_TEMPLATE/ # 개발자용 GitHub 버그 제보 보조 채널
├── pyproject.toml       # Python 프로젝트 설정
├── package.json         # 선택 실행 브라우저 테스트 의존성/명령
├── harness/             # 요구사항/도메인 규칙/결정/하네스 매니페스트
├── .agents/skills/      # Project-specific skill procedures
├── INSTRUCTIONS.md      # 사람/모든 LLM/에이전트용 공통 작업 진입점
├── AGENTS.md            # Codex/AGENTS.md 관례용 얇은 어댑터
├── CLAUDE.md            # Claude Code용 얇은 어댑터
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
새 배포 시 `meta[name="app-version"]`, CSS/JS query, `assets/version.json`의 `version` 값을 함께 올리면 브라우저가 시작 화면과 파일 처리 직전 최신 버전을 확인하고 캐시 우회 새로고침을 1회 시도합니다.

공식 서비스 제공 경로는 GitHub Pages입니다. 로컬 개발/검증은 아래 정적 서버 경로를 사용합니다.

## 로컬 개발/검증

현재 앱 스크립트는 ES module로 분리되어 있으므로 로컬에서 확인할 때도 정적 서버로 여는 경로를 표준으로 사용합니다. `file://`로 `index.html`을 직접 여는 방식은 일부 브라우저에서 module script 로딩이 막힐 수 있어 공식 검증 경로로 보장하지 않습니다.

macOS/Linux:

```bash
./scripts/start-local-server.sh
```

Windows PowerShell:

```powershell
.\scripts\start-local-server.ps1
```

포트를 바꾸려면 macOS/Linux에서는 첫 번째 인자를, PowerShell에서는 `-Port`를 지정합니다.

```bash
./scripts/start-local-server.sh 8080
```

```powershell
.\scripts\start-local-server.ps1 -Port 8080
```

서버가 뜨면 브라우저에서 `http://127.0.0.1:8000/`을 엽니다. Node 의존성을 설치한 환경에서는 `npm run dev`로도 같은 서버를 실행할 수 있습니다.

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
- 갈무리 TXT는 사용자가 직접 복사하거나 다운로드할 때만 생성되며, 첨부파일 내용과 이미지 base64를 포함하지 않습니다.
- 오류 진단 리포트는 오류 재현과 파싱 실패 원인 확인을 위해 파일명, ZIP 내부 경로, 후보 대화 파일의 앞부분 샘플 라인, 브라우저/처리 상태를 포함할 수 있습니다.
- 폰트 로드를 위한 CDN 요청은 발생할 수 있습니다.
- 앱은 같은 출처의 `assets/version.json`을 캐시 우회 쿼리로 확인해 새 배포 여부를 감지합니다.
- 링크 사이드바와 버그 제보 등 외부 링크는 사용자가 클릭했을 때만 열립니다.
- 버그 제보는 Google Form으로 열리며, URL 길이 제한을 피한 오류 요약이 Google Form 내용 칸에 자동 입력됩니다. 전체 진단 리포트는 앱의 오류 보고 창에서 TXT로 다운로드해 폼에 첨부할 수 있습니다.

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
