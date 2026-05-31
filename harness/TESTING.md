# chaextractor 하네스 검증 명령

작성일: 2026-05-17

## 현재 사용 가능한 명령

### Parser golden

`assets/scripts/app.js`의 실제 파서 함수를 Node VM에서 호출해 fixture expected와 비교한다.

```bash
python3 harness/scripts/run_parser_golden.py
```

현재 케이스:

- `android-sample`: `test/dataset/android/`의 실제 ZIP 샘플
- `android-files`: `test/fixtures/android-files/`의 Android 일반 파일/PDF fixture
- `ios-minimal`: `test/fixtures/ios-minimal/`의 최소 iOS fixture
- `ios-missing-photo-guidance`: 누락 사진의 사용자 복구 안내 렌더링 fixture
- `windows-minimal`: `test/fixtures/windows-minimal/`의 최소 Windows 데스크톱 TXT fixture
- `windows-attachments-unsupported`: Windows 첨부파일 매핑 미지원 범위 고정 fixture
- `macos-csv`: `test/fixtures/macos-csv/`의 최소 macOS 데스크톱 CSV fixture
- `security-xss`: 파일명/첨부 ref/사용자명 렌더링 escape fixture

검증 범위:

- 메시지 수
- 날짜 수와 날짜 목록
- 메시지 타입별 개수
- 연속 텍스트 병합
- 시스템 메시지 제외
- Android hash 이미지와 연속 사진 줄
- Android 일반 파일/PDF URL 인코딩/디코딩 매핑
- iOS 사진/PDF 타임스탬프 매핑
- 누락 사진 자리의 원본 대화 다운로드/재내보내기 안내 렌더링
- Windows 날짜 헤더, 오전/오후 메시지, 시스템 메시지 제외, 연속 텍스트 병합
- Windows 첨부파일 direct mapping 미지원 범위
- macOS CSV `Date,User,Message` 헤더, 24시간 timestamp, 삭제/관리자 숨김 시스템 행 제외, quoted multiline, 연속 텍스트 병합
- 누락 첨부파일의 비중단 처리
- 파일명/첨부 ref/사용자명 HTML escape와 `target="_blank"`의 `rel="noopener"` 렌더링

### 기본 문서/도구 검사

```bash
git diff --check
python3 harness/scripts/check_doc_drift.py
python3 harness/scripts/check_modal_escape.py
python3 harness/scripts/check_cache_date_sort.py
python3 harness/scripts/check_ui_smoke.py
python3 harness/scripts/check_capability_notice.py
python3 harness/scripts/check_cache_privacy.py
python3 harness/scripts/check_diagnostic_report.py
python3 harness/scripts/check_performance_smoke.py
PYTHONDONTWRITEBYTECODE=1 python3 -c "from tools.parse_kakao_chat import main; print(main.__name__)"
```

`check_doc_drift.py`는 Markdown 로컬 링크, 플랫폼 지원 범위, Windows 공식 지원 문서화, 앱 JS/JSZip 로컬 vendor/버전 매니페스트 상태, 폰트 CDN 문서화, Python 도구 위치, Android 샘플 경로, parser golden 명령 문서화를 함께 검사한다.

`check_modal_escape.py`는 Node VM에서 실제 앱 모달 함수를 호출해 이미지/설정/갈무리/오류 보고 모달이 Escape 처리 후 닫히는지 검사한다.

`check_cache_date_sort.py`는 캐시 hit 복원 시 날짜 목록이 항상 최신순으로 정규화되는지 검사한다.

`check_ui_smoke.py`는 Node VM에서 실제 앱 UI 함수를 호출해 fixture 로드, 날짜 선택, 검색 날짜 필터, 사용자 지정 필터, 갈무리 TXT 생성, 테마/폰트 설정, 설정 모달, 좌우 사이드바 열기/닫기와 모바일 상호 배제를 검사한다. Playwright 같은 실제 브라우저 smoke는 의존성을 도입할 때 이 명령 위에 확장한다.

`check_capability_notice.py`는 `File`/`Blob`/`IndexedDB`/`URL.createObjectURL` 지원 여부에 따라 안내 문구와 업로드 제한 상태가 올바른지 검사한다.

`check_cache_privacy.py`는 새 업로드 전 Blob URL 해제, 런타임 첨부 상태 초기화, 설정 모달 캐시 삭제가 호출하는 IndexedDB clear 경로를 검사한다.

`check_diagnostic_report.py`는 JS 오류/처리 실패 진단 리포트가 생성되고, 원본 대화 파일명/첨부파일명이 리포트와 Google Form 사전입력 URL에 포함되지 않는지 검사한다.

`check_performance_smoke.py`는 합성 Android 로그 1만 메시지를 실제 앱 파서로 파싱하고 3초 예산 안에 메시지/날짜 수가 맞는지 검사한다.

50만 메시지 수동 측정:

```bash
python3 harness/scripts/check_performance_smoke.py --messages 500000 --budget-ms 10000
```

### 선택: 실제 브라우저 smoke

Playwright smoke는 정적 서버로 저장소 루트의 `index.html`을 열고 실제 브라우저에서 다음을 확인한다.

- CSS, JSZip vendor, 앱 JS, 가이드 이미지 정적 자산 로드
- `assets/version.json` 로드와 새 버전 감지 시 캐시 우회 새로고침
- Windows TXT fixture 업로드와 시작 버튼 흐름
- 날짜 목록, 날짜 선택, 검색 날짜 필터, 갈무리 TXT 모달, 사용자 지정 필터, 설정 모달 Escape 닫기, 데스크톱 링크 사이드바
- 모바일 viewport의 좌우 사이드바 토글, 상호 배제, 오버레이 닫기

초기 설치:

```bash
npm install
npm run test:browser:install
```

실행:

```bash
npm run test:browser
```

헤드풀 확인:

```bash
npm run test:browser:headed
```

## 예정 명령

- 날짜 단위 렌더링 부담을 별도 측정하는 실제 브라우저 성능 smoke
