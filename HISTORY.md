# 프로젝트 진행 이력

## 1단계: 데이터 확인 (2026-02-03)
* 상세 결과: `RESULT_STEP1.md` (현재 저장소에는 미포함)
* 데이터 규모: 95,786줄, 195일, 첨부파일 165개
* 발견사항:
  * 퇴장 메시지 패턴 누락 → AGENTS.md에 추가
  * 이모티콘 메시지 패턴 누락 → AGENTS.md에 추가
  * 파일명 패턴 상세화 (0패딩, 공백 등)
  * 기존 parse_kakao_chat.py는 45줄에서 중단된 미완성 상태

## 2단계: 대화 파싱 CSV 변환 (2026-02-03)
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

## 2-1단계: 뷰어 앱 개발 (2026-02-03 ~ 02-04)
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
* 배포: GitHub Pages (서버 불필요, 클라이언트 사이드 처리)
* 사용법: index.html 더블클릭 → ZIP 파일 선택 → 자동 파싱 후 대화 보기

## 2-1-1단계: UI/UX 개선 (2026-02-06)
* **테마 기반 폰트 자동 전환**
  * Light 테마 → RIDI바탕 자동 적용
  * Dark 테마 → Neo둥근모Pro 자동 적용
  * System 테마 → 시스템 밝기 따라 자동 전환
  * 수동 폰트 선택 시 자동 전환 비활성화 (localStorage: `fontAutoSwitch`)
  * 시스템 테마 변경 감지 및 자동 반영
* **모바일 사이드바 개선**
  * 토글 버튼 위치 고정 (`position: fixed`, 스크롤 시 화면 상단에 고정)
  * 사이드바 열림 시 배경 스크롤 차단 (`overflow: hidden`)
  * 사이드바 닫힘 시 스크롤 복원
  * 모바일 전용 동작 (900px 이하에서만 적용)
* **모달 z-index 최적화**
  * 모든 모달을 최상위 레이어로 배치 (`z-index: 9999`)
  * 모달이 토글 버튼 및 기타 요소보다 위에 표시
* **날짜 정렬 개선**
  * 날짜 목록을 최신 날짜부터 표시 (내림차순)
  * 캐시 로드 시에도 내림차순 유지
  * 사용자 경험 개선: 최신 대화를 먼저 확인 가능
* **브라우저 호환성 개선**
  * MS Edge: 캘린더 날짜 파싱 개선, 날짜 목록 자동 스크롤 동기화
  * Firefox: 스크롤 동작을 `smooth` → `auto`로 변경 (성능 개선)
* **Sidebar Overlay 안정성**
  * `pointer-events` 속성으로 비활성 시 클릭 차단
  * 검은 패널 잔상 방지

## 2-1-2단계: Android 플랫폼 지원 (2026-02-07 ~ 02-08)
* **Android 폴더 업로드 개선** (commit f514d88)
  * `multiple` 속성 추가: 여러 파일 동시 선택 가능
  * `accept="*/*"` 속성 추가: 모든 파일 타입 허용
  * 안내 문구 개선: Android 사용자를 위한 전체선택 가이드
* **Android 대화 메시지 패턴 지원**
  * iOS 패턴: `YYYY. M. D. HH:mm, 사용자 : 내용`
  * Android 패턴: `YYYY년 M월 D일 오전/오후 H:mm, 사용자 : 내용`
  * `MESSAGE_IOS` / `MESSAGE_ANDROID` 정규식 분리
  * 오전/오후 → 24시간 형식 자동 변환
  * `ENTER_LEAVE_ANDROID` 패턴: 입장/퇴장 시스템 메시지
* **UI 버그 수정**
  * guide-step 다크 테마 지원 (CSS 변수 사용)
  * 리스트 불릿 위치 수정 (`padding-left` 추가)
* **Android 실제 데이터 분석 (2026-02-08)**: 샘플 확보. 현재 tracked 샘플 경로는 `test/dataset/android/`
  * 대화 파일명: `KakaoTalkChats.txt` (고정, iOS와 다름!)
  * 첨부파일명: **64자리 hex hash** (기존에 잘못 추정한 `KakaoTalk_Photo_...` 아님)
  * 사진 참조: 대화 내에 hash 파일명 직접 명시 (iOS의 '사진' 텍스트와 다름)
  * 연속 사진: 두번째부터 파일명만 줄바꿈으로 나열
  * Android 날짜 구분선: `YYYY년 M월 D일 오전/오후 H:mm` (요일 없는 시간만 있는 줄)
  * 플랫폼 감지: txt 파일명 우선, 보조로 첨부파일명 패턴 사용
  * `detectedPlatform` 전역 변수로 처리 분기
  * 첨부파일 매핑: iOS=날짜 기반 탐색, Android=attachment_ref로 직접 매핑

## 2-1-3단계: 하네스 검토 (2026-05-17)
* 상세 결과: [harness/reviews/2026-05-17.md](harness/reviews/2026-05-17.md)
* 검토 대상:
  * `AGENTS.md`, `CLAUDE.md`, `README.md`, `HISTORY.md`의 문서 약속
  * `index.html`, `tools/parse_kakao_chat.py`의 실제 구현
  * `test/dataset/android/`의 Android 실제 ZIP 샘플
* 주요 판정:
  * 실행 가능한 자동 테스트 하네스는 아직 없음
  * Android 실제 샘플은 있으나 golden expected JSON이 없음
  * iOS 최소 fixture와 브라우저 smoke 테스트가 없음
  * 문서에는 Windows가 TODO이나 `index.html`에는 Windows 후보 파서가 일부 구현되어 있음
  * 검색 하이라이트, Escape 모달 닫기, 캐시 날짜 정렬 등 문서-구현 드리프트가 확인됨
* 권장 다음 단계:
  * Parser golden harness 추가
  * 문서 드리프트 checker 추가
  * Playwright 기반 browser smoke 추가
  * `chaextractor-maintainer` 로컬 스킬은 하네스 명령 확정 후 작성
* 추가 보강:
  * `/harness` 디렉터리 추가
  * [harness/MANIFEST.md](harness/MANIFEST.md)에 표준/요구사항/구현-only/미결정 항목 분류
  * [harness/REQUIREMENTS.md](harness/REQUIREMENTS.md)에 기존 AGENTS 요구사항을 하네스 정본으로 이관
  * [harness/DOMAIN_RULES.md](harness/DOMAIN_RULES.md)에 플랫폼별 내보내기 규칙과 파싱 불변식 이관
  * [harness/DECISIONS.md](harness/DECISIONS.md)에 HISTORY의 반복 참조용 기술/제품 결정 정리
  * 개인정보 경계, 외부 네트워크 표면, XSS 입력 신뢰 경계, 캐시 정책 등 상위 표준 공백 확인
  * 검토 보고서를 `harness/reviews/2026-05-17.md`로 이동해 루트 Markdown을 입구 문서 중심으로 정리
  * 보조 Python CSV 파서를 `tools/parse_kakao_chat.py`로 이동해 본 앱(`index.html`)과 선택 유틸의 경계를 명확화
  * [harness/BACKLOG.md](harness/BACKLOG.md)에 하네스 리뷰의 미반영 실행 과제와 우선순위 이관
  * [.agents/skills/chaextractor-maintainer/SKILL.md](.agents/skills/chaextractor-maintainer/SKILL.md), [.agents/skills/chaextractor-tester/SKILL.md](.agents/skills/chaextractor-tester/SKILL.md) project-specific 스킬 추가
  * `AGENTS.md`에 스킬 위치, 작업 라우팅, 수동 적용 절차 안내 추가
  * `CLAUDE.md`는 드리프트 방지를 위해 `AGENTS.md`를 가리키는 얇은 Claude Code 호환 진입점으로 축소

## 2-1-4단계: Parser golden 하네스 시작 (2026-05-17)
* 로컬 커밋 기준점:
  * `7da439c chore: add harness contracts and project skills`
* 추가한 실행 하네스:
  * [harness/scripts/run_parser_golden.py](harness/scripts/run_parser_golden.py): parser golden case 실행기
  * [harness/scripts/parse_with_index.mjs](harness/scripts/parse_with_index.mjs): `index.html`에 포함된 실제 파서를 Node VM에서 호출하는 helper
  * [harness/TESTING.md](harness/TESTING.md): 현재 사용 가능한 검증 명령 정리
* 추가한 fixture/expected:
  * [test/parser-golden/android-sample.json](test/parser-golden/android-sample.json): Android 실제 ZIP 샘플 expected
  * [test/fixtures/ios-minimal/Talk_2026.1.27 21_37-1.txt](<test/fixtures/ios-minimal/Talk_2026.1.27 21_37-1.txt>): iOS 최소 fixture
  * [test/parser-golden/ios-minimal.json](test/parser-golden/ios-minimal.json): iOS 최소 fixture expected
* 구현 수정:
  * Android 연속 사진 hash가 숫자로 시작할 때 파싱에서 누락되던 문제 수정
  * `window.__CHAEXTRACTOR_ENABLE_TEST_API__`가 설정된 경우에만 노출되는 parser test hook 추가
* 검증:
  * `python3 harness/scripts/run_parser_golden.py` 통과 (`android-sample`, `ios-minimal`)
* Doc drift checker 추가:
  * [harness/scripts/check_doc_drift.py](harness/scripts/check_doc_drift.py): Markdown 로컬 링크, 플랫폼 지원 범위, Windows 후보 구현-only 분류, JSZip 인라인, 폰트 CDN, Python 도구 위치, Android 샘플 경로, parser golden 명령 문서화 점검
  * `python3 harness/scripts/check_doc_drift.py` 통과

## 2-1-5단계: Windows 텍스트 내보내기 정식 지원 승격 (2026-05-17)
* 결정:
  * Windows 데스크톱 텍스트 내보내기 파싱을 공식 지원으로 승격
  * Windows 첨부파일 매핑은 실제 export 구조 확인 전까지 공식 범위 밖으로 유지
  * GitHub Actions는 현재 필수 축으로 두지 않고, 로컬 하네스 명령을 표준 검증 경로로 유지
* 변경:
  * [test/fixtures/windows-minimal/KakaoTalk_20260301_2110_00_123_windows.txt](test/fixtures/windows-minimal/KakaoTalk_20260301_2110_00_123_windows.txt) fixture 추가
  * [test/parser-golden/windows-minimal.json](test/parser-golden/windows-minimal.json) expected 추가
  * README/AGENTS/harness 문서의 플랫폼 지원 범위를 iOS/Android/Windows로 갱신
  * `index.html` 업로드 UI에서 Windows TXT 파일 선택 허용
  * [harness/scripts/check_doc_drift.py](harness/scripts/check_doc_drift.py)를 Windows 공식 지원 기준으로 갱신
* 검증:
  * `python3 harness/scripts/run_parser_golden.py` 통과 (`android-sample`, `ios-minimal`, `windows-minimal`)
  * `python3 harness/scripts/check_doc_drift.py` 통과

## 2-1-6단계: 보안 렌더링 하네스 보강 (2026-05-17)
* 대상 백로그:
  * H-005 파일명/첨부 ref HTML escape 보강
* 변경:
  * `index.html`의 파일 링크/누락 파일/지연 로딩 파일 렌더링에서 첨부 ref와 파일명을 `escapeHtml` 처리
  * 대화 본문 URL 링크와 파일 링크에 `rel="noopener"` 적용
  * [harness/scripts/parse_with_index.mjs](harness/scripts/parse_with_index.mjs)와 [harness/scripts/run_parser_golden.py](harness/scripts/run_parser_golden.py)에 `renderChat` HTML 검증 경로 추가
  * [test/fixtures/security-xss/xss_attachment_ref.txt](test/fixtures/security-xss/xss_attachment_ref.txt), [test/parser-golden/security-xss.json](test/parser-golden/security-xss.json) 추가
* 검증:
  * `python3 harness/scripts/run_parser_golden.py test/parser-golden/security-xss.json` 통과

## 2-1-7단계: 모달 키보드 접근성 보강 (2026-05-17)
* 대상 백로그:
  * H-006 Escape 모달 닫기와 키보드 접근성 보강
* 변경:
  * 이미지/꿀팁/설정 모달에 `role="dialog"`, `aria-modal`, `aria-hidden`, 닫기 버튼 `aria-label` 적용
  * 공통 `closeActiveModal()`과 Escape 키 처리 추가
  * 이미지 모달 닫기 요소를 키보드 포커스 가능한 버튼으로 변경
  * [harness/scripts/check_modal_escape.py](harness/scripts/check_modal_escape.py) 추가
* 검증:
  * `python3 harness/scripts/check_modal_escape.py` 통과

## 2-1-8단계: 캐시 날짜 정렬 회귀 고정 (2026-05-17)
* 대상 백로그:
  * H-007 cache hit 날짜 정렬 회귀 고정
* 변경:
  * 캐시 hit에서 저장된 `dates`를 다시 `reverse()`하지 않고 `sortDatesDescending()`으로 정규화
  * 기존/미래 캐시가 오름차순, 내림차순, 또는 `dates` 누락 상태여도 `messagesByDate` 기준 최신순 복원 가능
  * [harness/scripts/check_cache_date_sort.py](harness/scripts/check_cache_date_sort.py) 추가
* 검증:
  * `python3 harness/scripts/check_cache_date_sort.py` 통과

## 2-1-9단계: UI smoke 하네스 추가 (2026-05-17)
* 대상 백로그:
  * H-009 주요 UI 흐름 smoke 추가
* 결정:
  * Playwright 의존성은 현재 저장소에 없으므로, 첫 단계는 Node VM에서 실제 `index.html` UI 함수를 호출하는 deterministic smoke로 시작
  * 실제 브라우저 smoke는 의존성 도입 시 [harness/scripts/check_ui_smoke.py](harness/scripts/check_ui_smoke.py) 위에 확장
* 변경:
  * `index.html` test API에 `initApp`, `selectDate`, `renderDateList`, 리더 필터, 설정, 사이드바 상태 snapshot 추가
  * [harness/scripts/check_ui_smoke.py](harness/scripts/check_ui_smoke.py) 추가
* 검증:
  * `python3 harness/scripts/check_ui_smoke.py` 통과

## 2-1-10단계: 브라우저 기능 제한 안내 구현 (2026-05-17)
* 대상 백로그:
  * H-010 브라우저 기능 제한 안내 구현
* 변경:
  * 초기 업로드 영역에 기능 제한 안내 영역 추가
  * `File`/`Blob`/`URL.createObjectURL` 미지원 시 업로드 컨트롤 비활성화
  * `IndexedDB` 미지원 시 캐시 없이 동작한다는 복구 가능한 안내 표시
  * [harness/scripts/check_capability_notice.py](harness/scripts/check_capability_notice.py) 추가
* 검증:
  * `python3 harness/scripts/check_capability_notice.py` 통과

## 2-1-11단계: 캐시 삭제와 Blob URL 정리 구현 (2026-05-17)
* 대상 백로그:
  * H-011 캐시 삭제 UX와 Blob URL 해제 정책 구현
* 결정:
  * IndexedDB 캐시는 설정 모달에서 삭제할 수 있게 제공
  * 새 업로드 전 기존 런타임 첨부 Blob URL은 `URL.revokeObjectURL`로 해제
* 변경:
  * 설정 모달에 로컬 캐시 삭제 버튼과 상태 문구 추가
  * `clearAllCache()`, `clearRuntimeAttachmentFiles()`, `resetRuntimeAttachmentState()` 추가
  * ZIP/폴더 새 처리 시작 시 런타임 첨부 상태 초기화
  * [harness/scripts/check_cache_privacy.py](harness/scripts/check_cache_privacy.py) 추가
* 검증:
  * `python3 harness/scripts/check_cache_privacy.py` 통과

## 2-1-12단계: Android 일반 파일/PDF 매핑 구현 (2026-05-17)
* 대상 백로그:
  * H-012 Android 일반 파일/PDF 매핑 결정 및 구현
* 결정:
  * Android `파일: {파일명}` 일반 문서 첨부는 공식 요구사항으로 승격
  * 파일명은 URL 인코딩될 수 있으므로 원문/디코딩 값을 모두 비교해 직접 매핑
* 변경:
  * Android 일반 문서 확장자 첨부 후보 패턴 추가
  * `findAttachmentByReference()`로 URL 인코딩/디코딩 파일명 매핑
  * [test/fixtures/android-files/KakaoTalkChats.txt](test/fixtures/android-files/KakaoTalkChats.txt), [test/parser-golden/android-files.json](test/parser-golden/android-files.json) 추가
* 검증:
  * `python3 harness/scripts/run_parser_golden.py test/parser-golden/android-files.json` 통과

## 2-1-13단계: Windows 첨부파일 범위 고정 (2026-05-17)
* 대상 백로그:
  * H-014 Windows 첨부파일 매핑 조사 및 결정
* 결정:
  * Windows 텍스트 내보내기 파싱은 공식 지원을 유지
  * Windows 첨부파일 매핑은 실제 첨부파일 포함 export 샘플 확보 전까지 공식 범위 밖으로 유지
  * 현재 코드는 Windows 첨부파일을 직접 매핑하지 않는 상태를 fixture로 고정
* 변경:
  * [test/fixtures/windows-attachments-unsupported/KakaoTalk_20260303_1300_00_123_windows.txt](test/fixtures/windows-attachments-unsupported/KakaoTalk_20260303_1300_00_123_windows.txt) 추가
  * [test/parser-golden/windows-attachments-unsupported.json](test/parser-golden/windows-attachments-unsupported.json) 추가
  * [harness/BACKLOG.md](harness/BACKLOG.md)의 H-014를 외부 샘플 필요 상태로 이동
* 검증:
  * `python3 harness/scripts/run_parser_golden.py test/parser-golden/windows-attachments-unsupported.json` 통과

## 2-1-14단계: 합성 성능 smoke 추가 (2026-05-17)
* 대상 백로그:
  * H-013 합성 대용량 성능 smoke 추가
* 변경:
  * [harness/scripts/check_performance_smoke.py](harness/scripts/check_performance_smoke.py) 추가
  * Node VM helper에 합성 Android 로그 생성과 실제 `index.html` 파서 시간 측정 모드 추가
  * 1만 메시지 자동 smoke와 50만 메시지 수동 측정 명령 문서화
* 검증:
  * `python3 harness/scripts/check_performance_smoke.py` 통과: 10,000 메시지, 15.5ms
  * `python3 harness/scripts/check_performance_smoke.py --messages 500000 --budget-ms 10000` 통과: 500,000 메시지, 502.7ms

## 2-1-15단계: 가이드 이미지 정적 자산 분리 (2026-05-17)
* 결정:
  * 앱 구조 기준을 "단일 HTML 파일"에서 "빌드 없는 정적 앱"으로 조정
  * `index.html`은 앱 진입점으로 유지하고, 정적 자산은 소스 파일 그대로 GitHub Pages에 배포
  * 가이드 스크린샷은 내용 이미지이므로 스프라이트/base64 대신 `assets/guide/*.png` 개별 파일로 관리
* 변경:
  * 사용 가이드 base64 PNG 6장을 `assets/guide/` 아래 개별 파일로 추출
  * `index.html`의 가이드 이미지를 상대 경로 `<img>`로 교체하고 `loading="lazy"`, `decoding="async"` 적용
  * README/AGENTS/harness 문서와 doc drift checker에 빌드 없는 정적 앱 기준 반영
* 검증:
  * `file assets/guide/*.png`로 PNG 형식과 해상도 확인
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/run_parser_golden.py` 통과
  * `python3 harness/scripts/check_modal_escape.py`, `check_cache_date_sort.py`, `check_ui_smoke.py`, `check_capability_notice.py`, `check_cache_privacy.py`, `check_performance_smoke.py` 통과
  * `git diff --check` 및 Python 유틸 import smoke 통과

## 2-1-16단계: 앱 CSS 정적 자산 분리 (2026-05-17)
* 결정:
  * CSS는 `assets/styles/app.css`로 분리하되 빌드 산출물은 만들지 않음
  * `index.html`은 앱 진입점과 JS 앱 로직 중심으로 유지
* 변경:
  * `index.html` 내부 `<style>` 블록을 `assets/styles/app.css`로 이동
  * `index.html`에서 `assets/styles/app.css`를 `<link rel="stylesheet">`로 로드
  * README/AGENTS/harness 문서와 doc drift checker에 스타일시트 경로와 폰트 CDN 점검 기준 반영
* 검증:
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/run_parser_golden.py` 통과
  * `python3 harness/scripts/check_modal_escape.py`, `check_cache_date_sort.py`, `check_ui_smoke.py`, `check_capability_notice.py`, `check_cache_privacy.py`, `check_performance_smoke.py` 통과
  * `git diff --check` 및 Python 유틸 import smoke 통과

## 2-1-17단계: Open Graph 이미지 자산 위치 정리 (2026-05-17)
* 결정:
  * 루트의 `og-image.png`를 `assets/og-image.png`로 이동해 런타임 정적 자산 위치를 일관화
  * 소셜 메타 태그는 크롤러 호환을 위해 절대 URL을 유지
* 변경:
  * `index.html`의 `og:image`, `twitter:image`, `#heroImage` 경로 갱신
  * README/AGENTS/harness 문서와 doc drift checker에 `assets/og-image.png` 기준 반영
* 검증:
  * `file assets/og-image.png`로 PNG 형식과 해상도 확인
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `git diff --check` 통과

## 2-1-18단계: 앱 JS와 JSZip vendor 정적 자산 분리 (2026-05-17)
* 결정:
  * 앱 JavaScript는 `assets/scripts/app.js`로 분리하되 빌드 산출물은 만들지 않음
  * JSZip 3.10.1은 `assets/vendor/jszip-3.10.1.min.js` 로컬 vendor 파일로 고정
  * `index.html`은 HTML 진입점으로 유지하고 vendor script → app script 순서로 로드
* 변경:
  * `index.html` 내부 앱 스크립트를 `assets/scripts/app.js`로 이동
  * 인라인 JSZip을 `assets/vendor/jszip-3.10.1.min.js`로 이동
  * [harness/scripts/parse_with_index.mjs](harness/scripts/parse_with_index.mjs)가 `assets/scripts/app.js`를 직접 읽도록 갱신
  * README/AGENTS/harness 문서와 doc drift checker에 앱 JS/JSZip vendor 경로 반영
* 검증:
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/run_parser_golden.py` 통과
  * `python3 harness/scripts/check_modal_escape.py`, `check_cache_date_sort.py`, `check_ui_smoke.py`, `check_capability_notice.py`, `check_cache_privacy.py`, `check_performance_smoke.py` 통과
  * `git diff --check` 및 Python 유틸 import smoke 통과

## 2-1-19단계: 선택 실행 Playwright browser smoke 추가 (2026-05-17)
* 결정:
  * 실제 브라우저 검증은 앱 배포 빌드가 아니라 개발 하네스로 둠
  * 초기 범위는 Chromium 기반 정적 자산 로드, Windows TXT 업로드, 핵심 UI 흐름, 모바일 사이드바 smoke로 제한
  * GitHub Actions 필수 게이트는 아직 도입하지 않고 로컬 선택 실행 명령으로 유지
* 변경:
  * [package.json](package.json)에 Playwright 개발 의존성과 `test:browser` 명령 추가
  * [harness/browser/playwright.config.js](harness/browser/playwright.config.js) 추가
  * [harness/browser/smoke.spec.js](harness/browser/smoke.spec.js) 추가
  * README/AGENTS/harness 문서와 tester skill에 browser smoke 실행 기준 반영
  * `.gitignore`에 `node_modules/`, `playwright-report/`, `test-results/` 추가
* 검증:
  * `npm install` 및 `npm run test:browser:install`로 Playwright/Chromium 설치 완료
  * `npm run test:browser` 통과: 4 passed, 2 skipped
  * 기존 deterministic 하네스와 문서 검사 통과

## 2-1-20단계: 꿀팁 모달을 오른쪽 링크 사이드바로 대체 (2026-05-17)
* 결정:
  * 꿀팁은 모달이 아니라 메인 화면 오른쪽 링크 사이드바에서 상시 제공
  * 초기 화면에서는 꿀팁 모달 버튼을 제거하고 문의/제보 외부 링크만 유지
  * 모바일에서는 대화 화면, 좌측 탐색 사이드바, 우측 링크 사이드바 중 하나만 화면을 점유하도록 좌우 패널을 상호 배제
* 변경:
  * [harness/REQUIREMENTS.md](harness/REQUIREMENTS.md)에 우측 링크 패널과 모바일 상호 배제 요구사항 반영
  * [index.html](index.html)에서 `#setupTipsBtn`, `#tipsBtn`, `#tipsModal` 제거 및 `#linkSidebar`/`#linkSidebarToggle` 추가
  * [assets/styles/app.css](assets/styles/app.css)에 데스크톱 우측 링크 패널과 모바일 우측 슬라이드 패널 스타일 추가
  * [assets/scripts/app.js](assets/scripts/app.js)에 `openLinkSidebar`, `closeLinkSidebar`, `closeMobilePanels` 추가
  * README/AGENTS/harness 문서와 Node/Playwright UI smoke를 새 화면 구조에 맞게 갱신
* 검증:
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/run_parser_golden.py` 통과
  * `python3 harness/scripts/check_modal_escape.py`, `check_cache_date_sort.py`, `check_ui_smoke.py`, `check_capability_notice.py`, `check_cache_privacy.py`, `check_performance_smoke.py` 통과
  * `PYTHONDONTWRITEBYTECODE=1 python3 -c "from tools.parse_kakao_chat import main; print(main.__name__)"` 통과
  * `npm run test:browser` 통과: 4 passed, 2 skipped
  * Codex 인앱 브라우저에서 `#setupTipsBtn`/`#tipsModal` 제거와 `#linkSidebar .link-item` 5개 존재 확인
  * `git diff --check` 통과

## 2-1-21단계: 링크 사이드바 유용한 팁 추가 (2026-05-17)
* 결정:
  * 현재 링크 수와 사용처에서는 HTML 정적 목록을 유지
  * 링크가 크게 늘거나 여러 화면에서 재사용될 때 `LINK_GROUPS` 같은 JS 데이터 목록 렌더링을 검토
* 변경:
  * 오른쪽 링크 사이드바에 `유용한 팁` 그룹 추가
  * `ETF Checker` 링크(`https://www.etfcheck.co.kr`) 추가
  * AGENTS/README/harness 문서와 browser smoke 링크 개수 기대값 갱신
* 검증:
  * `git diff --check` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과

## 2-1-22단계: 오류 진단 리포트와 GitHub 버그 제보 폼 추가 (2026-05-17)
* 결정:
  * Google Forms 문의 흐름 대신 GitHub Issue Form 기반 버그 제보 흐름을 사용
  * 앱이 JS 오류와 파일 처리 실패를 감지하면 대화 원문 없이 진단 리포트를 준비
  * 진단 리포트에는 파일명 원문, 사용자명, 첨부파일 내용, 대화 본문을 자동 포함하지 않고 파일 수/크기/확장자/처리 단계/스택만 기록
* 변경:
  * [index.html](index.html)에 `#reportIssueModal`, `#diagnosticToast`, 버그 제보 버튼 추가
  * [assets/scripts/app.js](assets/scripts/app.js)에 `window.error`, `unhandledrejection`, 업로드 처리 실패 진단 수집과 GitHub Issue Form URL 생성 추가
  * [assets/styles/app.css](assets/styles/app.css)에 오류 보고 모달과 진단 토스트 스타일 추가
  * [.github/ISSUE_TEMPLATE/bug_report.yml](.github/ISSUE_TEMPLATE/bug_report.yml)와 `config.yml` 추가
  * [harness/scripts/check_diagnostic_report.py](harness/scripts/check_diagnostic_report.py) 추가
  * README/AGENTS/harness 문서와 Playwright smoke를 오류 보고 흐름에 맞게 갱신
* 검증:
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/run_parser_golden.py` 통과
  * `python3 harness/scripts/check_diagnostic_report.py` 통과
  * `python3 harness/scripts/check_modal_escape.py`, `check_cache_date_sort.py`, `check_ui_smoke.py`, `check_capability_notice.py`, `check_cache_privacy.py`, `check_performance_smoke.py` 통과
  * `PYTHONDONTWRITEBYTECODE=1 python3 -c "from tools.parse_kakao_chat import main; print(main.__name__)"` 통과
  * `npm run test:browser` 통과: 4 passed, 2 skipped
  * `git diff --check` 통과

## 2-1-23단계: 왕관 사용자 필터 대상 입력 추가 (2026-05-17)
* 결정:
  * 왕관 버튼의 기본 필터 대상은 `채상욱 리더`로 유지하되, 사용자가 런타임에서 대상 사용자명을 직접 입력할 수 있게 함
  * 필터 대상 사용자명은 사용자/대화 데이터가 될 수 있으므로 localStorage에 저장하지 않고 현재 세션 UI 상태로만 사용
  * 대상 변경 시 하이라이트, 스크롤 마커, 날짜별 비중, 대화 헤더의 필터 카운트를 같은 기준으로 재계산
* 변경:
  * [index.html](index.html)에 `#leaderFilterPanel`, `#leaderFilterInput`, 적용/전체 버튼 추가
  * [assets/scripts/app.js](assets/scripts/app.js)에 필터 대상 사용자 상태, 대상 변경 재계산, 적용/해제 UI 흐름 추가
  * [assets/styles/app.css](assets/styles/app.css)에 왕관 필터 입력 패널 스타일 추가
  * README/AGENTS/harness 문서와 Node/Playwright UI smoke를 사용자 지정 필터 흐름에 맞게 갱신
* 검증:
  * `git diff --check` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `python3 harness/scripts/run_parser_golden.py` 통과
  * `python3 harness/scripts/check_modal_escape.py` 통과
  * `npm run test:browser` 통과: 4 passed, 2 skipped

## 2-1-24단계: 1995 테마 추가 (2026-05-17)
* 참조:
  * PJW48의 이야기 굵은체 복각 페이지를 참고해 1990년대 PC통신/이야기 감성을 짙은 푸른 화면과 흰 글씨 중심의 변형 다크 테마로 반영
* 변경:
  * [index.html](index.html) 설정 모달에 `1995` 테마 버튼과 `이야기` 폰트 버튼 추가
  * [assets/styles/app.css](assets/styles/app.css)에 `IyagiGGC` 웹폰트, `[data-theme="1995"]`, `[data-font="iyagi"]` 스타일 추가
  * [assets/scripts/app.js](assets/scripts/app.js)에서 `1995` 테마 선택 시 `iyagi` 폰트가 자동 적용되도록 테마별 폰트 전환 갱신
  * README/AGENTS/harness 문서와 Node/Playwright UI smoke를 1995 테마 기준에 맞게 갱신
* 검증:
  * `git diff --check` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `npm run test:browser` 통과: 4 passed, 2 skipped

## 2-1-25단계: 설정 모달 테마/폰트 미리보기 보강 (2026-05-17)
* 변경:
  * 설정 모달의 폰트 버튼이 각 폰트(`기본`, `RIDI바탕`, `Neo둥근모Pro`, `이야기`)로 직접 렌더링되도록 `iyagi` 미리보기 누락 보강
  * 테마 버튼이 각 테마의 배경색, 글자색, 자동 폰트 분위기를 보여주도록 미리보기 스타일 추가
  * 선택된 버튼은 배경을 덮지 않고 테두리와 체크 표시로만 활성 상태를 표시하도록 조정
  * Playwright smoke에 1995 테마/이야기 폰트 미리보기 스타일 검증 추가
* 검증:
  * `git diff --check` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `npm run test:browser` 통과: 4 passed, 2 skipped

## 2-1-26단계: 1995 테마 텍스트 UI 조정 (2026-05-17)
* 결정:
  * 1995 테마는 구조를 바꾸지 않고 CSS만으로 PC통신 텍스트 UI 감성을 강화
  * 접근성, 클릭 영역, 키보드 흐름, 모바일 패널 구조는 기존 요구사항을 유지
* 변경:
  * 1995 테마에서 카드/말풍선/그림자/둥근 박스 표현을 줄이고 짙은 남청색 텍스트 화면 중심으로 조정
  * 메시지는 박스형 말풍선 대신 `[사용자] > 내용`, `@ 시간`, 필터 대상 발언 `*` 표식처럼 보이게 변경
  * 링크/버튼은 `>`, `::` 같은 짧은 텍스트 표지를 쓰되 구조 구분선은 낮은 대비 단색으로 정리
  * Playwright smoke에 1995 테마 말풍선 제거와 헤더/프롬프트 표식 검증 추가
* 검증:
  * `git diff --check` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `npm run test:browser` 통과: 4 passed, 2 skipped

## 2-1-27단계: 1995 테마 주변 UI 안정화 (2026-05-17)
* 변경:
  * 본문 메시지의 PC통신 프롬프트 감성은 유지
  * 사이드바, 헤더, 캘린더, 검색, 링크 그룹의 점선 구분을 낮은 대비 단색 구분으로 정리
  * 선택 상태에서 레이아웃을 밀던 `>` pseudo 표식을 제거하고 얕은 배경 강조로 변경
  * 업로드 단계 여백을 복원해 박스 제거 후 내용물이 붙거나 탈출해 보이는 문제를 완화
* 검증:
  * `git diff --check` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `npm run test:browser` 통과: 4 passed, 2 skipped

## 2-1-28단계: 1995 테마 Windows 3.1 컨트롤 혼합 (2026-05-17)
* 결정:
  * 1995 테마의 전체 바탕과 대화 화면은 이야기/PC통신 남청색 화면을 유지
  * 사이드바, 링크 패널, 설정 모달, 입력/버튼/목록 등 도구 박스는 Windows 3.1 회색 3D 컨트롤로 표현
  * 대화명 잘림은 툴팁 대신 1995 테마에서 줄바꿈 가능한 이름 컬럼으로 처리
* 변경:
  * [assets/styles/app.css](assets/styles/app.css)에 Windows 3.1 컨트롤 색상/raised border/title bar 오버라이드 추가
  * 1995 테마에서 대화 영역은 남청색과 이야기 폰트를 유지하고, 주변 패널은 Windows 컨트롤 폰트/색상으로 분리
  * 1995 테마의 데스크톱 사용자명은 `white-space: normal`, `overflow-wrap: anywhere`로 줄바꿈 허용
  * Playwright smoke에 Windows 3.1 패널 배경, 대화 영역 배경, 사용자명 줄바꿈 스타일 검증 추가
* 검증:
  * `git diff --check` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `npm run test:browser` 통과: 4 passed, 2 skipped

## 2-1-29단계: macOS CSV 내보내기 지원 추가 (2026-05-17)
* 확인:
  * macOS 카카오톡 데스크톱 내보내기 파일은 UTF-8 BOM이 있는 CSV이며, 헤더는 `Date,User,Message`
  * 날짜는 `YYYY-MM-DD HH:mm:ss` 24시간 형식
  * 삭제 메시지와 관리자 숨김 메시지는 `Date`/`User`가 비어 있는 시스템 행으로 확인
  * 제공된 실제 파일에는 카카오톡 앱 버전 정보가 포함되어 있지 않고, 파일명에는 내보내기 시각만 포함
* 결정:
  * macOS 데스크톱 CSV 텍스트 내보내기 파싱을 공식 지원으로 승격
  * macOS 첨부파일 매핑은 실제 첨부파일 포함 export 구조 확인 전까지 공식 범위 밖으로 유지
* 변경:
  * 초기 업로드 버튼 문구를 `파일(zip, txt, csv)`로 정리하고 CSV 선택 허용
  * [assets/scripts/app.js](assets/scripts/app.js)에 macOS CSV 감지, CSV 레코드 파서, macOS timestamp 파서, 시스템 행 제외 로직 추가
  * [test/fixtures/macos-csv/](test/fixtures/macos-csv/)와 [test/parser-golden/macos-csv.json](test/parser-golden/macos-csv.json) 추가
  * README/AGENTS/harness 문서를 macOS CSV 공식 지원과 데스크톱 첨부파일 미지원 경계에 맞게 갱신
* 검증:
  * macOS 실제 CSV 샘플 구조를 원문 없이 요약 확인
  * 실제 macOS CSV 샘플 파싱 요약: `macos`, 54,537 메시지, 224일, 첨부파일 매핑 0건
  * `python3 harness/scripts/run_parser_golden.py` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `python3 harness/scripts/check_diagnostic_report.py` 통과
  * `python3 harness/scripts/check_performance_smoke.py` 통과
  * `PYTHONDONTWRITEBYTECODE=1 python3 -c "from tools.parse_kakao_chat import main; print(main.__name__)"` 통과
  * `git diff --check` 통과
  * `npm run test:browser` 통과: 4 passed, 2 skipped

## 2-1-30단계: 1995 테마 컨트롤 폰트와 초기 화면 음각선 조정 (2026-05-17)
* 결정:
  * 1995 테마의 Windows 3.1식 컨트롤 박스는 형태만 3.1 컨트롤을 차용하고, 글꼴은 대화 화면과 같은 이야기 폰트를 사용
  * 초기 화면 업로드 드롭존의 dashed 테두리는 1995 테마에서 Windows 3.1식 음각 solid 선으로 대체
* 변경:
  * [assets/styles/app.css](assets/styles/app.css)의 1995 테마 컨트롤 박스 font-family를 `var(--font-family)`로 변경
  * 1995 테마 `.drop-zone`에 sunken border와 inset shadow 적용
  * Playwright smoke에 컨트롤 박스 이야기 폰트와 드롭존 solid/inset 색상 검증 추가
* 검증:
  * `git diff --check` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `npm run test:browser` 통과: 4 passed, 2 skipped

## 2-1-31단계: 초기 화면 힌트 목록과 드롭존 음각선 조정 (2026-05-17)
* 결정:
  * 초기 화면의 힌트 목록은 불렛이 박스 밖으로 밀리지 않도록 목록 들여쓰기를 유지
  * 1995 테마 드롭존은 면 전체가 눌린 판처럼 보이지 않게 하고, 주변 테두리만 음각선처럼 표현
* 변경:
  * [assets/styles/app.css](assets/styles/app.css)의 `.hint` 목록 들여쓰기와 긴 경로 줄바꿈 보강
  * 1995 테마 `.drop-zone`의 inset shadow 제거, sunken border 색상만 유지
  * Playwright smoke에 힌트 목록 들여쓰기와 드롭존 border-only 스타일 검증 추가
* 검증:
  * `git diff --check` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `npm run test:browser` 통과: 4 passed, 2 skipped

## 2-1-32단계: 1995 테마 기본값 전환 (2026-05-17)
* 결정:
  * 주 사용층에 맞춰 최초 진입 기본 테마를 `system`에서 `1995`로 변경
  * 1995 기본 테마에서는 이야기 폰트(`iyagi`)를 자동 적용
* 변경:
  * [index.html](index.html)의 초기 HTML 속성을 `data-theme="1995" data-font="iyagi"`로 변경
  * [assets/scripts/app.js](assets/scripts/app.js)의 저장된 설정이 없을 때 기본 테마/폰트를 `1995`/`iyagi`로 변경
  * README/AGENTS/harness 문서에 1995 기본 테마 결정을 반영
  * Node UI smoke와 Playwright smoke에 기본 테마 검증 추가
* 검증:
  * `git diff --check` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `npm run test:browser` 통과: 4 passed, 2 skipped

## 2-1-33단계: 초기 화면 하늘색 외곽선 제거 (2026-05-17)
* 변경:
  * 1995 기본 초기 화면의 가이드 이미지/히어로 이미지 외곽선을 하늘색 테마 border에서 Windows 3.1식 회색 음각선으로 변경
  * 가이드 섹션 전체 외곽선을 만들던 `border-style` 상속을 제거하고, 하단 구분선만 회색 그림자/하이라이트 선으로 정리
  * Playwright smoke에 초기 화면 가이드 이미지와 섹션 상/좌/우 border 제거 검증 추가
* 검증:
  * `git diff --check` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `npm run test:browser` 통과: 4 passed, 2 skipped

## 2-1-34단계: 누락 사진 복구 안내 추가 (2026-05-17)
* 결정:
  * `사진 (파일 없음)`은 앱 오류처럼 보이지 않도록, 카카오톡 원본 대화에서 사진을 열어 기기에 내려받은 뒤 다시 내보내라는 복구 안내를 함께 제공
  * 데스크톱은 hover 툴팁, 모바일은 `도움말` 펼침으로 같은 안내를 확인할 수 있게 함
* 변경:
  * 초기 업로드 힌트에 사진이 비어 보일 때의 재내보내기 안내 추가
  * [assets/scripts/app.js](assets/scripts/app.js)에 누락 사진 안내 렌더러 추가
  * [assets/styles/app.css](assets/styles/app.css)에 누락 사진 툴팁/도움말 스타일 추가
  * [test/fixtures/ios-missing-photo/](test/fixtures/ios-missing-photo/)와 [test/parser-golden/ios-missing-photo-guidance.json](test/parser-golden/ios-missing-photo-guidance.json) 추가
  * README/AGENTS/harness 문서를 누락 사진 안내 요구사항에 맞게 갱신
* 검증:
  * `git diff --check` 통과
  * `python3 harness/scripts/run_parser_golden.py` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `python3 harness/scripts/check_diagnostic_report.py` 통과
  * `PYTHONDONTWRITEBYTECODE=1 python3 -c "from tools.parse_kakao_chat import main; print(main.__name__)"` 통과
  * 인앱 브라우저에서 초기 업로드 힌트 렌더링 확인
  * `npm run test:browser` 통과: 4 passed, 2 skipped

## 2-1-35단계: 갈무리 TXT 내보내기 추가 (2026-05-17)
* 결정:
  * LLM 요약 호환성을 우선해 갈무리 1차 범위는 TXT 복사/다운로드로 한정
  * 이미지와 첨부파일 내용, base64 인코딩 포함은 후속 검토로 분리
  * 갈무리 TXT는 사용자가 명시적으로 복사하거나 다운로드할 때만 생성하며 자동 외부 전송하지 않음
* 변경:
  * 대화 헤더 오른쪽에 `갈무리` 버튼 추가
  * [index.html](index.html)에 갈무리 모달, 현재 날짜/전체 대화 범위 선택, 사용자 필터 적용 옵션 추가
  * [assets/scripts/app.js](assets/scripts/app.js)에 LLM 요약용 TXT 생성, 복사, 다운로드 로직 추가
  * [assets/styles/app.css](assets/styles/app.css)에 갈무리 버튼/모달/1995 테마 스타일 추가
  * README/AGENTS/harness 문서에 갈무리 TXT 요구사항과 개인정보 경계 반영
  * Node UI smoke에 갈무리 TXT 생성과 사용자 필터 반영 검증 추가
* 검증:
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/check_modal_escape.py` 통과
  * `python3 harness/scripts/run_parser_golden.py` 통과
  * `python3 harness/scripts/check_diagnostic_report.py` 통과
  * `python3 harness/scripts/check_cache_privacy.py` 통과
  * `PYTHONDONTWRITEBYTECODE=1 python3 -c "from tools.parse_kakao_chat import main; print(main.__name__)"` 통과
  * `git diff --check` 통과
  * `npm run test:browser` 통과: 4 passed, 2 skipped

## 2-1-36단계: 초기 화면 히어로 이미지 제거와 1995 로딩바 조정 (2026-05-17)
* 결정:
  * 처리 완료 후 표시하던 `assets/og-image.png` 히어로 이미지는 초기 화면에서 제거하고, `assets/og-image.png`는 Open Graph 메타 이미지로만 유지
  * 1995 테마의 진행률 바는 그라데이션 대신 청록색 단색 fill과 조금 두꺼운 Windows 3.1식 음각 프레임으로 표시
* 변경:
  * [index.html](index.html)에서 `#heroImage` 제거
  * [assets/scripts/app.js](assets/scripts/app.js)의 처리 완료 후 히어로 이미지 표시 코드 제거
  * [assets/styles/app.css](assets/styles/app.css)에 1995 전용 진행률 바 두께/색상 오버라이드 추가
  * README/AGENTS/harness 문서에서 히어로 이미지 요구사항과 설명 제거
  * Playwright smoke에 `#heroImage` 제거와 1995 진행률 바 스타일 검증 추가
* 검증:
  * `git diff --check` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `npm run test:browser` 통과: 4 passed, 2 skipped

## 2-1-37단계: 1995 창 여닫기 pseudo-애니메이션 적용 (2026-05-17)
* 결정:
  * 1995 테마에서는 모바일 사이드바와 모달/이미지 팝업 내용 자체를 늘리지 않고, 빈 사각형 테두리 잔상이 버튼 지점에서 목표 창 위치까지 stepped 방식으로 펼쳐진 뒤 실제 창 내용을 표시
  * 닫을 때는 실제 창 내용을 먼저 숨긴 뒤 같은 빈 사각형 테두리 잔상을 버튼 지점으로 축소
  * 모바일 사이드바 토글 버튼도 Windows 3.1 회색 3D 버튼으로 통일
* 변경:
  * [assets/styles/app.css](assets/styles/app.css)에 1995 전용 토글 버튼 raised/sunken 스타일과 `.win31-ghost-box` 테두리 잔상 keyframes 추가
  * [assets/scripts/app.js](assets/scripts/app.js)에 클릭 지점과 창 위치를 계산해 빈 ghost box를 생성/제거하는 1995 전용 열림/닫힘 처리 추가
  * Playwright smoke에 1995 모달/모바일 사이드바 ghost box와 토글 버튼 3D 스타일 검증 추가
* 검증:
  * `git diff --check` 통과
  * `node --check assets/scripts/app.js` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/check_modal_escape.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `npm run test:browser` 통과: 4 passed, 2 skipped

## 2-1-38단계: 일반 사용자용 계정 없는 제보 경로 복원 (2026-05-17)
* 결정:
  * 일반 사용자가 GitHub 계정 없이 제보할 수 있어야 하므로, 앱의 1차 버그 제보 경로는 Google Form으로 둔다.
  * GitHub Issue Form은 계정이 있는 개발자용 보조 채널로만 문서화한다.
* 변경:
  * 오류 보고 모달의 제보 버튼을 Google Form으로 연결하고 버튼 문구를 `계정 없이 제보 열기`로 변경
  * 진단 리포트 URL에는 진단 본문을 자동 첨부하지 않고, 사용자가 복사해서 폼에 붙여넣는 방식으로 유지
  * README/AGENTS/harness 문서를 Google Form 1차 제보 경로와 GitHub 보조 채널 기준으로 갱신
  * `check_diagnostic_report.py`와 `check_doc_drift.py`를 Google Form 제보 경로 기준으로 갱신
* 검증:
  * `git diff --check` 통과
  * `node --check assets/scripts/app.js` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `npm run test:browser` 통과: 4 passed, 2 skipped

## 2-1-39단계: 1995 메인 화면 하늘색 테두리 제거 (2026-05-17)
* 변경:
  * 메인 대화 화면의 `chat-header` 하단선과 스크롤 마커 오른쪽선에 남아 있던 하늘색 계열 border를 어두운 남청색 선으로 변경
  * 초기 1995 텍스트 스타일 블록에 남아 있던 주변 패널/검색 입력 border 색을 Windows 3.1 회색 계열로 정리
  * Playwright smoke에 1995 메인 화면 경계선 색상 회귀 검증 추가
* 검증:
  * `git diff --check` 통과
  * `node --check assets/scripts/app.js` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `npm run test:browser` 통과: 4 passed, 2 skipped

## 2-1-40단계: 1995 창 잔상 단선/촘촘함 조정 (2026-05-17)
* 변경:
  * 1995 창 여닫기 ghost box에서 겹선 `::before`/`::after`, outline, shadow를 제거하고 3px 단선 테두리로 정리
  * 창 잔상 이동을 `steps(4)`에서 `steps(8)`로 늘려 박스 사이 간격을 절반 수준으로 조정
  * Playwright smoke에 ghost box 단선 두께, outline/shadow 제거, 촘촘한 step timing 검증 추가
* 검증:
  * `git diff --check` 통과
  * `node --check assets/scripts/app.js` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `npm run test:browser` 통과: 4 passed, 2 skipped

## 2-1-41단계: 1995 창 잔상 프레임 복구 (2026-05-17)
* 변경:
  * 단일 ghost box 이동 방식 대신 9개의 중간 사각형 프레임을 순차 표시해 실제 잔상처럼 보이도록 복구
  * 각 프레임은 3px 단선 테두리를 유지하되, Windows 3.1 느낌의 얕은 그림자를 되살려 밋밋한 박스 느낌을 완화
  * Playwright smoke에 ghost frame 개수, 순차 delay, 단선/그림자 스타일 검증 추가
* 검증:
  * `git diff --check` 통과
  * `node --check assets/scripts/app.js` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `python3 harness/scripts/check_modal_escape.py` 통과
  * `npm run test:browser` 통과: 4 passed, 2 skipped

## 2-1-42단계: 1995 박스 영역 잔여 아웃라인 제거 (2026-05-17)
* 변경:
  * 1995 테마에서 `calendar`, `search-box`, `link-group` 컨테이너에 남아 있던 바깥 border를 제거
  * 링크/버튼 같은 실제 컨트롤의 Windows 3.1 양각/음각 스타일은 유지
  * Playwright smoke에 섹션 컨테이너 border 제거 회귀 검증 추가
* 검증:
  * `git diff --check` 통과
  * `node --check assets/scripts/app.js` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `npm run test:browser` 통과: 4 passed, 2 skipped

## 2-1-43단계: 1995 대화 뷰어 패널 아웃라인 제거와 버튼 입체감 복원 (2026-05-17)
* 변경:
  * 도킹된 좌우 사이드 패널에 전체 Windows 3.1 박스 프레임이 다시 적용되던 스타일을 제거하고, 내부 경계선만 남김
  * `sidebar-header`에 `border-style: solid`만 남아 사방 박스처럼 그려지던 잔여 아웃라인 제거
  * 대화 뷰어 헤더는 하단 구분선만 남기고 상/좌/우 border는 제거
  * 잘못 추가했던 `대화 뷰어` 타이틀바 버튼 평면화 오버라이드를 제거
  * 필터/설정 버튼의 Windows 3.1식 raised border를 복원
  * Playwright smoke에 좌우 사이드 패널의 전체 박스 프레임 제거, 대화 뷰어 헤더 상/좌/우 border 제거, 설정 버튼 raised border 색상 회귀 검증 추가
* 검증:
  * `git diff --check` 통과
  * `node --check assets/scripts/app.js` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `npm run test:browser` 통과: 4 passed, 2 skipped

## 2-1-44단계: Google Form 응답 시트 연결과 진단 리포트 사전입력 (2026-05-17)
* 변경:
  * Google Form 응답을 새 Google Sheets `머니버스 대화 뷰어 버그/기능개선 제보(응답)`에 연결
  * 응답 시트에 `상태`, `우선순위`, `담당`, `처리 메모`, `관련 링크`, `회신일` 운영 컬럼과 상태/우선순위 드롭다운 추가
  * Google Form 사전입력 필드 확인: `entry.315233821` = 제보 유형, `entry.1161180918` = 내용, `emailAddress` = 이메일
  * 오류 보고 버튼이 `제보 유형=버그 제보`와 안전 진단 리포트를 Google Form 내용 칸에 자동 입력하도록 변경
  * README/AGENTS/harness 문서를 사전입력 제보 흐름과 응답 시트 기준으로 갱신
* 검증:
  * Chrome 로그인 세션에서 사전입력 URL이 제보 유형과 내용 칸을 채우는 것 확인
  * Google Sheets 응답 시트 `A1:K8`에서 기존 응답, 상태/우선순위 운영 컬럼 확인
  * `node --check assets/scripts/app.js` 통과
  * `python3 harness/scripts/check_diagnostic_report.py` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `git diff --check` 통과
  * `npm run test:browser` 통과: 4 passed, 2 skipped

## 2-1-45단계: 1995 캘린더 위아래 음각 구분선 적용 (2026-05-17)
* 변경:
  * 1995 테마에서 캘린더 위쪽 기존 구분선(`search-box` 하단)과 캘린더 아래쪽 기존 구분선을 Windows 3.1식 음각선으로 변경
  * 캘린더를 별도 박스로 감싸는 추가 outline 없이 기존 레이아웃의 수평 구분선만 유지
  * Playwright smoke에 캘린더 위/아래 음각 구분선 회귀 검증 추가
* 검증:
  * `git diff --check` 통과
  * `node --check assets/scripts/app.js` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `npm run test:browser` 통과: 4 passed, 2 skipped

## 2-1-46단계: 1995 사용자 필터 패널 하늘색 outline 제거 (2026-05-17)
* 변경:
  * 1995 테마에서 사용자 필터 패널의 border를 Windows 3.1식 회색 sunken border로 고정
  * 사용자 필터 입력 focus outline을 하늘색에서 검정 점선 focus로 변경
  * 사용자 필터 해제 버튼 문구를 `전체`에서 `해제`로 변경
  * Playwright smoke에 필터 패널 border 색상, 입력 focus outline, `해제` 버튼 문구 검증 추가
* 검증:
  * `git diff --check` 통과
  * `node --check assets/scripts/app.js` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `npm run test:browser` 통과: 4 passed, 2 skipped

## 2-1-47단계: 설정 모달 이야기 폰트 라벨 변경 (2026-05-17)
* 변경:
  * 설정 모달의 `iyagi` 폰트 버튼 라벨을 `이야기`에서 `PJW48 이야기`로 변경
  * README의 테마/폰트 설명도 `PJW48 이야기` 표기로 갱신
  * Playwright smoke에 `PJW48 이야기` 폰트 버튼 라벨 검증 추가
* 검증:
  * `git diff --check` 통과
  * `node --check assets/scripts/app.js` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `npm run test:browser` 통과: 4 passed, 2 skipped

## 2-1-48단계: 1995 리더 메시지 진노랑 강조 (2026-05-17)
* 변경:
  * 1995 테마에서 `채상욱 리더` 메시지의 이름, 시간, 본문, 링크, `*` 표식을 모두 진노랑으로 통일
  * 기존 연노랑 리더 텍스트 색상을 더 선명한 `#ffd400`으로 조정
  * Playwright smoke에 리더 메시지 이름/본문/시간 색상 회귀 검증 추가
* 검증:
  * `git diff --check` 통과
  * `node --check assets/scripts/app.js` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `npm run test:browser` 통과: 4 passed, 2 skipped

## 2-1-49단계: 오류 진단 리포트 디버깅 정황 강화 (2026-05-17)
* 결정:
  * 버그 제보의 우선 목표는 빠른 원인 파악이므로, 진단 리포트는 파일명/경로/크기, ZIP 내부 구조, 후보 대화 파일의 앞부분 샘플 라인과 패턴 검증 결과를 포함한다.
  * Google Form 내용 칸에 자동 입력된 리포트는 제출 전 사용자가 확인하고 수정할 수 있다.
* 변경:
  * 진단 리포트에 입력 파일 샘플, ZIP 내부 파일 샘플, 대화 파일 후보별 검증 결과, 실패 이유, 샘플 라인, 파싱 결과 요약을 추가
  * `유효한 대화 파일 없음` 오류 메시지에 TXT/CSV 후보 수와 지원 형식 불일치 정황을 포함
  * 오류 보고 모달/README/AGENTS/harness 문서를 디버깅 정황 중심 제보 기준으로 갱신
  * `check_diagnostic_report.py`를 파일명/검증 정황/샘플 라인이 실제 리포트와 사전입력 URL에 들어가는지 확인하도록 변경
* 검증:
  * `node --check assets/scripts/app.js` 통과
  * `python3 harness/scripts/check_diagnostic_report.py` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `git diff --check` 통과
  * `npm run test:browser` 통과: 4 passed, 2 skipped

## 2-1-50단계: 1995 초기 화면 배경 청록색 적용 (2026-05-17)
* 변경:
  * 1995 테마의 초기 화면 바깥 배경을 Windows 3.1 데스크톱 느낌의 청록색(`#008080`)으로 변경
  * 1995 진행률 바 fill 색상과 같은 색을 사용해 초기 화면의 PC통신/Windows 3.1 혼합 톤을 맞춤
* 검증:
  * `git diff --check` 통과
  * `node --check assets/scripts/app.js` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `npm run test:browser` 통과: 4 passed, 2 skipped

## 2-1-51단계: 오류 감지 즉시 보고 모달 전환과 Form URL 축소 (2026-05-17)
* 변경:
  * JS 오류/파일 처리 실패를 감지하면 오른쪽 하단 진단 토스트를 표시하지 않고 오류 보고 모달을 즉시 열도록 변경
  * Google Form 사전입력에는 전체 진단 리포트 대신 URL 길이 제한을 피한 오류 요약만 넣도록 변경
  * 오류 보고 모달에 `TXT 다운로드` 버튼을 추가하고, 제보 열기 버튼은 Google Form을 열면서 전체 진단 리포트 TXT 다운로드도 시도
  * 오류 보고 모달/README/AGENTS/harness 문서를 즉시 모달 전환과 요약 사전입력 기준으로 갱신
  * `check_diagnostic_report.py`가 토스트 미표시, 모달 즉시 표시, 사전입력 URL 길이 제한, 진단 TXT 파일명을 검증하도록 갱신
* 검증:
  * `git diff --check` 통과
  * `git diff --cached --check` 통과
  * `node --check assets/scripts/app.js` 통과
  * `python3 harness/scripts/check_diagnostic_report.py` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `npm run test:browser` 통과: 4 passed, 2 skipped

## 2-1-52단계: 앱 버전 기반 테마 저장값 초기화 (2026-05-18)
* 결정:
  * 과거 버전이 저장한 테마/폰트 설정은 새 기본 테마 적용을 막으므로, 앱 버전이 바뀌면 한 번만 1995 기본값으로 초기화한다.
  * 같은 앱 버전 안에서 사용자가 다시 다른 테마를 선택하면 그 선택은 유지한다.
* 변경:
  * `meta[name="app-version"]`와 CSS/JS 버전 query를 추가해 새 배포 자산 캐시 갱신 기준을 명시
  * `resetVersionedSettings()`를 추가해 앱 버전 변경 시 기존 테마/폰트 저장값을 `1995`/`iyagi`로 1회 초기화
  * 브라우저 smoke에 기존 저장 테마가 앱 버전 변경 시 1995로 초기화되고 이후 같은 버전의 사용자 선택은 유지되는 회귀 검증 추가
  * 문서 드리프트 검사에서 버전 query가 붙은 CSS/JS 자산 경로를 정적 자산으로 인식하도록 갱신
  * README/AGENTS/harness 요구사항을 앱 버전 기반 설정 초기화 기준에 맞게 갱신
* 검증:
  * `node --check assets/scripts/app.js` 통과
  * `python3 harness/scripts/check_diagnostic_report.py` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `npm run test:browser` 통과: 6 passed, 2 skipped

## 2-1-53단계: 채상욱 리더 필수 링크 추가와 21계명 문구 반영 (2026-05-31)
* 변경:
  * 오른쪽 링크 사이드바의 `머니버스 하지 마라 19계명` 표시를 `머니버스 하지 마라 21계명`으로 갱신
  * `채상욱 리더 필수 링크` 그룹을 추가하고 채국장TV, 채부심, 네이버 프리미엄콘텐츠 아파트 연구소, KBS 라디오 경제쇼 플레이리스트를 등록
  * AGENTS/README/harness 문서와 browser smoke 링크 개수 기대값 갱신
* 검증:
  * `git diff --check` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과

## 2-1-54단계: 채상욱 리더 필수 링크 팬딩 커뮤니티 추가 (2026-05-31)
* 변경:
  * `채상욱 리더 필수 링크` 그룹 첫 항목에 머니버스 본진 커뮤니티(`https://fanding.kr/@chae_moneybus/`) 추가
  * 같은 그룹 마지막 항목에 주식부자(`https://fanding.kr/@jusigbuja/`) 추가
  * AGENTS/harness 외부 링크 표면과 browser smoke 링크 개수 기대값 갱신
* 검증:
  * `git diff --check` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과

## 2-1-55단계: 1995 좌측 사이드바 헤더 여백 정리 (2026-05-31)
* 변경:
  * 1995 테마에서 좌측 `대화 뷰어` 제목 바의 바깥 padding을 제거해 오른쪽 `링크` 제목 바와 같은 밀도로 표시
  * 제목 바의 최소 높이와 헤더 버튼 크기를 조정하고 통계 줄 padding을 별도로 정리
* 검증:
  * `git diff --check` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과

## 2-1-56단계: 갈무리 버튼 날짜 선택 전 비활성화 (2026-05-31)
* 변경:
  * 갈무리 버튼을 날짜 선택과 해당 날짜 대화 렌더링이 끝난 뒤에만 활성화하도록 변경
  * `renderedChatDate` 상태와 `isCaptureReady()`/`updateCaptureButtonState()`를 추가해 파일 파싱 직후 모달이 열리지 않도록 방어
  * Node UI smoke와 Playwright browser smoke에 날짜 선택 전 갈무리 비활성/모달 미오픈, 날짜 선택 후 활성 검증 추가
  * README/AGENTS/harness 요구사항에 갈무리 활성화 조건 반영
* 검증:
  * `node --check assets/scripts/app.js` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `git diff --check` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `npm run test:browser` 통과: 6 passed, 2 skipped

## 2-1-57단계: 오른쪽 링크 사이드바 자료 확장 (2026-05-31)
* 변경:
  * `춤추는 토끼 171879` 그룹에 Fillbook 링크 추가
  * `게임하는 판다 192331` 그룹을 `춤추는 토끼 171879` 다음에 추가하고 Active ETFs Reports 링크 등록
  * `유용한 팁` 그룹에 텔레그램, ETF tracker/비교, 리포트, Hyperliquid, MCP, KOSPI/KOSPD 자료 링크 추가
  * AGENTS/README/harness 외부 링크 표면과 smoke 링크 개수 기대값 갱신
* 검증:
  * `git diff --check` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `npm run test:browser` 통과: 6 passed, 2 skipped

## 2-1-58단계: 유용한 팁 ePulse 링크 추가 (2026-05-31)
* 변경:
  * 오른쪽 링크 사이드바의 `유용한 팁` 그룹에 ePulse 링크(`https://ibare.github.io/epulse/`) 추가
  * AGENTS 콘텐츠 데이터, harness 외부 링크 표면, browser smoke 링크 개수 기대값 갱신
* 검증:
  * `git diff --check` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `npm run test:browser` 통과: 6 passed, 2 skipped

## 2-1-59단계: GitHub Pages 캐시 우회 업데이트 감지 추가 (2026-05-31)
* 결정:
  * GitHub Pages에서 이미 캐시된 과거 `index.html`을 원격에서 100% 강제로 무효화할 수는 없지만, 앱이 로드된 뒤에는 같은 출처의 버전 매니페스트를 확인해 다음 배포부터 캐시 우회 새로고침을 시도한다.
  * 대화 파일 업로드 전 상태에서만 자동 새로고침하고, sessionStorage로 같은 버전에 대한 반복 reload를 막는다.
* 변경:
  * `assets/version.json` 앱 버전 매니페스트 추가
  * `meta[name="app-version"]`, CSS/JS query, JS fallback 버전을 `2026-05-31-update-check`로 갱신
  * 앱 시작/탭 재활성화 시 `assets/version.json?v={현재버전}&t={timestamp}`를 확인하고 최신 버전이 다르면 `?appVersion={최신버전}&t={timestamp}`로 1회 reload
  * README/AGENTS/harness 요구사항/매니페스트/결정/테스트 문서와 doc drift checker 갱신
  * Playwright browser smoke에 version manifest 로드와 새 버전 감지 reload 검증 추가
* 검증:
  * `node --check assets/scripts/app.js` 통과
  * `git diff --check` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `npm run test:browser` 통과: 7 passed, 3 skipped

## 2-1-60단계: ePulse 링크 표시명 풀네임 정정 (2026-05-31)
* 변경:
  * `유용한 팁` 그룹의 ePulse 표시명을 페이지 title 기준 `ePulse - 경제 인과관계 학습 시뮬레이터`로 정정
  * AGENTS 콘텐츠 데이터의 ePulse 항목명도 같은 표시명으로 갱신
* 검증:
  * `git diff --check` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과

## 2-1-61단계: 공식 서비스 경로와 ES module 진입점 전환 (2026-06-07)
* 결정:
  * 공식 서비스 제공 경로는 GitHub Pages로 둔다.
  * 로컬 검증/개인 사용 경로로 `file://` 직접 실행을 유지한다.
  * JavaScript는 빌드 산출물을 만들지 않는 ES module 기반 분리를 허용한다.
* 변경:
  * `index.html`의 앱 스크립트 로드를 `type="module"`로 전환
  * 앱 버전 값을 `2026-06-07-es-module-entry`로 갱신
  * README, AGENTS, harness MANIFEST, harness DECISIONS에 GitHub Pages 공식 서비스 경로와 `file://` 로컬 실행 유지 결정을 반영
  * module scope에서도 JSZip 의존성 확인 오류가 명시적으로 드러나도록 `getJSZip()` 헬퍼 추가
* 검증:
  * 사용자 수동 확인: `file://` ES module fixture가 macOS Firefox, Chrome, Safari에서 로드됨
  * `git diff --check` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/run_parser_golden.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `python3 harness/scripts/check_diagnostic_report.py` 통과
  * `python3 harness/scripts/check_modal_escape.py` 통과
  * `python3 harness/scripts/check_cache_date_sort.py` 통과
  * `python3 harness/scripts/check_capability_notice.py` 통과
  * `python3 harness/scripts/check_cache_privacy.py` 통과
  * `python3 harness/scripts/check_performance_smoke.py` 통과
  * `PYTHONDONTWRITEBYTECODE=1 python3 -c "from tools.parse_kakao_chat import main; print(main.__name__)"` 통과
  * `npm run test:browser` 통과

## 2-1-62단계: 저수준 대화 도메인 헬퍼 ES module 분리 (2026-06-07)
* 분류:
  * implementation-only 아키텍처 리팩터링. 사용자 기능/플랫폼 지원 범위 변경 없음.
* 변경:
  * 정규식 패턴, 플랫폼 감지, 첨부파일 파일명 판별/파싱, URL 감지, CSV 레코드 파서, macOS CSV 헬퍼, 메시지 타입 분류를 `assets/scripts/domain/chat-domain.js`로 분리
  * `assets/scripts/app.js`는 새 도메인 모듈을 import하도록 변경하고 중복 정의 제거
  * Node VM 하네스 `harness/scripts/parse_with_index.mjs`가 ES module import를 실제 모듈 import + VM context 주입으로 처리하도록 보강
  * `AGENTS.md`, `README.md`, `harness/MANIFEST.md`, `harness/DECISIONS.md`, `harness/TESTING.md`에 새 JS module 경계를 반영
  * 앱 버전 값을 `2026-06-07-domain-module`로 갱신
* 검증:
  * `node --check harness/scripts/parse_with_index.mjs` 통과
  * `node --check assets/scripts/domain/chat-domain.js` 통과
  * `git diff --check` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/run_parser_golden.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `python3 harness/scripts/check_diagnostic_report.py` 통과
  * `python3 harness/scripts/check_modal_escape.py` 통과
  * `python3 harness/scripts/check_cache_date_sort.py` 통과
  * `python3 harness/scripts/check_capability_notice.py` 통과
  * `python3 harness/scripts/check_cache_privacy.py` 통과
  * `python3 harness/scripts/check_performance_smoke.py` 통과
  * `PYTHONDONTWRITEBYTECODE=1 python3 -c "from tools.parse_kakao_chat import main; print(main.__name__)"` 통과
  * `npm run test:browser` 통과

## 2-1-63단계: `file://` 직접 실행 파일 선택 버튼 회귀 수정 (2026-06-07)
* 원인:
  * Chromium 계열 `file://` 직접 실행에서 외부 module script가 CORS 정책으로 차단되어 `assets/scripts/app.js`가 실행되지 않았다.
  * 그 결과 `#zipBtn` / `#folderBtn` 이벤트 리스너가 붙지 않아 파일 불러오기 버튼이 응답하지 않았다.
* 변경:
  * 로컬 `file://` 직접 실행 계약을 우선해 앱 JS 로딩을 classic script 방식으로 되돌림
  * `assets/scripts/domain/chat-domain.js`는 IIFE 안에서 저수준 도메인 헬퍼를 정의하고 `window.ChaExtractorChatDomain` namespace만 노출하도록 변경
  * `assets/scripts/app.js`는 `window.ChaExtractorChatDomain`을 사용하도록 변경
  * `file://` 직접 실행에서는 `assets/version.json` fetch 업데이트 체크를 건너뛰어 콘솔 오류를 제거
  * Node VM 하네스가 domain script를 먼저 실행한 뒤 app script를 실행하도록 변경
  * README, AGENTS, harness MANIFEST, harness DECISIONS, harness TESTING을 classic script namespace 분리 기준으로 정정
  * 앱 버전 값을 `2026-06-07-file-classic-domain`으로 갱신
* 검증:
  * 로컬 `file:///Users/lvcwoo/workspace/chaextractor/index.html` Chromium 재현에서 `#zipBtn` 클릭 시 file chooser 열림 확인
  * 로컬 `file://` Chromium 재현에서 pageerror/console error 없음 확인
  * `node --check assets/scripts/app.js` 통과
  * `node --check assets/scripts/domain/chat-domain.js` 통과
  * `node --check harness/scripts/parse_with_index.mjs` 통과
  * `git diff --check` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/run_parser_golden.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `python3 harness/scripts/check_diagnostic_report.py` 통과
  * `python3 harness/scripts/check_modal_escape.py` 통과
  * `python3 harness/scripts/check_cache_date_sort.py` 통과
  * `python3 harness/scripts/check_capability_notice.py` 통과
  * `python3 harness/scripts/check_cache_privacy.py` 통과
  * `python3 harness/scripts/check_performance_smoke.py` 통과
  * `PYTHONDONTWRITEBYTECODE=1 python3 -c "from tools.parse_kakao_chat import main; print(main.__name__)"` 통과
  * `npm run test:browser` 통과

## 2-1-64단계: 로컬 정적 서버 표준화와 ES module 재전환 (2026-06-07)
* 분류:
  * standard 아키텍처 계약 변경. 사용자 기능/플랫폼 지원 범위 변경 없음.
* 결정:
  * 공식 서비스 제공 경로는 GitHub Pages로 유지한다.
  * 로컬 개발/검증은 `file://` 직접 실행 대신 정적 서버의 `http://127.0.0.1:<port>/` 경로를 표준으로 삼는다.
  * `file://` 직접 실행은 일부 브라우저에서 외부 module script 로딩이 차단될 수 있으므로 공식 검증 경로로 보장하지 않는다.
  * 앱 JS는 빌드 산출물 없이 ES module 경계를 사용한다.
* 변경:
  * `index.html`의 앱 스크립트 로드를 `type="module"`로 재전환
  * `assets/scripts/domain/chat-domain.js`를 ES module export 경계로 복원하고 `assets/scripts/app.js`가 import하도록 변경
  * `scripts/start-local-server.sh`, `scripts/start-local-server.ps1` 로컬 정적 서버 실행 스크립트 추가
  * `package.json`에 `dev`, `dev:sh`, `dev:ps1` 실행 명령 추가
  * Node VM 하네스 `harness/scripts/parse_with_index.mjs`가 실제 도메인 ES module을 import한 뒤 VM context에 주입하도록 변경
  * `harness/scripts/check_doc_drift.py`가 앱 ES module import 경로를 함께 읽어 런타임 파서 문서 검사를 유지하도록 변경
  * README, AGENTS, harness MANIFEST, harness DECISIONS, harness TESTING에 GitHub Pages 공식 서비스 경로와 로컬 정적 서버 검증 경로를 반영
  * 앱 버전 값을 `2026-06-07-local-server-esm`으로 갱신
* 검증:
  * `node --check assets/scripts/app.js` 통과
  * `node --check assets/scripts/domain/chat-domain.js` 통과
  * `node --check harness/scripts/parse_with_index.mjs` 통과
  * `sh -n scripts/start-local-server.sh` 통과
  * `python3 -m http.server` 기반 `scripts/start-local-server.sh 8765` 실행 후 `http://127.0.0.1:8765/` 응답 확인
  * `git diff --check` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/run_parser_golden.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `python3 harness/scripts/check_diagnostic_report.py` 통과
  * `python3 harness/scripts/check_modal_escape.py` 통과
  * `python3 harness/scripts/check_cache_date_sort.py` 통과
  * `python3 harness/scripts/check_capability_notice.py` 통과
  * `python3 harness/scripts/check_cache_privacy.py` 통과
  * `python3 harness/scripts/check_performance_smoke.py` 통과
  * `PYTHONDONTWRITEBYTECODE=1 python3 -c "from tools.parse_kakao_chat import main; print(main.__name__)"` 통과
  * PowerShell 스크립트 실행 검증은 macOS 환경에 `pwsh`가 없으면 미실행
  * `npm run test:browser` 통과

## 2-1-65단계: UI 없는 대화 파싱 코어 분리 (2026-06-10)
* 분류:
  * implementation-only 아키텍처 리팩터링. 사용자 기능/플랫폼 지원 범위 변경 없음.
* 결정:
  * 작은 앱 특성을 고려해 모듈을 과하게 세분화하지 않고, `chat-core.js` 단일 경계만 추가한다.
  * `assets/scripts/chat-core.js`는 대화 파싱/병합 결과 객체를 반환하고, `assets/scripts/app.js`는 그 결과를 앱 전역 상태에 반영한다.
  * 분리 목적은 파일 길이 축소가 아니라 플랫폼 파싱 규칙과 UI 상태 결합을 낮추는 것이다.
* 변경:
  * `parseKakaoChat`, macOS CSV 파싱, `parseMergedChatFiles`, 날짜 정렬을 `assets/scripts/chat-core.js`로 이동
  * 파일 하나짜리 `domain/` 디렉터리를 제거하고 저수준 도메인 헬퍼 경로를 `assets/scripts/chat-domain.js`로 단순화
  * `assets/scripts/app.js`는 `parseKakaoChatCore`, `parseMergedChatFilesCore` 결과를 `applyParsedChatResult`로 반영하도록 변경
  * Node VM 하네스 `harness/scripts/parse_with_index.mjs`가 `chat-core.js` ES module import를 주입하도록 변경
  * Playwright browser smoke가 `assets/scripts/chat-core.js` 리소스 로드를 확인하도록 변경
  * AGENTS, harness MANIFEST, harness DECISIONS, harness TESTING, doc drift checker에 새 코어 경계 반영
  * 앱 버전 값을 `2026-06-10-chat-domain-flat`로 갱신
* 검증:
  * `node --check assets/scripts/app.js` 통과
  * `node --check assets/scripts/chat-core.js` 통과
  * `node --check assets/scripts/chat-domain.js` 통과
  * `node --check harness/scripts/parse_with_index.mjs` 통과
  * `git diff --check` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/run_parser_golden.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `python3 harness/scripts/check_diagnostic_report.py` 통과
  * `python3 harness/scripts/check_modal_escape.py` 통과
  * `python3 harness/scripts/check_cache_date_sort.py` 통과
  * `python3 harness/scripts/check_capability_notice.py` 통과
  * `python3 harness/scripts/check_cache_privacy.py` 통과
  * `python3 harness/scripts/check_performance_smoke.py` 통과
  * `PYTHONDONTWRITEBYTECODE=1 python3 -c "from tools.parse_kakao_chat import main; print(main.__name__)"` 통과
  * `npm run test:browser` 통과

## 2-1-66단계: 앱 전역 상태 appState 명시화 (2026-06-10)
* 분류:
  * implementation-only 아키텍처 리팩터링. 사용자 기능/플랫폼 지원 범위 변경 없음.
* 결정:
  * 새 상태 관리 파일이나 라이브러리를 만들지 않고, `assets/scripts/app.js` 내부 상태를 `appState` 단일 객체로 모은다.
  * 진단 리포트용 `diagnosticState`와 DOM 참조는 성격이 달라 이번 범위에서 분리하지 않는다.
* 변경:
  * `messages`, `messagesByDate`, `attachmentFiles`, `attachmentEntries`, `zipInstance`, `dates`, `leaderCountByDate`, `currentMonth`, `selectedDate`, `renderedChatDate`, `leaderFilterActive`, `leaderFilterTarget`, `detectedPlatform`을 `appState` 필드로 이동
  * 파싱 결과 반영, 캐시 복원, 첨부파일 매핑, 캘린더/날짜 선택, 사용자 필터, 테스트 스냅샷이 `appState`를 읽고 쓰도록 갱신
  * AGENTS 전역 상태 설명을 `appState` 기준으로 갱신
  * 앱 버전 값을 `2026-06-10-app-state`로 갱신
* 검증:
  * `node --check assets/scripts/app.js` 통과
  * `node --check assets/scripts/chat-core.js` 통과
  * `node --check assets/scripts/chat-domain.js` 통과
  * `node --check harness/scripts/parse_with_index.mjs` 통과
  * `git diff --check` 통과
  * `python3 harness/scripts/check_doc_drift.py` 통과
  * `python3 harness/scripts/run_parser_golden.py` 통과
  * `python3 harness/scripts/check_ui_smoke.py` 통과
  * `python3 harness/scripts/check_diagnostic_report.py` 통과
  * `python3 harness/scripts/check_modal_escape.py` 통과
  * `python3 harness/scripts/check_cache_date_sort.py` 통과
  * `python3 harness/scripts/check_capability_notice.py` 통과
  * `python3 harness/scripts/check_cache_privacy.py` 통과
  * `python3 harness/scripts/check_performance_smoke.py` 통과
  * `PYTHONDONTWRITEBYTECODE=1 python3 -c "from tools.parse_kakao_chat import main; print(main.__name__)"` 통과
  * `npm run test:browser` 통과

## 테스트 이력

### 2026-02-05: 첨부파일 로드 성능 테스트
* **테스트 환경**: Node.js (Windows)
* **테스트 파일**: `Kakaotalk_Chat_[채상욱의 머니버스] 회원전용 커뮤니티_20260127_215546.zip`
  * 파일 크기: 221MB, 총 파일 수: 166개, 첨부파일: 165개
* **테스트 결과**:
  | 방식 | 처리 시간 | 비고 |
  |------|----------|------|
  | 순차 처리 | 7,942ms | **채택** |
  | 병렬 처리 | 10,075ms | 27% 느림 |
* **결론**: 병렬 처리(Promise.all)가 오히려 27% 느림 (CPU 바운드). 순차 처리 유지 + 프로그레스 바 점진적 표시
* **적용**: 첨부파일 로드 순차 처리, 리더 비중 계산은 파싱 시점에 사전 계산
