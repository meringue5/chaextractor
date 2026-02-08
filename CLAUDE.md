# Claude Code 작업 시작 지침

## 첫 번째 할 일
**AGENTS.md 파일을 반드시 읽고 숙지하세요.**

AGENTS.md에는 다음 중요한 내용이 포함되어 있습니다:
- 프로젝트 의도 및 목적
- 파일 구조 (index.html의 HTML/CSS/JS 섹션별 상세 설명)
- 원본 파일 패턴 (카카오톡 대화 내역, 첨부파일 명명 규칙)
- 대화 내용 패턴 (파싱 규칙)
- 진행 상황 (완료된 단계, 현재 작업)
- 작업 지침 및 주의사항
- 테스트 절차 및 이력

## 프로젝트 개요
- **목적**: 카카오톡 대화 내역 뷰어
- **기술**: 단일 HTML 파일 (index.html), 서버 불필요, 클라이언트 사이드 처리
- **배포**: https://meringue5.github.io/chaextractor/
- **플랫폼 지원**: iOS, Android (첨부파일 및 대화 패턴 모두 지원)

## 핵심 작업 규칙
1. **단일 HTML 파일 유지**: 모든 기능을 index.html에 통합
2. **모바일 반응형 필수**: 900px 이하 미디어쿼리 적용
3. **브라우저 호환성**: Chrome, Safari, Edge, Firefox 모두 지원
4. **리더 하이라이트 기능 유지**: 채상욱 리더 발언을 황금색으로 강조
5. **플랫폼 호환성**: iOS/Android 파일 패턴 및 대화 패턴 모두 지원

## 최근 업데이트 (2026-02-07)

### Android 지원 추가
1. **폴더 업로드 개선**:
   - `multiple` 속성 추가 → 여러 파일 선택 가능
   - `accept="*/*"` 속성 추가 → 모든 파일 타입 허용
   - 안내 문구 개선 (Android 전체선택 가이드)

2. **Android 첨부파일 패턴 지원**:
   - iOS: `YYYYMMDD_HHMMSS(_n)?.(jpeg|jpg|png|webp|pdf)`
   - Android: `KakaoTalk_Photo_YYYY-MM-DD-HH-MM-SS[ NNN].(jpeg|jpg|png)`
   - `parseAttachmentFilename()` 함수로 자동 감지

3. **Android 대화 메시지 패턴 지원**:
   - iOS: `YYYY. M. D. HH:mm, 사용자 : 내용`
   - Android: `YYYY년 M월 D일 오전/오후 H:mm, 사용자 : 내용`
   - 오전/오후 → 24시간 형식 자동 변환
   - 입장/퇴장 시스템 메시지도 Android 패턴 지원

4. **UI 개선**:
   - guide-step 다크 테마 지원
   - 리스트 불릿 위치 수정

## 상세 정보
**모든 상세 정보는 AGENTS.md를 참고하세요.**
