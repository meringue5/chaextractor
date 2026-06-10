// ========== KakaoTalk chat domain helpers ==========

export const DELETED_MESSAGE = '메시지가 삭제되었습니다.';

// 여러 언어/버전을 지원하기 위한 패턴 배열
export const PATTERNS = {
    // iOS 날짜 헤더 (여러 변형 지원)
    DATE_HEADER: [
        // 한국어: "2024년 1월 27일 월요일" 또는 "------------------ 2024년 1월 27일 월요일 ------------------"
        /^-*\s*(\d{4})년 (\d{1,2})월 (\d{1,2})일 [월화수목금토일]요일\s*-*$/,
        // TODO: 영어, 일본어 등 다른 언어 패턴 추가 예정
    ],
    // Android 날짜 구분선: 2026년 2월 8일 오후 3:17 (사용자/내용 없음)
    DATE_HEADER_ANDROID: [
        /^(\d{4})년 (\d{1,2})월 (\d{1,2})일 (오전|오후) \d{1,2}:\d{2}$/,
    ],
    // iOS 메시지 패턴 (여러 변형 지원)
    MESSAGE_IOS: [
        // 24시간 형식: 2026. 1. 27. 21:37, 사용자 : 내용 (초 선택적)
        /^(\d{4})\. (\d{1,2})\. (\d{1,2})\. (\d{2}):(\d{2})(?::(\d{2}))?, (.+?) : (.*)$/,
        // 12시간 형식: 2025. 9. 15. 오후 10:48, 사용자 : 내용 (초 선택적)
        /^(\d{4})\. (\d{1,2})\. (\d{1,2})\. (오전|오후) (\d{1,2}):(\d{2})(?::(\d{2}))?, (.+?) : (.*)$/,
        // TODO: 영어, 일본어 등 다른 언어 패턴 추가 예정
    ],
    // Android 메시지 패턴: 2016년 2월 5일 오전 1:33, 사용자 : 내용
    MESSAGE_ANDROID: [
        /^(\d{4})년 (\d{1,2})월 (\d{1,2})일 (오전|오후) (\d{1,2}):(\d{2}), (.+?) : (.*)$/,
    ],
    // ENTER/LEAVE 통합 (성능 최적화) - 초 선택적
    ENTER_LEAVE: [
        // 24시간 형식
        /^\d{4}\. \d{1,2}\. \d{1,2}\. \d{2}:\d{2}(?::\d{2})?: .+?님이 (?:들어왔습니다|나갔습니다)\.$/,
        // 12시간 형식 (오전/오후)
        /^\d{4}\. \d{1,2}\. \d{1,2}\. (오전|오후) \d{1,2}:\d{2}(?::\d{2})?: .+?님이 (?:들어왔습니다|나갔습니다)\.$/,
    ],
    ENTER_LEAVE_ANDROID: [
        /^\d{4}년 \d{1,2}월 \d{1,2}일 (오전|오후) \d{1,2}:\d{2}, .+?님이 (?:들어왔습니다|나갔습니다)\.$/,
    ],
    // Windows 날짜 구분선: --------------- 2025년 11월 9일 일요일 ---------------
    DATE_HEADER_WINDOWS: [
        /^-+ (\d{4})년 (\d{1,2})월 (\d{1,2})일 [월화수목금토일]요일 -+$/,
    ],
    // Windows 메시지: [사용자] [오전/오후 H:MM] 내용
    MESSAGE_WINDOWS: [
        /^\[(.+?)\] \[(오전|오후) (\d{1,2}):(\d{2})\] (.*)$/,
    ],
    // macOS CSV Date 컬럼: 2026-05-17 21:28:15
    DATETIME_MACOS_CSV: /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/,
    // Windows 입장/퇴장 (타임스탬프 없음)
    ENTER_LEAVE_WINDOWS: [
        /^.+?님이 (?:들어왔습니다|나갔습니다)\.$/,
    ],
    URL: /https?:\/\/[^\s]+/g,
    // iOS 첨부파일 패턴: 20250725_200815_1.jpeg
    ATTACHMENT_FILENAME_IOS: /^(\d{8})_(\d{6})(?:_\d+)?\.(jpeg|jpg|png|webp|pdf)$/i,
    // Android 첨부파일 패턴: 64자리 hex hash
    ATTACHMENT_FILENAME_ANDROID: /^[0-9a-f]{64}\.(jpg|jpeg|png|gif|webp)$/i,
    // Android 일반 파일: 대화 내용에 "파일: {파일명}"으로 직접 등장하는 문서 파일
    ATTACHMENT_FILENAME_ANDROID_FILE: /^.+\.(pdf|doc|docx|xls|xlsx|ppt|pptx|hwp|hwpx|zip)$/i
};

// 패턴 배열을 순차적으로 테스트하는 헬퍼 함수
export function testPatternArray(line, patternArray) {
    for (const pattern of patternArray) {
        if (pattern.test(line)) return true;
    }
    return false;
}

// 패턴 배열을 순차적으로 실행하여 매칭되는 첫 번째 결과 반환
export function execPatternArray(line, patternArray) {
    for (const pattern of patternArray) {
        const match = pattern.exec(line);
        if (match) return match;
    }
    return null;
}

export function containsUrl(text) {
    PATTERNS.URL.lastIndex = 0;
    return PATTERNS.URL.test(text);
}

// 첨부파일 여부 확인 (iOS/Android 패턴 모두 지원)
export function isAttachmentFile(filename) {
    return PATTERNS.ATTACHMENT_FILENAME_IOS.test(filename) ||
           PATTERNS.ATTACHMENT_FILENAME_ANDROID.test(filename) ||
           PATTERNS.ATTACHMENT_FILENAME_ANDROID_FILE.test(filename);
}

// 첨부파일 파일명 파싱 (iOS/Android 패턴 모두 지원)
export function parseAttachmentFilename(filename) {
    // iOS 패턴 시도
    let match = PATTERNS.ATTACHMENT_FILENAME_IOS.exec(filename);
    if (match) {
        const [, dateStr, timeStr, ext] = match;
        const dt = new Date(
            parseInt(dateStr.slice(0, 4)),
            parseInt(dateStr.slice(4, 6)) - 1,
            parseInt(dateStr.slice(6, 8)),
            parseInt(timeStr.slice(0, 2)),
            parseInt(timeStr.slice(2, 4)),
            parseInt(timeStr.slice(4, 6))
        );
        const type = ['jpeg', 'jpg', 'png', 'webp'].includes(ext.toLowerCase()) ? 'image' : 'pdf';
        return { filename, datetime: dt, type, used: false };
    }

    // Android 패턴 시도 (64자리 hex hash - 날짜 정보 없음)
    match = PATTERNS.ATTACHMENT_FILENAME_ANDROID.exec(filename);
    if (match) {
        return { filename, datetime: null, type: 'image', used: false };
    }

    return null;
}

export function detectPlatform(chatFilenames, attachFilenames) {
    // 대화 파일명으로 우선 감지
    for (const name of chatFilenames) {
        const base = name.split('/').pop();
        if (/Talk_.*\.txt$/i.test(base)) return 'ios';
        if (/KakaoTalkChats\.txt$/i.test(base)) return 'android';
        // Windows: KakaoTalk_YYYYMMDD_HHMM_SS_nnn_*.txt
        if (/^KakaoTalk_\d{8}_\d{4}_\d{2}_\d+.*\.txt$/i.test(base)) return 'windows';
        // macOS: KakaoTalk_Chat_[room]_YYYY-MM-DD-HH-MM-SS.csv
        if (/^KakaoTalk_Chat_.*_\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.csv$/i.test(base)) return 'macos';
        if (/\.csv$/i.test(base)) return 'macos';
    }
    // 첨부파일명으로 보조 감지
    for (const name of attachFilenames) {
        const base = name.split('/').pop();
        if (PATTERNS.ATTACHMENT_FILENAME_IOS.test(base)) return 'ios';
        if (PATTERNS.ATTACHMENT_FILENAME_ANDROID.test(base)) return 'android';
    }
    return 'ios'; // 기본값: iOS (기존 동작 유지)
}

export function parseCsvRecords(content, maxRecords = Infinity) {
    const records = [];
    let record = [];
    let field = '';
    let inQuotes = false;
    let i = content.charCodeAt(0) === 0xFEFF ? 1 : 0;

    while (i < content.length) {
        const ch = content[i];

        if (inQuotes) {
            if (ch === '"') {
                if (content[i + 1] === '"') {
                    field += '"';
                    i += 2;
                    continue;
                }
                inQuotes = false;
                i++;
                continue;
            }

            field += ch;
            i++;
            continue;
        }

        if (ch === '"') {
            inQuotes = true;
            i++;
            continue;
        }

        if (ch === ',') {
            record.push(field);
            field = '';
            i++;
            continue;
        }

        if (ch === '\r' || ch === '\n') {
            if (ch === '\r' && content[i + 1] === '\n') i++;
            record.push(field);
            records.push(record);
            if (records.length >= maxRecords) return records;
            record = [];
            field = '';
            i++;
            continue;
        }

        field += ch;
        i++;
    }

    if (field.length > 0 || record.length > 0) {
        record.push(field);
        records.push(record);
    }

    return records;
}

export function normalizeCsvHeaderCell(value) {
    return String(value || '').replace(/^\uFEFF/, '').trim();
}

export function isMacOSCsvHeader(row) {
    if (!row || row.length < 3) return false;
    return normalizeCsvHeaderCell(row[0]) === 'Date' &&
        normalizeCsvHeaderCell(row[1]) === 'User' &&
        normalizeCsvHeaderCell(row[2]) === 'Message';
}

export function isMacOSCsvContent(content) {
    return isMacOSCsvHeader(parseCsvRecords(content, 1)[0]);
}

export function parseMacOSDateTime(value) {
    const match = PATTERNS.DATETIME_MACOS_CSV.exec(String(value || '').trim());
    if (!match) return null;

    const [, year, month, day, hour, minute] = match;
    const dateStr = `${year}-${month}-${day}`;
    const timeStr = `${hour}:${minute}`;
    return {
        date: dateStr,
        time: timeStr,
        datetime: `${dateStr} ${timeStr}`
    };
}

export function isMacOSSystemMessage(content) {
    const stripped = String(content || '').trim();
    return stripped === DELETED_MESSAGE ||
        stripped === '관리자가 메시지를 가렸습니다.' ||
        /^.+?님이 (?:들어왔습니다|나갔습니다)\.$/.test(stripped);
}

export function validateMacOSCsvFile(content) {
    const records = parseCsvRecords(content, 100);
    if (!isMacOSCsvHeader(records[0])) return false;

    for (let i = 1; i < records.length; i++) {
        const row = records[i];
        if (!row || row.length < 3) continue;

        const dateRaw = String(row[0] || '').trim();
        const user = String(row[1] || '').trim();
        const message = row.slice(2).join(',');

        if (!dateRaw && !user && isMacOSSystemMessage(message)) continue;
        if (parseMacOSDateTime(dateRaw) && user) return true;
    }

    return false;
}

export function classifyContent(content) {
    const stripped = content.trim();

    if (stripped === '사진') {
        return { type: 'photo', attachType: 'photo', attachRef: '' };
    } else if (/^사진 \d+장$/.test(stripped)) {
        // Windows: 사진 N장
        return { type: 'photo', attachType: 'photo', attachRef: '' };
    } else if (stripped === '이모티콘') {
        return { type: 'emoticon', attachType: 'emoticon', attachRef: '' };
    } else if (stripped.startsWith('파일: ')) {
        const filename = stripped.slice(4).trim();
        return { type: 'file', attachType: 'file', attachRef: filename };
    } else if (PATTERNS.ATTACHMENT_FILENAME_ANDROID.test(stripped)) {
        // Android: 내용이 직접 hash 파일명
        return { type: 'photo', attachType: 'photo', attachRef: stripped };
    }

    return { type: 'text', attachType: '', attachRef: '' };
}
