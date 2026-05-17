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

검증 범위:

- 메시지 수
- 날짜 수와 날짜 목록
- 메시지 타입별 개수
- 연속 텍스트 병합
- 시스템 메시지 제외
- Android hash 이미지와 연속 사진 줄
- iOS 사진/PDF 타임스탬프 매핑
- 누락 첨부파일의 비중단 처리

### 기본 문서/도구 검사

```bash
git diff --check
ruby -e 'Dir["*.md", "harness/*.md", "harness/reviews/*.md", "tools/*.md", ".agents/skills/*/SKILL.md"].each do |file|; dir = File.dirname(file); File.readlines(file).each_with_index do |line, idx|; line.scan(/\[[^\]]+\]\(([^)#]+\.md)\)/).each do |match|; target = match[0]; path = File.expand_path(target, dir); puts "#{file}:#{idx + 1}: missing #{target}" unless File.exist?(path); end; end; end'
PYTHONDONTWRITEBYTECODE=1 python3 -c "from tools.parse_kakao_chat import main; print(main.__name__)"
```

## 예정 명령

- doc drift checker: README/AGENTS/harness/index.html의 플랫폼, 의존성, 공개 약속 일치 여부
- browser smoke: 업로드, 날짜 선택, 검색, 리더 필터, 설정, 이미지 모달, 모바일 사이드바
- performance smoke: 합성 대용량 로그 파싱 시간과 날짜 단위 렌더링 부담
