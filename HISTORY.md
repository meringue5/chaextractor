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
