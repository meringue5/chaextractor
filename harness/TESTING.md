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
- iOS 사진/PDF 타임스탬프 매핑
- Windows 날짜 헤더, 오전/오후 메시지, 시스템 메시지 제외, 연속 텍스트 병합
- 누락 첨부파일의 비중단 처리
- 파일명/첨부 ref/사용자명 HTML escape와 `target="_blank"`의 `rel="noopener"` 렌더링

### 기본 문서/도구 검사

```bash
git diff --check
python3 harness/scripts/check_doc_drift.py
PYTHONDONTWRITEBYTECODE=1 python3 -c "from tools.parse_kakao_chat import main; print(main.__name__)"
```

`check_doc_drift.py`는 Markdown 로컬 링크, 플랫폼 지원 범위, Windows 공식 지원 문서화, JSZip 인라인 상태, 폰트 CDN 문서화, Python 도구 위치, Android 샘플 경로, parser golden 명령 문서화를 함께 검사한다.

## 예정 명령

- browser smoke: 업로드, 날짜 선택, 검색, 리더 필터, 설정, 이미지 모달, 모바일 사이드바
- performance smoke: 합성 대용량 로그 파싱 시간과 날짜 단위 렌더링 부담
