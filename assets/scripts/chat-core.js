import {
    DELETED_MESSAGE,
    PATTERNS,
    classifyContent,
    containsUrl,
    execPatternArray,
    isMacOSCsvContent,
    isMacOSCsvHeader,
    isMacOSSystemMessage,
    parseCsvRecords,
    parseMacOSDateTime,
    testPatternArray
} from './chat-domain.js';

function defaultIsLeader() {
    return false;
}

export function sortDatesDescending(dateKeys) {
    return [...new Set(dateKeys || [])].sort().reverse();
}

function createParseState(isLeader) {
    return {
        messages: [],
        messagesByDate: {},
        rawMessages: [],
        rawMessagesByDate: {},
        leaderCountByDate: {},
        rawLeaderCountByDate: {},
        isLeader: isLeader || defaultIsLeader
    };
}

function addMessageToState(state, msg) {
    if (!msg.id) {
        msg.id = `display-${state.messages.length}`;
    }
    state.messages.push(msg);

    if (!state.messagesByDate[msg.date]) {
        state.messagesByDate[msg.date] = [];
        state.leaderCountByDate[msg.date] = 0;
    }
    state.messagesByDate[msg.date].push(msg);

    if (state.isLeader(msg.user)) {
        state.leaderCountByDate[msg.date]++;
    }
}

function addRawMessageToState(state, msg) {
    const raw = {
        ...msg,
        id: `raw-${state.rawMessages.length}`,
        sequence: state.rawMessages.length,
        displayMessageId: '',
        rawMessageIds: undefined,
        charCount: String(msg.content || '').length,
        timePrecision: msg.timePrecision || 'minute',
        timeWithSeconds: msg.timeWithSeconds || msg.time,
        datetimeWithSeconds: msg.datetimeWithSeconds || msg.datetime,
        hasOriginalTimestamp: msg.hasOriginalTimestamp !== false,
        sourceLine: msg.sourceLine || null
    };

    state.rawMessages.push(raw);

    if (!state.rawMessagesByDate[raw.date]) {
        state.rawMessagesByDate[raw.date] = [];
        state.rawLeaderCountByDate[raw.date] = 0;
    }
    state.rawMessagesByDate[raw.date].push(raw);

    if (state.isLeader(raw.user)) {
        state.rawLeaderCountByDate[raw.date]++;
    }

    return raw;
}

function appendMessageContent(message, contentText, hasLink) {
    message.content += '\n' + contentText;
    if (hasLink) message.has_link = true;
    if (typeof message.charCount === 'number') {
        message.charCount = String(message.content || '').length;
    }
}

function shouldMergeDisplayMessage(lastMessage, raw) {
    return raw.message_type === 'text' &&
        lastMessage &&
        lastMessage.user === raw.user &&
        lastMessage.date === raw.date &&
        lastMessage.message_type === 'text';
}

function addRawMessageAsDisplay(state, raw, lastMessage) {
    if (shouldMergeDisplayMessage(lastMessage, raw)) {
        appendMessageContent(lastMessage, raw.content, raw.has_link);
        lastMessage.rawMessageIds.push(raw.id);
        lastMessage.rawEndIndex = raw.sequence;
        lastMessage.segmentCount = lastMessage.rawMessageIds.length;
        lastMessage.endDatetime = raw.datetime;
        lastMessage.endTime = raw.time;
        raw.displayMessageId = lastMessage.id;
        return lastMessage;
    }

    const msg = {
        datetime: raw.datetime,
        date: raw.date,
        time: raw.time,
        user: raw.user,
        message_type: raw.message_type,
        content: raw.content,
        has_attachment: raw.has_attachment,
        attachment_type: raw.attachment_type,
        attachment_ref: raw.attachment_ref,
        attachment_path: raw.attachment_path || '',
        has_link: raw.has_link,
        id: `display-${state.messages.length}`,
        rawMessageIds: [raw.id],
        rawStartIndex: raw.sequence,
        rawEndIndex: raw.sequence,
        segmentCount: 1,
        endDatetime: raw.datetime,
        endTime: raw.time
    };

    addMessageToState(state, msg);
    raw.displayMessageId = msg.id;
    return msg;
}

function addParsedMessageToState(state, msg, lastMessage) {
    const raw = addRawMessageToState(state, msg);
    return {
        raw,
        display: addRawMessageAsDisplay(state, raw, lastMessage)
    };
}

function buildResult(state, extra = {}) {
    return {
        messages: state.messages,
        messagesByDate: state.messagesByDate,
        rawMessages: state.rawMessages,
        rawMessagesByDate: state.rawMessagesByDate,
        leaderCountByDate: state.leaderCountByDate,
        rawLeaderCountByDate: state.rawLeaderCountByDate,
        dates: sortDatesDescending(Object.keys(state.messagesByDate)),
        detectedPlatform: null,
        ...extra
    };
}

function getSourceBasename(source) {
    return String(source?.filename || source?.name || source?.entryPath || '').split('/').pop();
}

function getChatSourceSortKey(source, fallbackIndex) {
    const basename = getSourceBasename(source);
    const iosSegmentMatch = /^Talk_(\d{4})\.(\d{1,2})\.(\d{1,2})\s+(\d{1,2})[:_](\d{2})-(\d+)\.txt$/i.exec(basename);
    if (iosSegmentMatch) {
        const [, year, month, day, hour, minute, segment] = iosSegmentMatch;
        return [
            Number(year),
            Number(month),
            Number(day),
            Number(hour),
            Number(minute),
            Number(segment)
        ];
    }

    return [Number.MAX_SAFE_INTEGER, fallbackIndex];
}

function compareSortKey(left, right) {
    const length = Math.max(left.length, right.length);
    for (let index = 0; index < length; index++) {
        const leftValue = left[index] ?? 0;
        const rightValue = right[index] ?? 0;
        if (leftValue !== rightValue) return leftValue - rightValue;
    }
    return 0;
}

function getMessageTimestampValue(message) {
    const timestamp = new Date(message?.datetimeWithSeconds || message?.datetime || '').getTime();
    return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER;
}

function getParsedSourceTimeKey(rawMessages) {
    if (!rawMessages || rawMessages.length === 0) {
        return [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER];
    }

    let firstTimestamp = Number.MAX_SAFE_INTEGER;
    let lastTimestamp = 0;

    for (const message of rawMessages) {
        const timestamp = getMessageTimestampValue(message);
        if (timestamp === Number.MAX_SAFE_INTEGER) continue;
        firstTimestamp = Math.min(firstTimestamp, timestamp);
        lastTimestamp = Math.max(lastTimestamp, timestamp);
    }

    if (firstTimestamp === Number.MAX_SAFE_INTEGER) {
        return [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER];
    }

    return [firstTimestamp, lastTimestamp];
}

function getMergedSourceOrder(source) {
    return [
        ...(source.timeKey || [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]),
        ...(source.sortKey || []),
        source.originalIndex ?? Number.MAX_SAFE_INTEGER
    ];
}

function normalizeChatSource(source, index) {
    if (typeof source === 'string') {
        return {
            content: source,
            name: '',
            filename: '',
            entryPath: '',
            originalIndex: index,
            sortKey: getChatSourceSortKey(null, index)
        };
    }

    return {
        content: source?.content || '',
        name: source?.name || '',
        filename: source?.filename || getSourceBasename(source),
        entryPath: source?.entryPath || '',
        originalIndex: index,
        sortKey: getChatSourceSortKey(source, index)
    };
}

function parseMacOSCsvChat(content, options = {}) {
    const records = parseCsvRecords(content);
    const state = createParseState(options.isLeader);

    if (!isMacOSCsvHeader(records[0])) {
        return buildResult(state, { detectedPlatform: 'macos' });
    }

    let lastMessage = null;
    let lastRawMessage = null;

    for (let i = 1; i < records.length; i++) {
        const row = records[i];
        if (!row || row.length < 3) continue;

        const parsedDate = parseMacOSDateTime(row[0]);
        const user = String(row[1] || '').trim();
        const contentText = row.slice(2).join(',').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        if (!parsedDate || !user) {
            continue;
        }

        if (isMacOSSystemMessage(contentText)) {
            continue;
        }

        const { type, attachType, attachRef } = classifyContent(contentText);
        const hasLink = containsUrl(contentText);
        const isAttachment = ['photo', 'file', 'emoticon'].includes(type);

        const { raw, display } = addParsedMessageToState(state, {
            datetime: parsedDate.datetime,
            datetimeWithSeconds: parsedDate.datetimeWithSeconds,
            date: parsedDate.date,
            time: parsedDate.time,
            timeWithSeconds: parsedDate.timeWithSeconds,
            timePrecision: parsedDate.timePrecision,
            user,
            message_type: type,
            content: contentText,
            has_attachment: !!attachType,
            attachment_type: attachType,
            attachment_ref: attachRef,
            attachment_path: '',
            has_link: hasLink,
            sourceLine: i + 1
        }, isAttachment ? null : lastMessage);

        lastRawMessage = raw;
        lastMessage = display;
    }

    return buildResult(state, { detectedPlatform: 'macos' });
}

export function parseKakaoChat(content, options = {}) {
    if (isMacOSCsvContent(content)) {
        return parseMacOSCsvChat(content, options);
    }

    const lines = content.split('\n');
    const state = createParseState(options.isLeader);

    let currentDate = null;
    let lastMessage = null;
    let lastRawMessage = null;
    let lineNum = 0;

    // for 루프 사용 (배열 메서드보다 빠름)
    for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i];
        lineNum++;
        const line = rawLine.replace(/\r$/, '');

        // 헤더 행 스킵 (1-5행)
        if (lineNum <= 5) continue;

        // 빈 줄 스킵
        if (!line.trim()) continue;

        // === 사전 필터링: 문자열 체크 먼저 (정규식 실행 70% 감소) ===
        const firstChar = line[0];
        const stripped = line.trim();

        // Android 연속 사진: 파일명만 있는 줄 (사용자/시간 없음)
        // hash는 숫자로 시작할 수 있으므로 날짜/숫자 분기보다 먼저 처리한다.
        if (PATTERNS.ATTACHMENT_FILENAME_ANDROID.test(stripped) && lastMessage) {
            const { raw, display } = addParsedMessageToState(state, {
                datetime: lastMessage.datetime,
                date: lastMessage.date,
                time: lastMessage.time,
                user: lastMessage.user,
                message_type: 'photo',
                content: stripped,
                has_attachment: true,
                attachment_type: 'photo',
                attachment_ref: stripped,
                attachment_path: '',
                has_link: false,
                hasOriginalTimestamp: false,
                sourceLine: lineNum
            }, null);
            lastRawMessage = raw;
            lastMessage = display;
            continue;
        }

        // Windows 날짜 구분선: --------------- 시작
        if (firstChar === '-') {
            const windowsDateMatch = execPatternArray(line, PATTERNS.DATE_HEADER_WINDOWS);
            if (windowsDateMatch) {
                const [, year, month, day] = windowsDateMatch;
                currentDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                continue;
            }
        }

        // Windows 메시지: [사용자] [시간] 내용
        if (firstChar === '[') {
            const windowsMatch = execPatternArray(line, PATTERNS.MESSAGE_WINDOWS);
            if (windowsMatch && currentDate) {
                const [, user, ampm, hour, minute, contentText] = windowsMatch;

                // 12시간 → 24시간 변환
                let h = parseInt(hour);
                if (ampm === '오후' && h !== 12) h += 12;
                if (ampm === '오전' && h === 12) h = 0;

                const dateStr = currentDate;
                const timeStr = `${h.toString().padStart(2, '0')}:${minute}`;
                const datetimeStr = `${dateStr} ${timeStr}`;

                // 메시지 타입 분류
                const { type, attachType, attachRef } = classifyContent(contentText);
                const hasLink = containsUrl(contentText);

                const isAttachment = ['photo', 'file', 'emoticon'].includes(type);

                const { raw, display } = addParsedMessageToState(state, {
                    datetime: datetimeStr,
                    date: dateStr,
                    time: timeStr,
                    user: user,
                    message_type: type,
                    content: contentText,
                    has_attachment: !!attachType,
                    attachment_type: attachType,
                    attachment_ref: attachRef,
                    attachment_path: '',
                    has_link: hasLink,
                    sourceLine: lineNum
                }, isAttachment ? null : lastMessage);
                lastRawMessage = raw;
                lastMessage = display;
                continue;
            }
        }

        // 숫자로 시작하는 경우만 정규식 체크
        if (firstChar >= '0' && firstChar <= '9') {
            // 1. 날짜 헤더 ("2024년...")
            if (line.includes('년 ')) {
                const dateMatch = execPatternArray(line, PATTERNS.DATE_HEADER);
                if (dateMatch) {
                    const [, year, month, day] = dateMatch;
                    currentDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                    continue;
                }
                // Android 날짜 구분선: 시간만 있는 행 (사용자/내용 없음)
                if (!line.includes(', ') && testPatternArray(line, PATTERNS.DATE_HEADER_ANDROID)) {
                    continue;
                }
            }

            // 2. 시스템 메시지 (iOS/Android 패턴)
            if (line.includes('님이 들어왔습니다.') || line.includes('님이 나갔습니다.')) {
                if (testPatternArray(line, PATTERNS.ENTER_LEAVE) || testPatternArray(line, PATTERNS.ENTER_LEAVE_ANDROID)) {
                    continue;
                }
            }

            // 3. 일반 메시지 (iOS/Android 패턴)
            if (line.includes(', ') && line.includes(' : ')) {
                // iOS 패턴 시도
                let msgMatch = execPatternArray(line, PATTERNS.MESSAGE_IOS);
                let year, month, day, hour, minute, second = '', user, contentText;

                if (msgMatch) {
                    // iOS 패턴 구분: 24시간 vs 12시간 형식
                    if (msgMatch[4] === '오전' || msgMatch[4] === '오후') {
                        // 12시간 형식: year, month, day, ampm, hour, minute, second(선택적), user, content
                        const ampm = msgMatch[4];
                        [, year, month, day, , hour, minute, second, user, contentText] = msgMatch;
                        // 24시간 형식으로 변환
                        let h = parseInt(hour);
                        if (ampm === '오후' && h !== 12) h += 12;
                        if (ampm === '오전' && h === 12) h = 0;
                        hour = h.toString();
                    } else {
                        // 24시간 형식: year, month, day, hour, minute, second(선택적), user, content
                        [, year, month, day, hour, minute, second, user, contentText] = msgMatch;
                    }
                } else {
                    // Android 패턴 시도
                    msgMatch = execPatternArray(line, PATTERNS.MESSAGE_ANDROID);
                    if (msgMatch) {
                        [, year, month, day, , hour, minute, user, contentText] = msgMatch;
                        const ampm = msgMatch[4]; // 오전/오후
                        // 24시간 형식으로 변환
                        let h = parseInt(hour);
                        if (ampm === '오후' && h !== 12) h += 12;
                        if (ampm === '오전' && h === 12) h = 0;
                        hour = h.toString().padStart(2, '0');
                    }
                }

                if (msgMatch) {
                    const dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                    const timeStr = `${hour.padStart(2, '0')}:${minute}`;
                    const datetimeStr = `${dateStr} ${timeStr}`;

                    const timeWithSeconds = second ? `${timeStr}:${second}` : timeStr;

                    // 메시지 타입 분류
                    const { type, attachType, attachRef } = classifyContent(contentText);
                    const hasLink = containsUrl(contentText);

                    const isAttachment = ['photo', 'file', 'emoticon'].includes(type);

                    const { raw, display } = addParsedMessageToState(state, {
                        datetime: datetimeStr,
                        datetimeWithSeconds: `${dateStr} ${timeWithSeconds}`,
                        date: dateStr,
                        time: timeStr,
                        timeWithSeconds,
                        timePrecision: second ? 'second' : 'minute',
                        user: user,
                        message_type: type,
                        content: contentText,
                        has_attachment: !!attachType,
                        attachment_type: attachType,
                        attachment_ref: attachRef,
                        attachment_path: '',
                        has_link: hasLink,
                        sourceLine: lineNum
                    }, isAttachment ? null : lastMessage);
                    lastRawMessage = raw;
                    lastMessage = display;
                } else {
                    // 패턴 매칭 실패 - 이전 메시지 연속
                    if (lastMessage && lastMessage.message_type === 'text') {
                        const lineHasLink = containsUrl(line);
                        appendMessageContent(lastMessage, line, lineHasLink);
                        if (lastRawMessage && lastRawMessage.message_type === 'text') {
                            appendMessageContent(lastRawMessage, line, lineHasLink);
                        }
                    }
                }
            } else {
                // 이전 메시지 연속
                if (lastMessage && lastMessage.message_type === 'text') {
                    const lineHasLink = containsUrl(line);
                    appendMessageContent(lastMessage, line, lineHasLink);
                    if (lastRawMessage && lastRawMessage.message_type === 'text') {
                        appendMessageContent(lastRawMessage, line, lineHasLink);
                    }
                }
            }
        } else if (firstChar === '메' && line === DELETED_MESSAGE) {
            // 삭제 메시지 (문자열 정확 비교 - 정규식보다 10배 빠름)
            continue;
        } else {
            // Windows 입장/퇴장 (타임스탬프 없음)
            if (line.includes('님이 들어왔습니다.') || line.includes('님이 나갔습니다.')) {
                if (testPatternArray(line, PATTERNS.ENTER_LEAVE_WINDOWS)) {
                    continue;
                }
            }

            if (lastMessage && lastMessage.message_type === 'text') {
                // 기타 - 이전 메시지 연속
                const lineHasLink = containsUrl(line);
                appendMessageContent(lastMessage, line, lineHasLink);
                if (lastRawMessage && lastRawMessage.message_type === 'text') {
                    appendMessageContent(lastRawMessage, line, lineHasLink);
                }
            }
        }
    }

    return buildResult(state);
}

export function parseMergedChatFiles(chatContents, options = {}) {
    const allRawMessages = [];
    let detectedPlatform = null;
    const chatSources = (chatContents || [])
        .map(normalizeChatSource)
        .map(source => {
            const result = parseKakaoChat(source.content, options);
            return {
                ...source,
                result,
                timeKey: getParsedSourceTimeKey(result.rawMessages)
            };
        })
        .sort((a, b) => {
            const timeDiff = compareSortKey(a.timeKey, b.timeKey);
            if (timeDiff !== 0) return timeDiff;
            const sortDiff = compareSortKey(a.sortKey, b.sortKey);
            if (sortDiff !== 0) return sortDiff;
            return a.originalIndex - b.originalIndex;
        });

    // 각 파일의 첫/마지막 발화시각을 기준으로 정렬한 뒤 메시지 수집
    for (let sourceIndex = 0; sourceIndex < chatSources.length; sourceIndex++) {
        const source = chatSources[sourceIndex];
        const sourceOrder = getMergedSourceOrder(source);
        allRawMessages.push(...source.result.rawMessages.map((msg, messageIndex) => ({
            ...msg,
            sourceFileName: source.filename,
            sourceFileIndex: sourceIndex,
            sourceFileOriginalIndex: source.originalIndex,
            sourceFileOrder: sourceOrder,
            sourceMessageIndex: messageIndex
        })));
        detectedPlatform = detectedPlatform || source.result.detectedPlatform;
    }

    // 시간순으로 정렬
    allRawMessages.sort((a, b) => {
        const dtA = new Date(a.datetimeWithSeconds || a.datetime);
        const dtB = new Date(b.datetimeWithSeconds || b.datetime);
        const dateDiff = dtA - dtB;
        if (dateDiff !== 0) return dateDiff;
        const sourceDiff = compareSortKey(a.sourceFileOrder || [], b.sourceFileOrder || []);
        if (sourceDiff !== 0) return sourceDiff;
        return (a.sourceMessageIndex || 0) - (b.sourceMessageIndex || 0);
    });

    const state = createParseState(options.isLeader);
    let lastMessage = null;

    for (const msg of allRawMessages) {
        const raw = addRawMessageToState(state, msg);
        const isAttachment = ['photo', 'file', 'emoticon'].includes(raw.message_type);
        lastMessage = addRawMessageAsDisplay(state, raw, isAttachment ? null : lastMessage);
    }

    return buildResult(state, { detectedPlatform });
}
