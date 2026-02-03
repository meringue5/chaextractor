"""
카카오톡 대화 내역 파서
대화 내용을 CSV로 변환합니다.

사용법:
    python parse_kakao_chat.py [input_file] [output_file]

    기본값:
    - input_file: data/Talk_2026.1.27 21_37-1.txt
    - output_file: parsed_chat.csv
"""

import re
import csv
import sys
from pathlib import Path
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional


@dataclass
class ChatMessage:
    """파싱된 채팅 메시지"""
    datetime: str
    date: str
    time: str
    user: str
    message_type: str  # text, photo, file, emoticon
    content: str
    has_attachment: bool = False
    attachment_type: str = ""
    attachment_ref: str = ""  # 원본 파일명 (파일: 메시지에서)
    attachment_path: str = ""  # data 폴더 내 실제 파일 경로
    has_link: bool = False
    word_count: int = 0


class AttachmentMapper:
    """data 폴더의 첨부파일과 메시지 타임스탬프 매핑"""

    # 파일명 패턴: YYYYMMDD_HHMMSS(_n)?.(ext)
    FILENAME_PATTERN = re.compile(r'^(\d{8})_(\d{6})(?:_\d+)?\.(jpeg|jpg|png|webp|pdf)$')

    def __init__(self, data_dir: Path):
        self.data_dir = data_dir
        self.files: dict[str, list[tuple[datetime, Path]]] = {
            'image': [],  # jpeg, jpg, png, webp
            'pdf': []
        }
        self._scan_files()

    def _scan_files(self):
        """data 폴더의 파일들을 스캔하여 타임스탬프별로 정리"""
        if not self.data_dir.exists():
            return

        for file_path in self.data_dir.iterdir():
            if not file_path.is_file():
                continue

            match = self.FILENAME_PATTERN.match(file_path.name)
            if not match:
                continue

            date_str, time_str, ext = match.groups()
            try:
                file_dt = datetime.strptime(f"{date_str}_{time_str}", "%Y%m%d_%H%M%S")
            except ValueError:
                continue

            if ext in ('jpeg', 'jpg', 'png', 'webp'):
                self.files['image'].append((file_dt, file_path))
            elif ext == 'pdf':
                self.files['pdf'].append((file_dt, file_path))

        # 시간순 정렬
        for key in self.files:
            self.files[key].sort(key=lambda x: x[0])

    def find_attachment(self, msg_datetime: str, file_type: str,
                        tolerance_minutes: int = 30) -> Optional[str]:
        """
        메시지 시간에 가장 가까운 첨부파일 찾기

        Args:
            msg_datetime: 메시지 시간 (YYYY-MM-DD HH:mm)
            file_type: 'image' 또는 'pdf'
            tolerance_minutes: 허용 시간 차이 (분)

        Returns:
            매칭된 파일의 상대 경로 또는 None
        """
        if file_type not in self.files or not self.files[file_type]:
            return None

        try:
            msg_dt = datetime.strptime(msg_datetime, "%Y-%m-%d %H:%M")
        except ValueError:
            return None

        tolerance = timedelta(minutes=tolerance_minutes)
        best_match = None
        best_diff = tolerance

        for file_dt, file_path in self.files[file_type]:
            diff = abs(file_dt - msg_dt)
            if diff < best_diff:
                best_diff = diff
                best_match = file_path

        if best_match:
            # 사용된 파일은 목록에서 제거 (중복 매핑 방지)
            self.files[file_type] = [
                (dt, fp) for dt, fp in self.files[file_type]
                if fp != best_match
            ]
            return f"data/{best_match.name}"

        return None


class KakaoChatParser:
    """카카오톡 대화 파서"""

    # 정규식 패턴
    DATE_HEADER = re.compile(r'^(\d{4})년 (\d{1,2})월 (\d{1,2})일 [월화수목금토일]요일$')
    MESSAGE = re.compile(r'^(\d{4})\. (\d{1,2})\. (\d{1,2})\. (\d{2}):(\d{2}), (.+?) : (.*)$')
    ENTER = re.compile(r'^(\d{4})\. (\d{1,2})\. (\d{1,2})\. (\d{2}):(\d{2}): .+?님이 들어왔습니다\.$')
    LEAVE = re.compile(r'^(\d{4})\. (\d{1,2})\. (\d{1,2})\. (\d{2}):(\d{2}): .+?님이 나갔습니다\.$')
    DELETED = re.compile(r'^메시지가 삭제되었습니다\.$')
    URL = re.compile(r'https?://[^\s]+')

    def __init__(self, input_file: str, data_dir: Optional[str] = None):
        self.input_file = Path(input_file)
        self.messages: list[ChatMessage] = []
        self.current_date: Optional[str] = None

        # data 폴더 설정
        if data_dir:
            self.data_dir = Path(data_dir)
        else:
            self.data_dir = self.input_file.parent

        self.attachment_mapper = AttachmentMapper(self.data_dir)

    def parse(self) -> list[ChatMessage]:
        """대화 파일을 파싱하여 메시지 리스트 반환"""
        self.messages = []
        self.current_date = None
        last_message: Optional[ChatMessage] = None

        with open(self.input_file, 'r', encoding='utf-8-sig') as f:
            for line_num, line in enumerate(f, 1):
                line = line.rstrip('\n')

                # 헤더 행 스킵 (1-5행)
                if line_num <= 5:
                    continue

                # 빈 줄 스킵
                if not line.strip():
                    continue

                # 날짜 헤더 처리
                date_match = self.DATE_HEADER.match(line)
                if date_match:
                    year, month, day = date_match.groups()
                    self.current_date = f"{year}-{int(month):02d}-{int(day):02d}"
                    continue

                # 시스템 메시지 스킵 (입장, 퇴장, 삭제)
                if self.ENTER.match(line) or self.LEAVE.match(line) or self.DELETED.match(line):
                    continue

                # 일반 메시지 처리
                msg_match = self.MESSAGE.match(line)
                if msg_match:
                    year, month, day, hour, minute, user, content = msg_match.groups()

                    date_str = f"{year}-{int(month):02d}-{int(day):02d}"
                    time_str = f"{hour}:{minute}"
                    datetime_str = f"{date_str} {time_str}"

                    # 메시지 타입 및 첨부파일 판별
                    msg_type, attach_type, attach_ref = self._classify_content(content)
                    has_link = bool(self.URL.search(content))

                    # 첨부파일인 경우 data 폴더에서 실제 파일 매핑
                    attach_path = ""
                    if msg_type == "photo":
                        attach_path = self.attachment_mapper.find_attachment(
                            datetime_str, 'image'
                        ) or ""
                    elif msg_type == "file" and attach_ref.lower().endswith('.pdf'):
                        attach_path = self.attachment_mapper.find_attachment(
                            datetime_str, 'pdf'
                        ) or ""

                    # 첨부파일이면 병합하지 않고 새 메시지로
                    is_attachment = msg_type in ('photo', 'file', 'emoticon')

                    # 연속 발화 병합: 같은 사용자의 연속 텍스트 메시지만
                    if (not is_attachment and
                        last_message and
                        last_message.user == user and
                        last_message.date == date_str and
                        last_message.message_type == 'text'):
                        # 이전 메시지에 줄바꿈으로 이어붙임
                        last_message.content += "\n" + content
                        last_message.word_count = self._count_words(last_message.content)
                        if has_link:
                            last_message.has_link = True
                    else:
                        # 새 메시지 생성
                        message = ChatMessage(
                            datetime=datetime_str,
                            date=date_str,
                            time=time_str,
                            user=user,
                            message_type=msg_type,
                            content=content,
                            has_attachment=bool(attach_type),
                            attachment_type=attach_type,
                            attachment_ref=attach_ref,
                            attachment_path=attach_path,
                            has_link=has_link,
                            word_count=self._count_words(content)
                        )
                        self.messages.append(message)
                        last_message = message
                else:
                    # 메시지 패턴에 맞지 않는 줄 = 이전 메시지의 연속 (줄바꿈된 긴 발언)
                    if last_message and last_message.message_type == 'text':
                        last_message.content += "\n" + line
                        last_message.word_count = self._count_words(last_message.content)
                        if self.URL.search(line):
                            last_message.has_link = True

        return self.messages

    def _classify_content(self, content: str) -> tuple[str, str, str]:
        """
        메시지 내용을 분류
        Returns: (message_type, attachment_type, attachment_ref)
        """
        content_stripped = content.strip()

        if content_stripped == "사진":
            return ("photo", "photo", "")
        elif content_stripped == "이모티콘":
            return ("emoticon", "emoticon", "")
        elif content_stripped.startswith("파일: "):
            filename = content_stripped[4:].strip()
            return ("file", "file", filename)
        else:
            return ("text", "", "")

    def _count_words(self, text: str) -> int:
        """단어 수 계산 (공백 기준)"""
        return len(text.split())

    def to_csv(self, output_file: str):
        """메시지를 CSV 파일로 저장"""
        fieldnames = [
            'datetime', 'date', 'time', 'user', 'message_type', 'content',
            'has_attachment', 'attachment_type', 'attachment_ref', 'attachment_path',
            'has_link', 'word_count'
        ]

        with open(output_file, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()

            for msg in self.messages:
                writer.writerow({
                    'datetime': msg.datetime,
                    'date': msg.date,
                    'time': msg.time,
                    'user': msg.user,
                    'message_type': msg.message_type,
                    'content': msg.content,
                    'has_attachment': msg.has_attachment,
                    'attachment_type': msg.attachment_type,
                    'attachment_ref': msg.attachment_ref,
                    'attachment_path': msg.attachment_path,
                    'has_link': msg.has_link,
                    'word_count': msg.word_count
                })


def main():
    # 기본 파일 경로
    default_input = Path(__file__).parent / "data" / "Talk_2026.1.27 21_37-1.txt"
    default_output = Path(__file__).parent / "parsed_chat.csv"

    # 명령줄 인자 처리
    input_file = sys.argv[1] if len(sys.argv) > 1 else str(default_input)
    output_file = sys.argv[2] if len(sys.argv) > 2 else str(default_output)

    print(f"입력 파일: {input_file}")
    print(f"출력 파일: {output_file}")

    # 파싱 실행
    parser = KakaoChatParser(input_file)
    messages = parser.parse()

    print(f"파싱 완료: {len(messages)}개 메시지")

    # CSV 저장
    parser.to_csv(output_file)
    print(f"CSV 저장 완료: {output_file}")

    # 간단한 통계
    users = set(msg.user for msg in messages)
    dates = set(msg.date for msg in messages)
    photos = sum(1 for msg in messages if msg.message_type == "photo")
    files = sum(1 for msg in messages if msg.message_type == "file")
    emoticons = sum(1 for msg in messages if msg.message_type == "emoticon")
    links = sum(1 for msg in messages if msg.has_link)
    mapped_attachments = sum(1 for msg in messages if msg.attachment_path)

    print(f"\n=== 통계 ===")
    print(f"참여자 수: {len(users)}명")
    print(f"대화 일수: {len(dates)}일")
    print(f"사진: {photos}건")
    print(f"파일: {files}건")
    print(f"이모티콘: {emoticons}건")
    print(f"링크 포함: {links}건")
    print(f"첨부파일 매핑: {mapped_attachments}건")


if __name__ == "__main__":
    main()
