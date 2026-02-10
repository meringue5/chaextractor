# 채상욱의 머니버스 대화 뷰어

카카오톡 오픈채팅방 대화 내역을 브라우저에서 바로 보는 뷰어입니다.
서버 업로드 없이 클라이언트에서만 처리하므로 개인정보가 외부로 전송되지 않습니다.

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
3. 분석이 완료되면 날짜를 선택하여 대화를 복기합니다

## 주요 기능

- **브라우저 내 처리**: Python 등 별도 설치 없이 브라우저에서 바로 분석
- **iOS / Android 지원**: 두 플랫폼의 내보내기 형식 모두 파싱
- **월별 캘린더**: 날짜별 대화 탐색, 최신 날짜부터 표시
- **메시지 검색**: 키워드로 대화 찾기
- **사진/PDF 보기**: 첨부파일 인라인 표시, 클릭 시 확대/다운로드
- **리더 하이라이트**: 채상욱 리더 발언을 황금색으로 강조 + 스크롤 마커로 빠르게 이동
- **리더 필터**: 리더 발언만 모아보기
- **테마 & 폰트**: Light / Dark / System 테마, 테마별 자동 폰트 전환 (RIDI바탕 / Neo둥근모Pro)
- **모바일 반응형**: 스마트폰에서도 사용 가능 (사이드바 토글, 터치 친화적 UI)
- **IndexedDB 캐시**: 같은 파일 재방문 시 빠른 로딩
- **브라우저 호환성**: Chrome, Firefox, Edge, Safari

## 프로젝트 구조

```
chaextractor/
├── index.html           # 메인 앱 (HTML + CSS + JS 단일 파일, ~2MB)
├── parse_kakao_chat.py  # Python CSV 파서 (대안, 선택사항)
├── pyproject.toml       # Python 프로젝트 설정
├── og-image.png         # Open Graph 이미지
├── CLAUDE.md            # AI 에이전트 작업 지침
├── AGENTS.md            # 프로젝트 명세 (도메인 지식, 코드 구조, 패턴)
├── HISTORY.md           # 진행 이력
├── LICENSE              # MIT License
└── README.md            # 이 파일
```

## 요구사항

- 최신 웹 브라우저 (Chrome, Firefox, Edge, Safari)
- 모바일 브라우저 지원 (iOS Safari, Android Chrome)

## 배포

`index.html` 하나만 정적 호스팅(GitHub Pages, Netlify 등)에 올리면 됩니다.
외부 의존성은 JSZip CDN 하나뿐입니다.

## 대안: Python CSV 파서

브라우저 뷰어 대신 CSV 파일로 추출해야 하는 경우:

```bash
python parse_kakao_chat.py [입력파일] [출력파일]
```

- Python 3.12 이상 필요
- iOS 대화 파일만 지원

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
