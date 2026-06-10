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
        leaderCountByDate: {},
        isLeader: isLeader || defaultIsLeader
    };
}

function addMessageToState(state, msg) {
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

function buildResult(state, extra = {}) {
    return {
        messages: state.messages,
        messagesByDate: state.messagesByDate,
        leaderCountByDate: state.leaderCountByDate,
        dates: sortDatesDescending(Object.keys(state.messagesByDate)),
        detectedPlatform: null,
        ...extra
    };
}

function parseMacOSCsvChat(content, options = {}) {
    const records = parseCsvRecords(content);
    const state = createParseState(options.isLeader);

    if (!isMacOSCsvHeader(records[0])) {
        return buildResult(state, { detectedPlatform: 'macos' });
    }

    let lastMessage = null;

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

        if (!isAttachment && lastMessage &&
            lastMessage.user === user &&
            lastMessage.date === parsedDate.date &&
            lastMessage.message_type === 'text') {
            lastMessage.content += '\n' + contentText;
            if (hasLink) lastMessage.has_link = true;
        } else {
            const msg = {
                datetime: parsedDate.datetime,
                date: parsedDate.date,
                time: parsedDate.time,
                user,
                message_type: type,
                content: contentText,
                has_attachment: !!attachType,
                attachment_type: attachType,
                attachment_ref: attachRef,
                attachment_path: '',
                has_link: hasLink
            };

            addMessageToState(state, msg);
            lastMessage = msg;
        }
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
            const msg = {
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
                has_link: false
            };
            addMessageToState(state, msg);
            lastMessage = msg;
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

                // 연속 발화 병합 (첨부파일 제외)
                if (!isAttachment && lastMessage &&
                    lastMessage.user === user &&
                    lastMessage.date === dateStr &&
                    lastMessage.message_type === 'text') {
                    lastMessage.content += '\n' + contentText;
                    if (hasLink) lastMessage.has_link = true;
                } else {
                    const msg = {
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
                        has_link: hasLink
                    };

                    addMessageToState(state, msg);
                    lastMessage = msg;
                }
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
                let year, month, day, hour, minute, user, contentText;

                if (msgMatch) {
                    // iOS 패턴 구분: 24시간 vs 12시간 형식
                    if (msgMatch[4] === '오전' || msgMatch[4] === '오후') {
                        // 12시간 형식: year, month, day, ampm, hour, minute, second(선택적), user, content
                        const ampm = msgMatch[4];
                        [, year, month, day, , hour, minute, , user, contentText] = msgMatch;
                        // 24시간 형식으로 변환
                        let h = parseInt(hour);
                        if (ampm === '오후' && h !== 12) h += 12;
                        if (ampm === '오전' && h === 12) h = 0;
                        hour = h.toString();
                    } else {
                        // 24시간 형식: year, month, day, hour, minute, second(선택적), user, content
                        [, year, month, day, hour, minute, , user, contentText] = msgMatch;
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

                    // 메시지 타입 분류
                    const { type, attachType, attachRef } = classifyContent(contentText);
                    const hasLink = containsUrl(contentText);

                    const isAttachment = ['photo', 'file', 'emoticon'].includes(type);

                    // 연속 발화 병합 (첨부파일 제외)
                    if (!isAttachment && lastMessage &&
                        lastMessage.user === user &&
                        lastMessage.date === dateStr &&
                        lastMessage.message_type === 'text') {
                        lastMessage.content += '\n' + contentText;
                        if (hasLink) lastMessage.has_link = true;
                    } else {
                        const msg = {
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
                            has_link: hasLink
                        };

                        addMessageToState(state, msg);
                        lastMessage = msg;
                    }
                } else {
                    // 패턴 매칭 실패 - 이전 메시지 연속
                    if (lastMessage && lastMessage.message_type === 'text') {
                        lastMessage.content += '\n' + line;
                        if (containsUrl(line)) {
                            lastMessage.has_link = true;
                        }
                    }
                }
            } else {
                // 이전 메시지 연속
                if (lastMessage && lastMessage.message_type === 'text') {
                    lastMessage.content += '\n' + line;
                    if (containsUrl(line)) {
                        lastMessage.has_link = true;
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
                lastMessage.content += '\n' + line;
                if (containsUrl(line)) {
                    lastMessage.has_link = true;
                }
            }
        }
    }

    return buildResult(state);
}

export function parseMergedChatFiles(chatContents, options = {}) {
    const allMessages = [];
    let detectedPlatform = null;

    // 각 파일을 파싱하고 메시지 수집
    for (const content of chatContents) {
        const result = parseKakaoChat(content, options);
        allMessages.push(...result.messages);
        detectedPlatform = detectedPlatform || result.detectedPlatform;
    }

    // 시간순으로 정렬
    allMessages.sort((a, b) => {
        const dtA = new Date(a.datetime);
        const dtB = new Date(b.datetime);
        return dtA - dtB;
    });

    const state = createParseState(options.isLeader);

    for (const msg of allMessages) {
        addMessageToState(state, msg);
    }

    return buildResult(state, { detectedPlatform });
}
