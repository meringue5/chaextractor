# chaextractor Harness

이 디렉터리는 테스트 코드만을 뜻하지 않는다. 여기서 하네스는 에이전트와 사람이 같은 기준으로 작업하기 위한 프로젝트 계약 레이어다.

하네스의 역할:

- 요구사항으로 정의된 것과 구현으로만 존재하는 것을 분리한다.
- 보안, 개인정보, 아키텍처처럼 기능보다 상위에 있는 표준을 명시한다.
- 새 기능이나 수정이 들어올 때 문서, fixture, 테스트, 이력을 함께 움직이게 한다.
- 구현이 문서보다 앞서가거나 문서가 구현보다 뒤처지는 드리프트를 조기에 드러낸다.

현재 기준 문서:

- [MANIFEST.md](MANIFEST.md): 요구사항/표준/구현-only/미결정 항목의 현재 분류
- [REQUIREMENTS.md](REQUIREMENTS.md): 기능/화면/비기능 요구사항
- [DOMAIN_RULES.md](DOMAIN_RULES.md): 카카오톡 플랫폼별 내보내기 규칙과 파싱 불변식
- [DECISIONS.md](DECISIONS.md): HISTORY에서 추린 현재 유효한 기술/제품 결정
- [BACKLOG.md](BACKLOG.md): 하네스 리뷰에서 나온 미반영 실행 과제
- [TESTING.md](TESTING.md): 현재 사용 가능한 검증 명령과 예정 검증
- [reviews/2026-05-17.md](reviews/2026-05-17.md): 2026-05-17 기준 하네스 검토 결과
- [../INSTRUCTIONS.md](../INSTRUCTIONS.md): 사람/모든 LLM/에이전트용 공통 작업 진입점과 코드 구조 맵
- [../AGENTS.md](../AGENTS.md), [../CLAUDE.md](../CLAUDE.md): 특정 도구의 자동 인식 관례를 위한 얇은 어댑터
- [../HISTORY.md](../HISTORY.md): 프로젝트 진행 이력

관련 project skills:

- [../.agents/skills/chaextractor-maintainer/SKILL.md](../.agents/skills/chaextractor-maintainer/SKILL.md): 하네스/요구사항/구현/문서 드리프트 방지
- [../.agents/skills/chaextractor-tester/SKILL.md](../.agents/skills/chaextractor-tester/SKILL.md): 테스트, fixture, 회귀 검증, 증거 수집

현재 `.agents/skills/`는 project-specific skill 절차 문서다. 특정 도구가 자동 skill로 인식하지 못하면 `SKILL.md`를 직접 읽는다.

운영 원칙:

1. `index.html`에 동작이 추가되어도 이 매니페스트에 분류되기 전까지는 공식 요구사항이 아니다.
2. `README.md`에 공개 약속을 추가할 때는 `INSTRUCTIONS.md`와 이 매니페스트의 범위도 함께 맞춘다. 특정 도구의 진입점이 바뀌면 어댑터 문서도 함께 맞춘다.
3. 플랫폼 파서 규칙을 바꿀 때는 fixture와 expected 결과를 함께 만든다.
4. 보안/개인정보 표준을 바꾸려면 구현보다 먼저 이 디렉터리에서 의도를 명시한다.
