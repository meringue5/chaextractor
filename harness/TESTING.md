# chaextractor 하네스 검증 명령

작성일: 2026-05-17

## 현재 사용 가능한 명령

### Parser golden

`index.html`에 포함된 실제 파서 함수를 Node VM에서 호출해 fixture expected와 비교한다.

```bash
python3 harness/scripts/run_parser_golden.py
```

현재 케이스:

- `android-sample`: `test/dataset/android/`의 실제 ZIP 샘플
- `android-files`: `test/fixtures/android-files/`의 Android 일반 파일/PDF fixture
- `ios-minimal`: `test/fixtures/ios-minimal/`의 최소 iOS fixture
- `windows-minimal`: `test/fixtures/windows-minimal/`의 최소 Windows 데스크톱 TXT fixture
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
- Windows 날짜 헤더, 오전/오후 메시지, 시스템 메시지 제외, 연속 텍스트 병합
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
PYTHONDONTWRITEBYTECODE=1 python3 -c "from tools.parse_kakao_chat import main; print(main.__name__)"
```

`check_doc_drift.py`는 Markdown 로컬 링크, 플랫폼 지원 범위, Windows 공식 지원 문서화, JSZip 인라인 상태, 폰트 CDN 문서화, Python 도구 위치, Android 샘플 경로, parser golden 명령 문서화를 함께 검사한다.

`check_modal_escape.py`는 Node VM에서 실제 앱 모달 함수를 호출해 이미지/꿀팁/설정 모달이 Escape 처리 후 닫히는지 검사한다.

`check_cache_date_sort.py`는 캐시 hit 복원 시 날짜 목록이 항상 최신순으로 정규화되는지 검사한다.

`check_ui_smoke.py`는 Node VM에서 실제 앱 UI 함수를 호출해 fixture 로드, 날짜 선택, 검색 날짜 필터, 리더 필터, 테마/폰트 설정, 설정 모달, 사이드바 열기/닫기를 검사한다. Playwright 같은 실제 브라우저 smoke는 의존성을 도입할 때 이 명령 위에 확장한다.

`check_capability_notice.py`는 `File`/`Blob`/`IndexedDB`/`URL.createObjectURL` 지원 여부에 따라 안내 문구와 업로드 제한 상태가 올바른지 검사한다.

`check_cache_privacy.py`는 새 업로드 전 Blob URL 해제, 런타임 첨부 상태 초기화, 설정 모달 캐시 삭제가 호출하는 IndexedDB clear 경로를 검사한다.

## 예정 명령

- performance smoke: 합성 대용량 로그 파싱 시간과 날짜 단위 렌더링 부담
