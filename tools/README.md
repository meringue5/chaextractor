# chaextractor Tools

이 디렉터리는 본 앱 런타임이 아닌 선택 유틸리티를 둔다.

현재 유틸리티:

- `parse_kakao_chat.py`: iOS 카카오톡 대화 txt를 CSV로 변환하는 보조 파서

실행:

```bash
python3 tools/parse_kakao_chat.py [input_file] [output_file]
```

기준:

- 제품의 기준 구현은 루트의 `index.html`이다.
- tools 아래 스크립트는 배포 앱의 필수 런타임이 아니다.
- 파서 규칙을 바꾸면 `harness/DOMAIN_RULES.md`와 fixture/expected도 함께 갱신한다.
- Python 유틸은 독립 사용 가능성을 남기되, README에서는 대안 경로로만 안내한다.
