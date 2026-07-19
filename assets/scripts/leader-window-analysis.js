import {
    DEFAULT_LEADER_WINDOW_PARAMS,
    average,
    classifyLeaderWindow,
    classifyLeaderWindowStrength,
    getLeaderWindowKindMeta,
    getLeaderWindowPrimaryScore,
    getLeaderWindowStrengthMeta,
    isLeaderWindowCandidate,
    quantile,
    round,
    scoreBoundaryConfidenceWindow,
    scoreContextExpansionWindow,
    scoreDenseSwitchingWindow,
    scoreMeaningPotentialWindow,
    scoreTargetFloorWindow
} from './leader-window-model.js';

export {
    DEFAULT_LEADER_WINDOW_PARAMS,
    getLeaderWindowKindMeta,
    getLeaderWindowPrimaryScore,
    getLeaderWindowStrengthMeta,
    isLeaderWindowCandidate
};

export function createEmptyLeaderWindowAnalysis(params = DEFAULT_LEADER_WINDOW_PARAMS, targetSpeaker = '') {
    return {
        params: { ...params },
        targetSpeaker,
        windows: [],
        windowsByDate: {},
        daySummaries: {}
    };
}

function parseTimestamp(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(String(value || ''));
    if (!match) return NaN;
    const [, year, month, day, hour, minute, second = '0'] = match;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)).getTime();
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const pad = value => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const pad = value => String(value).padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function normalizeDayMessages(rawMessages, targetSpeaker) {
    return (rawMessages || []).map((message, index) => {
        const timestamp = parseTimestamp(message.datetimeWithSeconds || message.datetime);
        return {
            index,
            sequence: Number.isFinite(message.sequence) ? message.sequence : index,
            timestamp,
            date: message.date,
            time: message.timeWithSeconds || message.time || '',
            user: message.user || '',
            messageType: message.message_type || 'text',
            charCount: Number.isFinite(message.charCount) ? message.charCount : String(message.content || '').length,
            isLeader: message.user === targetSpeaker
        };
    })
        .filter(message => Number.isFinite(message.timestamp) && message.date)
        .sort((left, right) => left.timestamp - right.timestamp || left.sequence - right.sequence || left.index - right.index);
}

function summarizeContext(dayMessages, startTime, endTime) {
    const messages = dayMessages.filter(message => message.timestamp >= startTime && message.timestamp <= endTime);
    const participants = new Set(messages.map(message => message.user));
    const nonLeaderParticipants = new Set(messages.filter(message => !message.isLeader).map(message => message.user));
    return {
        messages: messages.length,
        leaderMessages: messages.filter(message => message.isLeader).length,
        nonLeaderMessages: messages.filter(message => !message.isLeader).length,
        participants: participants.size,
        nonLeaderParticipants: nonLeaderParticipants.size
    };
}

function contextBounds(messages) {
    if (!messages.length) return { startTime: 0, endTime: 0 };
    return {
        startTime: messages[0].timestamp,
        endTime: messages[messages.length - 1].timestamp
    };
}

function runLengths(messages, predicate) {
    const lengths = [];
    let current = 0;
    for (const message of messages) {
        if (predicate(message)) {
            current++;
        } else if (current) {
            lengths.push(current);
            current = 0;
        }
    }
    if (current) lengths.push(current);
    return lengths;
}

function speakerSwitches(messages) {
    let count = 0;
    for (let index = 1; index < messages.length; index++) {
        if (messages[index].user !== messages[index - 1].user) count++;
    }
    return count;
}

function normalizeGapCandidates(params) {
    const raw = Array.isArray(params.targetGapCandidatesMin) && params.targetGapCandidatesMin.length
        ? params.targetGapCandidatesMin
        : [params.maxTargetRecoveryGapMin || params.maxLeaderGapMin || 16];
    return [...new Set(raw.map(value => Number(value)).filter(value => Number.isFinite(value) && value > 0))]
        .sort((left, right) => left - right);
}

function buildAdaptiveStats(windows) {
    const targetWindows = windows.filter(window => window.analysisKind === 'target_floor');
    const values = key => targetWindows
        .map(window => Number(window[key]))
        .filter(value => Number.isFinite(value) && value > 0);
    return {
        durationP60: round(quantile(values('durationMin'), 0.6), 2),
        durationP70: round(quantile(values('durationMin'), 0.7), 2),
        durationP80: round(quantile(values('durationMin'), 0.8), 2),
        leaderMessagesP60: round(quantile(values('leaderMessages'), 0.6), 2),
        leaderMessagesP80: round(quantile(values('leaderMessages'), 0.8), 2),
        leaderCharsP80: round(quantile(values('leaderChars'), 0.8), 2),
        leaderDensityP70: round(quantile(values('leaderDensityPerMin'), 0.7), 3),
        leaderCharDensityP70: round(quantile(values('leaderCharDensityPerMin'), 0.7), 2)
    };
}

function applyScoresAndClassification(features, stats = {}) {
    features.targetFloorScore = scoreTargetFloorWindow(features);
    features.denseSwitchingScore = scoreDenseSwitchingWindow(features);
    features.meaningPotentialScore = scoreMeaningPotentialWindow(features, stats);
    features.boundaryConfidenceScore = scoreBoundaryConfidenceWindow(features, stats);
    features.contextExpansionScore = scoreContextExpansionWindow(features, stats);
    features.graceScore = features.targetFloorScore;
    features.revivalScore = features.denseSwitchingScore;
    features.kindHint = classifyLeaderWindow(features, stats);
    features.patternFamily = features.kindHint;
    features.strength = classifyLeaderWindowStrength(features);
    return features;
}

function buildTargetFloorWindow(dayMessages, leaderIndexes, params, sequence, sourceGapMin) {
    const leaderMessages = leaderIndexes.map(index => dayMessages[index]);
    const firstLeaderIndex = leaderIndexes[0];
    const lastLeaderIndex = leaderIndexes[leaderIndexes.length - 1];
    const startLeader = leaderMessages[0];
    const endLeader = leaderMessages[leaderMessages.length - 1];
    const windowMessages = dayMessages.slice(firstLeaderIndex, lastLeaderIndex + 1);
    const durationMin = Math.max(0, (endLeader.timestamp - startLeader.timestamp) / 60000);
    const densityDurationMin = Math.max(1, durationMin);
    const participants = new Set(windowMessages.map(message => message.user));
    const nonLeaderParticipants = new Set(windowMessages.filter(message => !message.isLeader).map(message => message.user));
    const leaderChars = windowMessages.filter(message => message.isLeader).reduce((sum, message) => sum + message.charCount, 0);
    const totalChars = windowMessages.reduce((sum, message) => sum + message.charCount, 0);
    const leaderGapsSec = leaderMessages.slice(1).map((message, index) => (message.timestamp - leaderMessages[index].timestamp) / 1000);
    const leaderRuns = runLengths(windowMessages, message => message.isLeader);
    const interruptionBursts = runLengths(windowMessages, message => !message.isLeader);
    const switches = speakerSwitches(windowMessages);
    const contextMs = params.contextMin * 60000;
    const beforeContext = summarizeContext(dayMessages, startLeader.timestamp - contextMs, startLeader.timestamp - 1);
    const afterContext = summarizeContext(dayMessages, endLeader.timestamp + 1, endLeader.timestamp + contextMs);

    const features = {
        analysisKind: 'target_floor',
        id: `${startLeader.date}-${String(sequence).padStart(3, '0')}-target-gap${params.maxTargetRecoveryGapMin}-min${params.minLeaderMessages}`,
        date: startLeader.date,
        start: formatTimestamp(startLeader.timestamp),
        end: formatTimestamp(endLeader.timestamp),
        startTime: formatTime(startLeader.timestamp),
        endTime: formatTime(endLeader.timestamp),
        startRawIndex: startLeader.sequence,
        endRawIndex: endLeader.sequence,
        maxLeaderGapMin: params.maxLeaderGapMin,
        maxTargetRecoveryGapMin: params.maxTargetRecoveryGapMin,
        sourceGapMin,
        minLeaderMessages: params.minLeaderMessages,
        contextMin: params.contextMin,
        durationMin: round(durationMin, 2),
        totalMessages: windowMessages.length,
        leaderMessages: leaderMessages.length,
        nonLeaderMessages: windowMessages.length - leaderMessages.length,
        participants: participants.size,
        nonLeaderParticipants: nonLeaderParticipants.size,
        leaderChars,
        totalChars,
        leaderMessageShare: round(leaderMessages.length / Math.max(1, windowMessages.length)),
        leaderCharShare: round(leaderChars / Math.max(1, totalChars)),
        messageDensityPerMin: round(windowMessages.length / densityDurationMin, 3),
        leaderDensityPerMin: round(leaderMessages.length / densityDurationMin, 3),
        leaderCharDensityPerMin: round(leaderChars / densityDurationMin, 2),
        leaderGapMeanSec: round(average(leaderGapsSec), 2),
        leaderGapMedianSec: round(quantile(leaderGapsSec, 0.5), 2),
        leaderGapP90Sec: round(quantile(leaderGapsSec, 0.9), 2),
        leaderGapMaxSec: round(Math.max(0, ...leaderGapsSec), 2),
        maxLeaderRun: Math.max(0, ...leaderRuns),
        interruptionBursts: interruptionBursts.length,
        maxInterruptionBurstMessages: Math.max(0, ...interruptionBursts),
        interruptionRate: round((windowMessages.length - leaderMessages.length) / Math.max(1, leaderMessages.length)),
        speakerSwitches: switches,
        speakerSwitchRate: round(switches / Math.max(1, windowMessages.length - 1)),
        beforeContextMessages: beforeContext.messages,
        beforeContextNonLeaderMessages: beforeContext.nonLeaderMessages,
        beforeContextParticipants: beforeContext.participants,
        afterContextMessages: afterContext.messages,
        afterContextNonLeaderMessages: afterContext.nonLeaderMessages,
        afterContextParticipants: afterContext.participants
    };

    return features;
}

function detectWindowsForDayWithGap(dayMessages, params, sourceGapMin, sequenceOffset = 0) {
    const leaderIndexes = [];
    for (let index = 0; index < dayMessages.length; index++) {
        if (dayMessages[index].isLeader) leaderIndexes.push(index);
    }

    const clusters = [];
    let current = [];
    const maxGapMs = sourceGapMin * 60000;
    for (const index of leaderIndexes) {
        if (!current.length) {
            current.push(index);
            continue;
        }

        const prev = dayMessages[current[current.length - 1]];
        const next = dayMessages[index];
        if (next.timestamp - prev.timestamp <= maxGapMs) {
            current.push(index);
        } else {
            clusters.push(current);
            current = [index];
        }
    }
    if (current.length) clusters.push(current);

    return clusters
        .filter(cluster => cluster.length >= params.minLeaderMessages)
        .map((cluster, index) => buildTargetFloorWindow(dayMessages, cluster, params, sequenceOffset + index + 1, sourceGapMin));
}

function dedupeTargetWindows(windows) {
    const byBoundary = new Map();
    for (const window of windows) {
        const key = `${window.date}::${window.startRawIndex}::${window.endRawIndex}`;
        const previous = byBoundary.get(key);
        if (!previous || window.sourceGapMin < previous.sourceGapMin) {
            byBoundary.set(key, {
                ...window,
                gapMatches: previous?.gapMatches || [window.sourceGapMin]
            });
        } else if (previous) {
            previous.gapMatches = [...new Set([...(previous.gapMatches || []), window.sourceGapMin])].sort((left, right) => left - right);
        }
    }
    return [...byBoundary.values()];
}

function detectWindowsForDay(dayMessages, params) {
    const gaps = normalizeGapCandidates(params);
    const windows = [];
    let sequenceOffset = 0;
    for (const sourceGapMin of gaps) {
        const gapWindows = detectWindowsForDayWithGap(dayMessages, params, sourceGapMin, sequenceOffset);
        windows.push(...gapWindows);
        sequenceOffset += gapWindows.length;
    }
    return dedupeTargetWindows(windows).map((window, index) => ({
        ...window,
        id: `${window.date}-${String(index + 1).padStart(3, '0')}-target-gap${window.sourceGapMin}-min${params.minLeaderMessages}`
    }));
}

function bucketStartTimestamp(timestamp, bucketMin) {
    const date = new Date(timestamp);
    date.setSeconds(0, 0);
    const minutes = date.getMinutes();
    date.setMinutes(minutes - (minutes % bucketMin));
    return date.getTime();
}

function buildDenseSwitchingWindow(dayMessages, bucketMessages, params, sequence) {
    const sorted = [...bucketMessages].sort((left, right) => left.timestamp - right.timestamp || left.sequence - right.sequence);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const bounds = contextBounds(sorted);
    const durationMin = Math.max(0, (bounds.endTime - bounds.startTime) / 60000);
    const densityDurationMin = Math.max(1, durationMin);
    const leaderMessages = sorted.filter(message => message.isLeader);
    const participants = new Set(sorted.map(message => message.user));
    const nonLeaderParticipants = new Set(sorted.filter(message => !message.isLeader).map(message => message.user));
    const leaderChars = leaderMessages.reduce((sum, message) => sum + message.charCount, 0);
    const totalChars = sorted.reduce((sum, message) => sum + message.charCount, 0);
    const leaderGapsSec = leaderMessages.slice(1).map((message, index) => (message.timestamp - leaderMessages[index].timestamp) / 1000);
    const leaderRuns = runLengths(sorted, message => message.isLeader);
    const interruptionBursts = runLengths(sorted, message => !message.isLeader);
    const switches = speakerSwitches(sorted);
    const contextMs = params.contextMin * 60000;
    const beforeContext = summarizeContext(dayMessages, first.timestamp - contextMs, first.timestamp - 1);
    const afterContext = summarizeContext(dayMessages, last.timestamp + 1, last.timestamp + contextMs);

    const features = {
        analysisKind: 'dense_switching',
        id: `${first.date}-${String(sequence).padStart(3, '0')}-dense-switching`,
        date: first.date,
        start: formatTimestamp(first.timestamp),
        end: formatTimestamp(last.timestamp),
        startTime: formatTime(first.timestamp),
        endTime: formatTime(last.timestamp),
        startRawIndex: first.sequence,
        endRawIndex: last.sequence,
        maxLeaderGapMin: params.maxLeaderGapMin,
        maxTargetRecoveryGapMin: params.maxTargetRecoveryGapMin,
        minLeaderMessages: params.minLeaderMessages,
        contextMin: params.contextMin,
        durationMin: round(durationMin, 2),
        totalMessages: sorted.length,
        leaderMessages: leaderMessages.length,
        nonLeaderMessages: sorted.length - leaderMessages.length,
        participants: participants.size,
        nonLeaderParticipants: nonLeaderParticipants.size,
        leaderMessageShare: round(leaderMessages.length / Math.max(1, sorted.length)),
        leaderCharShare: round(leaderChars / Math.max(1, totalChars)),
        messageDensityPerMin: round(sorted.length / densityDurationMin, 3),
        leaderDensityPerMin: round(leaderMessages.length / densityDurationMin, 3),
        leaderCharDensityPerMin: round(leaderChars / densityDurationMin, 2),
        leaderGapMeanSec: round(average(leaderGapsSec), 2),
        leaderGapMedianSec: round(quantile(leaderGapsSec, 0.5), 2),
        leaderGapP90Sec: round(quantile(leaderGapsSec, 0.9), 2),
        leaderGapMaxSec: round(Math.max(0, ...leaderGapsSec), 2),
        maxLeaderRun: Math.max(0, ...leaderRuns),
        interruptionBursts: interruptionBursts.length,
        maxInterruptionBurstMessages: Math.max(0, ...interruptionBursts),
        interruptionRate: round((sorted.length - leaderMessages.length) / Math.max(1, leaderMessages.length)),
        speakerSwitches: switches,
        speakerSwitchRate: round(switches / Math.max(1, sorted.length - 1)),
        beforeContextMessages: beforeContext.messages,
        beforeContextNonLeaderMessages: beforeContext.nonLeaderMessages,
        beforeContextParticipants: beforeContext.participants,
        afterContextMessages: afterContext.messages,
        afterContextNonLeaderMessages: afterContext.nonLeaderMessages,
        afterContextParticipants: afterContext.participants
    };

    return features;
}

function denseBucketCandidate(messages, params) {
    if (!messages.length) return false;
    const participants = new Set(messages.map(message => message.user));
    const switches = speakerSwitches(messages);
    const switchRate = switches / Math.max(1, messages.length - 1);
    return (
        messages.length >= params.minDenseMessages &&
        participants.size >= params.minDenseParticipants &&
        switchRate >= params.minDenseSwitchRate
    );
}

function detectDenseSwitchingWindowsForDay(dayMessages, params) {
    const bucketMin = params.denseBucketMin || 5;
    const buckets = new Map();
    for (const message of dayMessages) {
        const bucketStart = bucketStartTimestamp(message.timestamp, bucketMin);
        if (!buckets.has(bucketStart)) buckets.set(bucketStart, []);
        buckets.get(bucketStart).push(message);
    }

    const bucketRows = [...buckets.entries()]
        .map(([start, messages]) => ({ start, messages: messages.sort((left, right) => left.timestamp - right.timestamp || left.sequence - right.sequence) }))
        .sort((left, right) => left.start - right.start);

    const episodes = [];
    let current = [];
    const flush = () => {
        if (!current.length) return;
        episodes.push(current.flatMap(bucket => bucket.messages));
        current = [];
    };

    for (const bucket of bucketRows) {
        if (denseBucketCandidate(bucket.messages, params)) {
            current.push(bucket);
        } else {
            flush();
        }
    }
    flush();

    return episodes.map((messages, index) => buildDenseSwitchingWindow(dayMessages, messages, params, index + 1));
}

function summarizeDay(date, dayMessages, windows) {
    const participants = new Set(dayMessages.map(message => message.user));
    const leaderMessages = dayMessages.filter(message => message.isLeader).length;
    const candidateWindows = windows.filter(isLeaderWindowCandidate);
    const semanticLongCount = windows.filter(window => window.kindHint === 'semantic_long_explanation').length;
    const semanticShortCount = windows.filter(window => window.kindHint === 'semantic_short_principle').length;
    const semanticBalancedCount = windows.filter(window => window.kindHint === 'semantic_balanced').length;
    const semanticContextCount = windows.filter(window => window.kindHint === 'semantic_context_review').length;
    const denseContextCount = windows.filter(window => window.kindHint === 'dense_context_trigger').length;
    const targetStableCount = semanticLongCount;
    const targetRecoveryCount = semanticBalancedCount;
    const targetSparseCount = semanticContextCount;
    const denseSwitchingCount = denseContextCount;
    const candidateCount = candidateWindows.length;
    return {
        date,
        messages: dayMessages.length,
        leaderMessages,
        leaderMessageShare: round(leaderMessages / Math.max(1, dayMessages.length)),
        participants: participants.size,
        leaderWindowCount: windows.length,
        candidateCount,
        semanticLongCount,
        semanticShortCount,
        semanticBalancedCount,
        semanticContextCount,
        denseContextCount,
        targetStableCount,
        targetRecoveryCount,
        targetSparseCount,
        denseSwitchingCount,
        graceCandidateCount: targetStableCount,
        revivalCandidateCount: denseSwitchingCount,
        mixedCandidateCount: targetRecoveryCount,
        totalWindowDurationMin: round(windows.reduce((sum, window) => sum + window.durationMin, 0), 2),
        maxTargetFloorScore: round(Math.max(0, ...windows.map(window => window.targetFloorScore))),
        maxDenseSwitchingScore: round(Math.max(0, ...windows.map(window => window.denseSwitchingScore))),
        maxMeaningPotentialScore: round(Math.max(0, ...windows.map(window => window.meaningPotentialScore))),
        maxBoundaryConfidenceScore: round(Math.max(0, ...windows.map(window => window.boundaryConfidenceScore))),
        maxContextExpansionScore: round(Math.max(0, ...windows.map(window => window.contextExpansionScore))),
        maxGraceScore: round(Math.max(0, ...windows.map(window => window.targetFloorScore || window.graceScore))),
        maxRevivalScore: round(Math.max(0, ...windows.map(window => window.denseSwitchingScore || window.revivalScore)))
    };
}

export function analyzeLeaderWindows(rawMessagesByDate, options = {}) {
    const params = {
        ...DEFAULT_LEADER_WINDOW_PARAMS,
        ...(options.params || {})
    };
    const targetSpeaker = options.targetSpeaker || '';
    const result = createEmptyLeaderWindowAnalysis(params, targetSpeaker);
    const dates = Object.keys(rawMessagesByDate || {}).sort();
    const pendingDays = [];
    const allRawWindows = [];

    for (const date of dates) {
        const dayMessages = normalizeDayMessages(rawMessagesByDate[date], targetSpeaker);
        const rawWindows = [
            ...detectWindowsForDay(dayMessages, params),
            ...detectDenseSwitchingWindowsForDay(dayMessages, params)
        ];
        pendingDays.push({ date, dayMessages, rawWindows });
        allRawWindows.push(...rawWindows);
    }

    const adaptiveStats = buildAdaptiveStats(allRawWindows);
    result.adaptiveStats = adaptiveStats;

    for (const { date, dayMessages, rawWindows } of pendingDays) {
        const windows = rawWindows
            .map(window => applyScoresAndClassification(window, adaptiveStats))
            .sort((left, right) => left.start.localeCompare(right.start) || getLeaderWindowPrimaryScore(right) - getLeaderWindowPrimaryScore(left));
        result.windowsByDate[date] = windows;
        result.daySummaries[date] = summarizeDay(date, dayMessages, windows);
        result.windows.push(...windows);
    }

    return result;
}

export function getVisibleLeaderWindowsForDate(analysis, date, limit = undefined) {
    const params = analysis?.params || DEFAULT_LEADER_WINDOW_PARAMS;
    const maxCount = limit ?? params.visibleWindowLimitPerDay;
    return (analysis?.windowsByDate?.[date] || [])
        .filter(isLeaderWindowCandidate)
        .sort((left, right) => getLeaderWindowPrimaryScore(right) - getLeaderWindowPrimaryScore(left))
        .slice(0, maxCount)
        .sort((left, right) => left.start.localeCompare(right.start));
}

export function getLeaderWindowSummaryForDate(analysis, date) {
    return analysis?.daySummaries?.[date] || null;
}
