// ========== 상태 관리 ==========
const DEFAULT_LEADER_FILTER_TARGET = '채상욱 리더';

let messages = [];
let messagesByDate = {};
let attachmentFiles = {};  // filename -> Blob URL (캐시)
let attachmentEntries = {}; // filename -> ZIP entry path (지연 로딩용)
let zipInstance = null;     // ZIP 객체 참조 (지연 로딩용)
let dates = [];
let leaderCountByDate = {};  // 날짜별 필터 대상 사용자 메시지 수
let currentMonth = new Date();
let selectedDate = null;
let leaderFilterActive = false;
let leaderFilterTarget = DEFAULT_LEADER_FILTER_TARGET;

const BUG_REPORT_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSeLjAqqVMEjSz2tbCs7tUpzRwDRnK41LAxDwuIyylU6XTnIlA/viewform';
const BUG_REPORT_FORM_TYPE_FIELD = 'entry.315233821';
const BUG_REPORT_FORM_CONTENT_FIELD = 'entry.1161180918';
const BUG_REPORT_FORM_PREFILL_LIMIT = 12000;
const DIAGNOSTIC_EVENT_LIMIT = 8;
const DIAGNOSTIC_FILE_SAMPLE_LIMIT = 20;
const DIAGNOSTIC_CHAT_CANDIDATE_LIMIT = 20;
const DIAGNOSTIC_ZIP_ENTRY_SAMPLE_LIMIT = 40;
const DIAGNOSTIC_TEXT_SAMPLE_LINE_LIMIT = 12;
const CHAT_FILE_PATTERN = /\.(txt|csv)$/i;
const THEME_1995_WINDOW_ANIMATION_MS = 240;
const THEME_1995_GHOST_SIZE = 12;
const THEME_1995_GHOST_FRAME_COUNT = 9;

// ========== 정규식 패턴 (AGENTS.md 기반) ==========
// 여러 언어/버전을 지원하기 위한 패턴 배열
const PATTERNS = {
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
function testPatternArray(line, patternArray) {
    for (const pattern of patternArray) {
        if (pattern.test(line)) return true;
    }
    return false;
}

// 패턴 배열을 순차적으로 실행하여 매칭되는 첫 번째 결과 반환
function execPatternArray(line, patternArray) {
    for (const pattern of patternArray) {
        const match = pattern.exec(line);
        if (match) return match;
    }
    return null;
}

function containsUrl(text) {
    PATTERNS.URL.lastIndex = 0;
    return PATTERNS.URL.test(text);
}

// 첨부파일 여부 확인 (iOS/Android 패턴 모두 지원)
function isAttachmentFile(filename) {
    return PATTERNS.ATTACHMENT_FILENAME_IOS.test(filename) ||
           PATTERNS.ATTACHMENT_FILENAME_ANDROID.test(filename) ||
           PATTERNS.ATTACHMENT_FILENAME_ANDROID_FILE.test(filename);
}

// 첨부파일 파일명 파싱 (iOS/Android 패턴 모두 지원)
function parseAttachmentFilename(filename) {
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

// ========== 플랫폼 감지 ==========
let detectedPlatform = 'ios'; // 'ios' | 'android' | 'windows' | 'macos'

function detectPlatform(chatFilenames, attachFilenames) {
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

// 삭제 메시지는 문자열 비교로 최적화
const DELETED_MESSAGE = '메시지가 삭제되었습니다.';

// ========== IndexedDB 캐시 설정 ==========
const DB_CONFIG = {
    name: 'ChaeKakaoCache',
    version: 1,
    storeName: 'parsedData'
};

// IndexedDB 초기화
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(DB_CONFIG.storeName)) {
                const store = db.createObjectStore(DB_CONFIG.storeName, { keyPath: 'cacheKey' });
                store.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
}

// ========== DOM 요소 ==========
const setupScreen = document.getElementById('setupScreen');
const app = document.getElementById('app');
const zipInput = document.getElementById('zipInput');
const zipBtn = document.getElementById('zipBtn');
const folderInput = document.getElementById('folderInput');
const folderBtn = document.getElementById('folderBtn');
const zipName = document.getElementById('zipName');
const startBtn = document.getElementById('startBtn');
const step1 = document.getElementById('step1');
const clearCacheBtn = document.getElementById('clearCacheBtn');
const cacheStatus = document.getElementById('cacheStatus');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const dropZone = document.getElementById('dropZone');
const capabilityWarning = document.getElementById('capabilityWarning');
const sidebar = document.querySelector('.sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const linkSidebar = document.getElementById('linkSidebar');
const linkSidebarToggle = document.getElementById('linkSidebarToggle');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const reportIssueFooterBtn = document.getElementById('reportIssueFooterBtn');
const reportIssueLinkBtn = document.getElementById('reportIssueLinkBtn');
const reportIssueModal = document.getElementById('reportIssueModal');
const copyDiagnosticBtn = document.getElementById('copyDiagnosticBtn');
const openIssueBtn = document.getElementById('openIssueBtn');
const diagnosticReportText = document.getElementById('diagnosticReportText');
const diagnosticCopyStatus = document.getElementById('diagnosticCopyStatus');
const diagnosticToast = document.getElementById('diagnosticToast');
const diagnosticToastMessage = document.getElementById('diagnosticToastMessage');
const diagnosticToastDetails = document.getElementById('diagnosticToastDetails');
const diagnosticToastIssue = document.getElementById('diagnosticToastIssue');
const captureBtn = document.getElementById('captureBtn');
const captureModal = document.getElementById('captureModal');
const captureScopeCurrent = document.getElementById('captureScopeCurrent');
const captureScopeAll = document.getElementById('captureScopeAll');
const captureUseLeaderFilter = document.getElementById('captureUseLeaderFilter');
const copyCaptureBtn = document.getElementById('copyCaptureBtn');
const downloadCaptureBtn = document.getElementById('downloadCaptureBtn');
const captureText = document.getElementById('captureText');
const captureStatus = document.getElementById('captureStatus');

// ========== 안전 진단 리포트 ==========
const diagnosticState = {
    stage: 'app-loaded',
    progress: { percent: 0, text: '앱 로드' },
    input: {
        source: 'none',
        fileCount: 0,
        totalBytes: 0,
        extensions: [],
        files: [],
        omittedFileCount: 0,
        txtFileCount: 0,
        csvFileCount: 0,
        zipFileCount: 0,
        attachmentFileCount: 0
    },
    processing: {
        route: 'none',
        detectedPlatform: 'unknown',
        zipEntryCount: 0,
        zipEntries: [],
        omittedZipEntryCount: 0,
        zipFile: null,
        chatCandidateCount: 0,
        validChatFileCount: 0,
        attachmentCandidateCount: 0,
        attachmentExtensions: [],
        chatCandidates: [],
        parseResult: null
    },
    events: []
};
let diagnosticRedactions = [];

function sanitizeDiagnosticText(value, maxLength = 1200) {
    if (value === undefined || value === null) return '';

    let text = String(value)
        .replace(/\u0000/g, '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/blob:[^\s)]+/g, 'blob:[redacted]')
        .replace(/file:\/\/\/(?:Users|home)\/[^)\s]+\/([^/\s)]+(?::\d+:\d+)?)/g, 'file:///[local]/$1')
        .replace(/\/(?:Users|home)\/[^)\s]+\/([^/\s)]+(?::\d+:\d+)?)/g, '[local]/$1');

    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}... [truncated]`;
}

function getNavigatorSnapshot() {
    const nav = typeof navigator !== 'undefined'
        ? navigator
        : (window && window.navigator ? window.navigator : {});

    return {
        userAgent: sanitizeDiagnosticText(nav.userAgent || 'unknown', 500),
        language: sanitizeDiagnosticText(nav.language || 'unknown', 80),
        platform: sanitizeDiagnosticText(nav.platform || 'unknown', 80)
    };
}

function getViewportSnapshot() {
    return {
        width: window.innerWidth || document.documentElement.clientWidth || 'unknown',
        height: window.innerHeight || document.documentElement.clientHeight || 'unknown'
    };
}

function getSafeAppUrl() {
    try {
        return sanitizeDiagnosticText(window.location && window.location.href ? window.location.href.split('#')[0] : 'unknown', 500);
    } catch (error) {
        return 'unknown';
    }
}

function summarizeFileExtensions(files) {
    const counts = {};

    for (const file of files) {
        const ext = getFileExtension(file.name);
        counts[ext] = (counts[ext] || 0) + 1;
    }

    return Object.keys(counts)
        .sort()
        .map(ext => `${ext}:${counts[ext]}`);
}

function getFileExtension(name) {
    const filename = String(name || '').toLowerCase();
    if (!filename.includes('.')) return '(none)';
    return filename.split('.').pop() || '(none)';
}

function getZipEntrySize(entry) {
    if (!entry || !entry._data) return 0;
    return Number(entry._data.uncompressedSize || entry._data.compressedSize || 0) || 0;
}

function buildDiagnosticFileInfo(file, options = {}) {
    const name = String(options.name || (file && file.name) || '');
    const relativePath = String(options.relativePath || (file && file.webkitRelativePath) || '');
    const info = {
        name: sanitizeDiagnosticText(name, 260),
        ext: getFileExtension(name),
        size: Number(options.size !== undefined ? options.size : (file && file.size)) || 0
    };

    if (relativePath && relativePath !== name) {
        info.relativePath = sanitizeDiagnosticText(relativePath, 420);
    }

    if (options.entryPath && options.entryPath !== name) {
        info.entryPath = sanitizeDiagnosticText(options.entryPath, 420);
    }

    if (file && file.lastModified) {
        info.lastModified = new Date(file.lastModified).toISOString();
    }

    return info;
}

function buildDiagnosticZipEntryInfo(entryPath, entry) {
    return buildDiagnosticFileInfo(null, {
        name: String(entryPath || '').split('/').pop(),
        entryPath,
        size: getZipEntrySize(entry)
    });
}

function summarizeAttachmentExtensions(names) {
    const counts = {};
    for (const name of names) {
        const ext = getFileExtension(name);
        counts[ext] = (counts[ext] || 0) + 1;
    }
    return Object.keys(counts)
        .sort()
        .map(ext => `${ext}:${counts[ext]}`);
}

function getDiagnosticTextSampleLines(content, limit = DIAGNOSTIC_TEXT_SAMPLE_LINE_LIMIT) {
    return String(content || '')
        .split('\n')
        .slice(0, limit)
        .map((line, index) => ({
            line: index + 1,
            text: sanitizeDiagnosticText(line.replace(/\r$/, ''), 500)
        }));
}

function resetDiagnosticProcessing(route = 'none') {
    diagnosticState.processing = {
        route,
        detectedPlatform: detectedPlatform || 'unknown',
        zipEntryCount: 0,
        zipEntries: [],
        omittedZipEntryCount: 0,
        zipFile: null,
        chatCandidateCount: 0,
        validChatFileCount: 0,
        attachmentCandidateCount: 0,
        attachmentExtensions: [],
        chatCandidates: [],
        parseResult: null
    };
}

function updateDiagnosticProcessing(patch) {
    diagnosticState.processing = {
        ...diagnosticState.processing,
        ...patch
    };
}

function recordDiagnosticChatCandidate(info) {
    const candidates = diagnosticState.processing.chatCandidates.slice();
    candidates.push(info);
    diagnosticState.processing.chatCandidates = candidates.slice(-DIAGNOSTIC_CHAT_CANDIDATE_LIMIT);
    diagnosticState.processing.chatCandidateCount = Math.max(
        diagnosticState.processing.chatCandidateCount,
        candidates.length
    );
}

function buildDiagnosticChatCandidate(name, source, analysis, options = {}) {
    const fileInfo = buildDiagnosticFileInfo(null, {
        name,
        size: options.size,
        entryPath: options.entryPath
    });

    return {
        source,
        ...fileInfo,
        valid: !!analysis.valid,
        format: analysis.format,
        reason: sanitizeDiagnosticText(analysis.reason, 260),
        lineCount: analysis.lineCount,
        checkedLines: analysis.checkedLines,
        hasBom: analysis.hasBom,
        sampleLines: analysis.sampleLines || [],
        patternFlags: {
            macOSCsvHeader: analysis.hasMacOSCsvHeader,
            macOSCsvValidRows: analysis.hasValidMacOSCsv,
            iosDateHeader: analysis.hasDateHeader,
            iosMessage: analysis.hasMessage,
            androidMessage: analysis.hasAndroidMessage,
            windowsDateHeader: analysis.hasWindowsDateHeader,
            windowsMessage: analysis.hasWindowsMessage
        }
    };
}

function recordDiagnosticInput(files, source) {
    const list = Array.from(files || []);
    let totalBytes = 0;
    let txtFileCount = 0;
    let csvFileCount = 0;
    let zipFileCount = 0;
    let attachmentFileCount = 0;
    const fileSamples = [];

    for (const file of list) {
        const name = String(file.name || '');
        totalBytes += Number(file.size) || 0;
        if (/\.txt$/i.test(name)) txtFileCount++;
        if (/\.csv$/i.test(name)) csvFileCount++;
        if (/\.zip$/i.test(name)) zipFileCount++;
        if (isAttachmentFile(name)) attachmentFileCount++;
        if (fileSamples.length < DIAGNOSTIC_FILE_SAMPLE_LIMIT) {
            fileSamples.push(buildDiagnosticFileInfo(file));
        }
    }

    diagnosticRedactions = [];

    diagnosticState.input = {
        source,
        fileCount: list.length,
        totalBytes,
        extensions: summarizeFileExtensions(list),
        files: fileSamples,
        omittedFileCount: Math.max(0, list.length - fileSamples.length),
        txtFileCount,
        csvFileCount,
        zipFileCount,
        attachmentFileCount
    };

    resetDiagnosticProcessing(source);
}

function setDiagnosticStage(stage) {
    diagnosticState.stage = sanitizeDiagnosticText(stage, 160) || 'unknown';
}

function getLatestDiagnosticEvent() {
    if (diagnosticState.events.length === 0) return null;
    return diagnosticState.events[diagnosticState.events.length - 1];
}

function normalizeDiagnosticError(error, context = {}) {
    const fallbackMessage = typeof error === 'string' ? error : '알 수 없는 오류';
    const message = error && error.message ? error.message : fallbackMessage;
    const stack = error && error.stack ? error.stack : '';
    const name = error && error.name ? error.name : context.type || 'Error';
    const source = context.filename ? String(context.filename).split('?')[0].split('#')[0].split('/').pop() : '';

    return {
        id: `${Date.now()}-${diagnosticState.events.length + 1}`,
        time: new Date().toISOString(),
        type: sanitizeDiagnosticText(context.type || name, 80),
        stage: sanitizeDiagnosticText(context.stage || diagnosticState.stage, 160),
        message: sanitizeDiagnosticText(message, 600),
        stack: sanitizeDiagnosticText(stack, 3000),
        source: sanitizeDiagnosticText(source, 160),
        line: context.line || context.lineno || '',
        column: context.column || context.colno || ''
    };
}

function showDiagnosticToast(event) {
    if (!diagnosticToast) return;

    if (diagnosticToastMessage) {
        diagnosticToastMessage.textContent = `${event.stage} 단계의 진단 리포트를 준비했습니다.`;
    }

    diagnosticToast.hidden = false;
}

function captureDiagnosticError(error, context = {}) {
    if (context.stage) {
        setDiagnosticStage(context.stage);
    }

    const event = normalizeDiagnosticError(error, context);
    diagnosticState.events.push(event);
    if (diagnosticState.events.length > DIAGNOSTIC_EVENT_LIMIT) {
        diagnosticState.events = diagnosticState.events.slice(-DIAGNOSTIC_EVENT_LIMIT);
    }

    showDiagnosticToast(event);
    updateDiagnosticReportText();
    return event;
}

function formatDiagnosticFileLine(file) {
    const parts = [
        file.name || '(name-missing)',
        file.ext ? `.${file.ext}` : '확장자 없음',
        formatSize(file.size || 0)
    ];

    if (file.relativePath) parts.push(`상대경로: ${file.relativePath}`);
    if (file.entryPath) parts.push(`ZIP 경로: ${file.entryPath}`);
    if (file.lastModified) parts.push(`수정시각: ${file.lastModified}`);

    return parts.join(' / ');
}

function formatDiagnosticPatternFlags(flags) {
    if (!flags) return '없음';
    return [
        `macOS헤더:${flags.macOSCsvHeader ? 'Y' : 'N'}`,
        `macOS행:${flags.macOSCsvValidRows ? 'Y' : 'N'}`,
        `iOS날짜:${flags.iosDateHeader ? 'Y' : 'N'}`,
        `iOS메시지:${flags.iosMessage ? 'Y' : 'N'}`,
        `Android메시지:${flags.androidMessage ? 'Y' : 'N'}`,
        `Windows날짜:${flags.windowsDateHeader ? 'Y' : 'N'}`,
        `Windows메시지:${flags.windowsMessage ? 'Y' : 'N'}`
    ].join(', ');
}

function formatDiagnosticSampleLines(sampleLines) {
    if (!sampleLines || sampleLines.length === 0) return '  - 샘플 라인: 없음';
    return sampleLines
        .map(line => `  - L${line.line}: ${line.text || '(empty)'}`)
        .join('\n');
}

function buildDiagnosticReport(options = {}) {
    const latest = getLatestDiagnosticEvent();
    const input = diagnosticState.input;
    const processing = diagnosticState.processing;
    const capabilities = getBrowserCapabilityStatus();
    const navigatorSnapshot = getNavigatorSnapshot();
    const viewport = getViewportSnapshot();
    const compact = !!options.compact;
    const events = compact ? (latest ? [latest] : []) : diagnosticState.events;

    const lines = [
        '# chaextractor 오류 진단 리포트',
        '',
        '> 오류 분석을 위해 오류 메시지, 파일명, 경로, 크기, 후보 대화 파일 샘플 라인, 검증 결과를 포함합니다.',
        '',
        '## 오류',
        `- 리포트 생성 시각: ${new Date().toISOString()}`,
        `- 마지막 단계: ${diagnosticState.stage}`,
        `- 진행률: ${diagnosticState.progress.percent}% / ${diagnosticState.progress.text}`,
        `- 오류 유형: ${latest ? latest.type : 'manual-report'}`,
        `- 오류 메시지: ${latest ? latest.message : '사용자가 직접 연 제보입니다.'}`,
        '',
        '## 입력 요약',
        `- 입력 경로: ${input.source}`,
        `- 파일 수: ${input.fileCount}`,
        `- 총 크기: ${formatSize(input.totalBytes)}`,
        `- 확장자 분포: ${input.extensions.length ? input.extensions.join(', ') : '없음'}`,
        `- TXT 후보: ${input.txtFileCount}`,
        `- CSV 후보: ${input.csvFileCount}`,
        `- ZIP 후보: ${input.zipFileCount}`,
        `- 첨부파일 후보: ${input.attachmentFileCount}`,
        `- 파일명 샘플 수: ${input.files.length}${input.omittedFileCount ? ` (외 ${input.omittedFileCount}개 생략)` : ''}`,
        '',
        '## 입력 파일 샘플',
        ...(input.files.length
            ? input.files.map(file => `- ${formatDiagnosticFileLine(file)}`)
            : ['- 없음']),
        '',
        '## 처리 정황',
        `- 처리 경로: ${processing.route}`,
        `- ZIP 엔트리 수: ${processing.zipEntryCount || 0}`,
        `- ZIP 파일 샘플 수: ${processing.zipEntries.length}${processing.omittedZipEntryCount ? ` (외 ${processing.omittedZipEntryCount}개 생략)` : ''}`,
        `- 대화 파일 후보: ${processing.chatCandidateCount || 0}`,
        `- 유효 대화 파일: ${processing.validChatFileCount || 0}`,
        `- 첨부파일 후보: ${processing.attachmentCandidateCount || 0}`,
        `- 첨부 확장자 분포: ${processing.attachmentExtensions.length ? processing.attachmentExtensions.join(', ') : '없음'}`,
        `- 처리 중 감지 플랫폼: ${processing.detectedPlatform || detectedPlatform}`,
        `- 파싱 결과: ${processing.parseResult ? `${processing.parseResult.messageCount}개 메시지 / ${processing.parseResult.dateCount}개 날짜 / ${processing.parseResult.attachmentMappedCount}개 첨부 매핑` : '없음'}`,
        '',
        '## 대화 파일 검증',
        ...(processing.chatCandidates.length
            ? processing.chatCandidates.map((candidate) => [
                `- ${candidate.name || '(name-missing)'}: ${candidate.valid ? '유효' : '실패'} / ${candidate.format} / ${candidate.lineCount}줄 / ${candidate.reason}`,
                `  - 크기/경로: ${formatSize(candidate.size || 0)}${candidate.entryPath ? ` / ${candidate.entryPath}` : ''}`,
                `  - 패턴: ${formatDiagnosticPatternFlags(candidate.patternFlags)}`,
                formatDiagnosticSampleLines(candidate.sampleLines)
            ].join('\n'))
            : ['- 검증된 후보 없음']),
        '',
        '## ZIP 내부 파일 샘플',
        ...(processing.zipEntries.length
            ? processing.zipEntries.map(file => `- ${formatDiagnosticFileLine(file)}`)
            : ['- ZIP 입력 아님 또는 샘플 없음']),
        '',
        '## 앱 상태',
        `- 앱 URL: ${getSafeAppUrl()}`,
        `- 감지 플랫폼: ${detectedPlatform}`,
        `- 메시지 수: ${messages.length}`,
        `- 날짜 수: ${dates.length}`,
        `- 선택 날짜: ${selectedDate || '없음'}`,
        `- 사용자 필터: ${leaderFilterActive ? 'on' : 'off'}`,
        '',
        '## 브라우저',
        `- User agent: ${navigatorSnapshot.userAgent}`,
        `- Language: ${navigatorSnapshot.language}`,
        `- Platform: ${navigatorSnapshot.platform}`,
        `- Viewport: ${viewport.width}x${viewport.height}`,
        `- File API: ${capabilities.file ? 'yes' : 'no'}`,
        `- Blob API: ${capabilities.blob ? 'yes' : 'no'}`,
        `- IndexedDB: ${capabilities.indexedDB ? 'yes' : 'no'}`,
        `- Object URL: ${capabilities.objectURL ? 'yes' : 'no'}`
    ];

    if (events.length > 0) {
        lines.push('', '## 최근 오류 이벤트');
        for (const event of events) {
            lines.push(
                '',
                `### ${event.time}`,
                `- 유형: ${event.type}`,
                `- 단계: ${event.stage}`,
                `- 메시지: ${event.message}`
            );
            if (event.source) {
                lines.push(`- 위치: ${event.source}:${event.line || '?'}:${event.column || '?'}`);
            }
            if (event.stack) {
                lines.push('', '```text', event.stack, '```');
            }
        }
    }

    lines.push(
        '',
        '## 재현 절차',
        '1.',
        '2.',
        '3.',
        '',
        '## 기대한 동작',
        '',
        '## 실제 동작'
    );

    return lines.join('\n');
}

function updateDiagnosticReportText() {
    if (!diagnosticReportText) return '';

    const report = buildDiagnosticReport();
    diagnosticReportText.value = report;
    return report;
}

function buildGoogleFormPrefillUrl(report) {
    const params = {
        usp: 'pp_url',
        [BUG_REPORT_FORM_TYPE_FIELD]: '버그 제보',
        [BUG_REPORT_FORM_CONTENT_FIELD]: report
    };
    const query = Object.keys(params)
        .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');

    return `${BUG_REPORT_FORM_URL}?${query}`;
}

function buildDiagnosticIssueUrl() {
    const compactReport = buildDiagnosticReport({ compact: true });
    const fullUrl = buildGoogleFormPrefillUrl(compactReport);

    if (fullUrl.length <= BUG_REPORT_FORM_PREFILL_LIMIT) {
        return fullUrl;
    }

    const fallbackReport = `${compactReport.slice(0, 6000)}

(진단 리포트가 길어 일부만 자동 입력됐습니다. 전체 리포트가 필요하면 앱의 '진단 리포트 복사' 버튼으로 복사해 붙여넣어 주세요.)`;
    return buildGoogleFormPrefillUrl(fallbackReport);
}

async function copyDiagnosticReport() {
    const report = updateDiagnosticReportText();
    const nav = typeof navigator !== 'undefined'
        ? navigator
        : (window && window.navigator ? window.navigator : {});

    try {
        if (!nav.clipboard || typeof nav.clipboard.writeText !== 'function') {
            throw new Error('clipboard-unavailable');
        }
        await nav.clipboard.writeText(report);
        if (diagnosticCopyStatus) {
            diagnosticCopyStatus.textContent = '진단 리포트를 복사했습니다.';
        }
        return { ok: true };
    } catch (error) {
        if (diagnosticCopyStatus) {
            diagnosticCopyStatus.textContent = '자동 복사가 안 되면 아래 리포트를 직접 선택해 복사해주세요.';
        }
        return { ok: false, reason: error.message || 'copy-failed' };
    }
}

function openIssueReportPage() {
    updateDiagnosticReportText();
    const url = buildDiagnosticIssueUrl();

    if (typeof window.open === 'function') {
        const opened = window.open(url, '_blank', 'noopener');
        if (opened) opened.opener = null;
        return url;
    }

    return url;
}

function openDiagnosticReportModal() {
    if (diagnosticState.events.length === 0) {
        setDiagnosticStage('manual-report');
    }
    updateDiagnosticReportText();
    if (diagnosticCopyStatus) {
        diagnosticCopyStatus.textContent = '';
    }
    openModal('reportIssueModal');
}

function buildDiagnosticTestSnapshot() {
    updateDiagnosticReportText();
    return {
        stage: diagnosticState.stage,
        input: { ...diagnosticState.input },
        eventCount: diagnosticState.events.length,
        latestEvent: getLatestDiagnosticEvent(),
        reportText: diagnosticReportText ? diagnosticReportText.value : '',
        issueUrl: buildDiagnosticIssueUrl(),
        toastVisible: diagnosticToast ? !diagnosticToast.hidden : false,
        reportModalOpen: isModalOpen('reportIssueModal')
    };
}

// ========== 갈무리 TXT ==========
function getCaptureScope() {
    if (captureScopeCurrent && captureScopeCurrent.checked && selectedDate) {
        return 'current';
    }
    return 'all';
}

function getCaptureDates(scope = getCaptureScope()) {
    if (scope === 'current' && selectedDate && messagesByDate[selectedDate]) {
        return [selectedDate];
    }
    return [...dates].reverse();
}

function getCaptureMessagesForDate(date, options = {}) {
    const sourceMessages = messagesByDate[date] || [];
    if (!options.useLeaderFilter) return sourceMessages;
    return sourceMessages.filter(msg => isLeader(msg.user));
}

function formatCaptureDate(date) {
    const [year, month, day] = date.split('-').map(Number);
    const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const dateObj = new Date(year, month - 1, day);
    return `${year}년 ${month}월 ${day}일 ${dayNames[dateObj.getDay()]}`;
}

function normalizeCaptureText(text) {
    return String(text || '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim();
}

function getCaptureMessageBody(msg) {
    if (msg.message_type === 'photo') {
        const ref = msg.attachment_ref || msg.attachment_path || '';
        return ref ? `[사진: ${ref}]` : '[사진]';
    }
    if (msg.message_type === 'file') {
        const ref = msg.attachment_ref || msg.attachment_path || msg.content || '파일';
        return `[파일: ${ref}]`;
    }
    if (msg.message_type === 'emoticon') {
        return '[이모티콘]';
    }
    return normalizeCaptureText(msg.content);
}

function formatCaptureMessage(msg) {
    const user = normalizeCaptureText(msg.user) || '알 수 없음';
    const time = normalizeCaptureText(msg.time) || '--:--';
    const body = getCaptureMessageBody(msg) || '(빈 메시지)';
    const indentedBody = body.replace(/\n/g, '\n    ');
    return `[${time}] ${user}: ${indentedBody}`;
}

function buildCapturePayload(scope = getCaptureScope(), options = {}) {
    const useLeaderFilter = !!options.useLeaderFilter;
    const targetDates = getCaptureDates(scope);
    const rows = [];
    const participants = new Set();
    const typeCounts = { text: 0, photo: 0, file: 0, emoticon: 0 };

    for (const date of targetDates) {
        const dayMessages = getCaptureMessagesForDate(date, { useLeaderFilter });
        if (dayMessages.length === 0) continue;

        rows.push({ type: 'date', date });
        for (const msg of dayMessages) {
            participants.add(msg.user);
            typeCounts[msg.message_type] = (typeCounts[msg.message_type] || 0) + 1;
            rows.push({ type: 'message', msg });
        }
    }

    return {
        scope,
        useLeaderFilter,
        dates: targetDates,
        rows,
        participants: [...participants].sort(),
        typeCounts,
        messageCount: rows.filter(row => row.type === 'message').length
    };
}

function buildCaptureText(scope = getCaptureScope(), options = {}) {
    const payload = buildCapturePayload(scope, options);
    const includedDates = payload.rows
        .filter(row => row.type === 'date')
        .map(row => row.date);
    const rangeText = includedDates.length > 0
        ? `${includedDates[0]} ~ ${includedDates[includedDates.length - 1]}`
        : '없음';
    const scopeText = payload.scope === 'current' ? '현재 날짜' : '전체 대화';
    const filterText = payload.useLeaderFilter ? leaderFilterTarget : '없음';
    const lines = [
        '# 카카오톡 대화 갈무리',
        '',
        '## 요약 요청',
        '아래 대화를 날짜별 흐름, 주요 주제, 의사결정, 할 일, 언급된 링크 중심으로 요약해주세요.',
        '',
        '## 메타데이터',
        `- 생성 시각: ${new Date().toISOString()}`,
        `- 범위: ${scopeText}`,
        `- 기간: ${rangeText}`,
        `- 플랫폼: ${detectedPlatform}`,
        `- 메시지 수: ${payload.messageCount.toLocaleString()}`,
        `- 참여자 수: ${payload.participants.length.toLocaleString()}`,
        `- 사용자 필터: ${filterText}`,
        `- 사진: ${(payload.typeCounts.photo || 0).toLocaleString()}개`,
        `- 파일: ${(payload.typeCounts.file || 0).toLocaleString()}개`,
        `- 이모티콘: ${(payload.typeCounts.emoticon || 0).toLocaleString()}개`,
        '- 첨부파일 내용: 포함하지 않음',
        '',
        '## 대화'
    ];

    if (payload.messageCount === 0) {
        lines.push('', '갈무리할 메시지가 없습니다.');
        return lines.join('\n');
    }

    for (const row of payload.rows) {
        if (row.type === 'date') {
            lines.push('', `### ${formatCaptureDate(row.date)}`);
        } else {
            lines.push(formatCaptureMessage(row.msg));
        }
    }

    return lines.join('\n');
}

function updateCaptureText() {
    const scope = getCaptureScope();
    const useLeaderFilter = !!(captureUseLeaderFilter && captureUseLeaderFilter.checked);
    const text = buildCaptureText(scope, { useLeaderFilter });
    if (captureText) {
        captureText.value = text;
    }
    if (captureStatus) {
        const messageCount = buildCapturePayload(scope, { useLeaderFilter }).messageCount;
        captureStatus.textContent = `${messageCount.toLocaleString()}개 메시지를 TXT로 준비했습니다.`;
    }
    return text;
}

function buildCaptureFilename() {
    const scope = getCaptureScope();
    const targetDates = getCaptureDates(scope);
    const range = targetDates.length > 0
        ? `${targetDates[0].replaceAll('-', '')}-${targetDates[targetDates.length - 1].replaceAll('-', '')}`
        : 'empty';
    return `chaextractor-capture-${scope}-${range}.txt`;
}

function openCaptureModal() {
    if (captureScopeCurrent) {
        captureScopeCurrent.disabled = !selectedDate;
        captureScopeCurrent.checked = !!selectedDate;
    }
    if (captureScopeAll) {
        captureScopeAll.checked = !selectedDate;
    }
    if (captureUseLeaderFilter) {
        captureUseLeaderFilter.checked = leaderFilterActive;
    }
    if (captureStatus) {
        captureStatus.textContent = '';
    }
    updateCaptureText();
    openModal('captureModal');
}

async function copyCaptureText() {
    const text = updateCaptureText();
    const nav = typeof navigator !== 'undefined'
        ? navigator
        : (window && window.navigator ? window.navigator : {});

    try {
        if (!nav.clipboard || typeof nav.clipboard.writeText !== 'function') {
            throw new Error('clipboard-unavailable');
        }
        await nav.clipboard.writeText(text);
        if (captureStatus) {
            captureStatus.textContent = '갈무리 TXT를 복사했습니다.';
        }
        return { ok: true };
    } catch (error) {
        if (captureText && typeof captureText.focus === 'function') {
            captureText.focus();
        }
        if (captureText && typeof captureText.select === 'function') {
            captureText.select();
        }
        if (captureStatus) {
            captureStatus.textContent = '자동 복사가 안 되면 아래 TXT를 직접 선택해 복사해주세요.';
        }
        return { ok: false, reason: error.message || 'copy-failed' };
    }
}

function downloadCaptureText() {
    const text = updateCaptureText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = buildCaptureFilename();
    document.body.appendChild(link);
    link.click();
    if (typeof link.remove === 'function') {
        link.remove();
    }
    setTimeout(() => URL.revokeObjectURL(url), 0);
    if (captureStatus) {
        captureStatus.textContent = '갈무리 TXT를 다운로드했습니다.';
    }
    return { ok: true, filename: link.download };
}

function buildCaptureTestSnapshot() {
    updateCaptureText();
    return {
        captureModalOpen: isModalOpen('captureModal'),
        scope: getCaptureScope(),
        useLeaderFilter: !!(captureUseLeaderFilter && captureUseLeaderFilter.checked),
        text: captureText ? captureText.value : '',
        status: captureStatus ? captureStatus.textContent : '',
        filename: buildCaptureFilename()
    };
}

// ========== 브라우저 기능 제한 안내 ==========
function getBrowserCapabilityStatus(scope = window) {
    const urlApi = scope.URL || (typeof URL !== 'undefined' ? URL : null);
    return {
        file: typeof scope.File !== 'undefined',
        blob: typeof scope.Blob !== 'undefined',
        indexedDB: typeof scope.indexedDB !== 'undefined',
        objectURL: !!(urlApi && typeof urlApi.createObjectURL === 'function')
    };
}

function buildCapabilityMessages(status) {
    const messages = [];
    if (!status.file) {
        messages.push('File API가 없어 파일 선택 업로드를 사용할 수 없습니다. 최신 Chrome, Edge, Firefox, Safari에서 다시 열어주세요.');
    }
    if (!status.blob || !status.objectURL) {
        messages.push('Blob URL 기능이 없어 첨부파일 미리보기와 파일 링크가 제한됩니다.');
    }
    if (!status.indexedDB) {
        messages.push('IndexedDB가 없어 캐시 없이 동작합니다. 같은 파일을 다시 열면 재파싱합니다.');
    }
    return messages;
}

function applyBrowserCapabilityStatus(status = getBrowserCapabilityStatus()) {
    const messages = buildCapabilityMessages(status);
    const critical = !status.file || !status.blob || !status.objectURL;

    if (messages.length > 0) {
        capabilityWarning.textContent = messages.join(' ');
        capabilityWarning.hidden = false;
        capabilityWarning.classList.add('active');
    } else {
        capabilityWarning.textContent = '';
        capabilityWarning.hidden = true;
        capabilityWarning.classList.remove('active');
    }

    zipInput.disabled = critical;
    folderInput.disabled = critical;
    zipBtn.classList.toggle('disabled', critical);
    folderBtn.classList.toggle('disabled', critical);
    dropZone.classList.toggle('disabled', critical);

    return {
        supported: messages.length === 0,
        critical,
        messages,
        status
    };
}

function buildCapabilityTestSnapshot() {
    return {
        warningActive: capabilityWarning.classList.contains('active'),
        warningHidden: capabilityWarning.hidden,
        warningText: capabilityWarning.textContent,
        zipInputDisabled: zipInput.disabled,
        folderInputDisabled: folderInput.disabled,
        zipButtonDisabled: zipBtn.classList.contains('disabled'),
        folderButtonDisabled: folderBtn.classList.contains('disabled'),
        dropZoneDisabled: dropZone.classList.contains('disabled')
    };
}

function setAttachmentFilesForTest(files) {
    attachmentFiles = { ...files };
}

function buildCachePrivacyTestSnapshot() {
    return {
        attachmentFileCount: Object.keys(attachmentFiles).length,
        attachmentEntriesCount: Object.keys(attachmentEntries).length,
        zipInstanceActive: !!zipInstance,
        cacheStatus: cacheStatus.textContent,
        clearCacheDisabled: clearCacheBtn.disabled
    };
}

applyBrowserCapabilityStatus();

// ========== 런타임 첨부파일/캐시 정리 ==========
function clearRuntimeAttachmentFiles() {
    let revokedCount = 0;

    if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
        for (const url of Object.values(attachmentFiles)) {
            if (typeof url === 'string' && url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
                revokedCount++;
            }
        }
    }

    attachmentFiles = {};
    return revokedCount;
}

function resetRuntimeAttachmentState() {
    const revokedCount = clearRuntimeAttachmentFiles();
    attachmentEntries = {};
    zipInstance = null;
    return revokedCount;
}

async function clearAllCache() {
    try {
        if (typeof indexedDB === 'undefined') {
            return { ok: false, reason: 'indexedDB-missing' };
        }

        const db = await initDB();
        return new Promise((resolve) => {
            const transaction = db.transaction([DB_CONFIG.storeName], 'readwrite');
            const store = transaction.objectStore(DB_CONFIG.storeName);
            const request = store.clear();

            request.onsuccess = () => resolve({ ok: true });
            request.onerror = () => resolve({ ok: false, reason: 'clear-failed' });
        });
    } catch (error) {
        return { ok: false, reason: error.message || 'clear-failed' };
    }
}

// ========== 공통 모달 함수 ==========
let lastModalTrigger = null;
const modalIds = ['settingsModal', 'captureModal', 'reportIssueModal', 'imageModal'];

function rememberModalTrigger() {
    lastModalTrigger = document.activeElement;
}

function restoreModalTrigger() {
    if (lastModalTrigger && typeof lastModalTrigger.focus === 'function') {
        lastModalTrigger.focus();
    }
    lastModalTrigger = null;
}

function is1995ThemeActive() {
    return document.documentElement.getAttribute('data-theme') === '1995';
}

function normalize1995GhostRect(rect) {
    if (!rect) return null;

    const left = Number(rect.left);
    const top = Number(rect.top);
    const width = Math.max(Number(rect.width) || 0, THEME_1995_GHOST_SIZE);
    const height = Math.max(Number(rect.height) || 0, THEME_1995_GHOST_SIZE);

    if (!Number.isFinite(left) || !Number.isFinite(top)) {
        return null;
    }

    return { left, top, width, height };
}

function viewportCenterGhostRect() {
    const viewportWidth = window.innerWidth
        || document.documentElement.clientWidth
        || THEME_1995_GHOST_SIZE;
    const viewportHeight = window.innerHeight
        || document.documentElement.clientHeight
        || THEME_1995_GHOST_SIZE;

    return {
        left: (viewportWidth - THEME_1995_GHOST_SIZE) / 2,
        top: (viewportHeight - THEME_1995_GHOST_SIZE) / 2,
        width: THEME_1995_GHOST_SIZE,
        height: THEME_1995_GHOST_SIZE
    };
}

function elementGhostRect(element) {
    if (!element || typeof element.getBoundingClientRect !== 'function') {
        return null;
    }

    return normalize1995GhostRect(element.getBoundingClientRect());
}

function pointGhostRectFromElement(element) {
    const rect = elementGhostRect(element);
    if (!rect) {
        return viewportCenterGhostRect();
    }

    return {
        left: rect.left + (rect.width / 2) - (THEME_1995_GHOST_SIZE / 2),
        top: rect.top + (rect.height / 2) - (THEME_1995_GHOST_SIZE / 2),
        width: THEME_1995_GHOST_SIZE,
        height: THEME_1995_GHOST_SIZE
    };
}

function setGhostStyleProperty(element, property, value) {
    if (!element || !element.style) return;

    if (typeof element.style.setProperty === 'function') {
        element.style.setProperty(property, value);
    } else {
        element.style[property] = value;
    }
}

function interpolate1995GhostRect(from, to, ratio) {
    return {
        left: from.left + ((to.left - from.left) * ratio),
        top: from.top + ((to.top - from.top) * ratio),
        width: from.width + ((to.width - from.width) * ratio),
        height: from.height + ((to.height - from.height) * ratio)
    };
}

function append1995GhostFrame(container, rect, index, delayMs) {
    const frame = document.createElement('div');
    frame.className = 'win31-ghost-frame';
    frame.setAttribute('aria-hidden', 'true');
    frame.dataset.frameIndex = String(index);

    setGhostStyleProperty(frame, '--frame-left', `${rect.left}px`);
    setGhostStyleProperty(frame, '--frame-top', `${rect.top}px`);
    setGhostStyleProperty(frame, '--frame-width', `${rect.width}px`);
    setGhostStyleProperty(frame, '--frame-height', `${rect.height}px`);
    setGhostStyleProperty(frame, '--frame-delay', `${delayMs}ms`);

    container.appendChild(frame);
}

function play1995GhostBox(fromRect, toRect, onFinish) {
    const finish = () => {
        if (typeof onFinish === 'function') {
            onFinish();
        }
    };

    if (!is1995ThemeActive() || !document.body || typeof document.createElement !== 'function') {
        finish();
        return;
    }

    const from = normalize1995GhostRect(fromRect);
    const to = normalize1995GhostRect(toRect);

    if (!from || !to) {
        finish();
        return;
    }

    const ghost = document.createElement('div');
    ghost.className = 'win31-ghost-box';
    ghost.setAttribute('aria-hidden', 'true');
    ghost.dataset.frameCount = String(THEME_1995_GHOST_FRAME_COUNT);

    const frameDelay = THEME_1995_WINDOW_ANIMATION_MS / Math.max(THEME_1995_GHOST_FRAME_COUNT - 1, 1);
    for (let index = 0; index < THEME_1995_GHOST_FRAME_COUNT; index++) {
        const ratio = index / Math.max(THEME_1995_GHOST_FRAME_COUNT - 1, 1);
        const rect = interpolate1995GhostRect(from, to, ratio);
        append1995GhostFrame(ghost, rect, index, Math.round(index * frameDelay));
    }

    document.body.appendChild(ghost);

    let finished = false;
    const cleanup = () => {
        if (finished) return;
        finished = true;
        if (ghost.parentNode) {
            ghost.parentNode.removeChild(ghost);
        }
        finish();
    };

    setTimeout(cleanup, THEME_1995_WINDOW_ANIMATION_MS + 80);
}

function focusModalCloseButton(modal) {
    const closeButton = modal.querySelector('.modal-close-btn');
    if (closeButton && typeof closeButton.focus === 'function') {
        closeButton.focus();
    }
}

function animate1995Panel(panel, className, fromRect, toRect) {
    if (!panel || !is1995ThemeActive() || !isMobileView()) return;

    panel.classList.remove('panel-opening', 'panel-closing');
    panel.classList.add(className);
    play1995GhostBox(fromRect, toRect, () => {
        panel.classList.remove(className);
    });
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    rememberModalTrigger();
    const fromRect = pointGhostRectFromElement(lastModalTrigger);
    if (modal.dataset.closeTimer) {
        clearTimeout(Number(modal.dataset.closeTimer));
        delete modal.dataset.closeTimer;
    }
    modal.classList.remove('closing', 'win31-window-hidden');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');

    if (!is1995ThemeActive()) {
        focusModalCloseButton(modal);
        return;
    }

    modal.classList.add('win31-window-hidden');
    play1995GhostBox(fromRect, elementGhostRect(modal.querySelector('.modal-box')), () => {
        modal.classList.remove('win31-window-hidden');
        if (modal.classList.contains('open') && !modal.classList.contains('closing')) {
            focusModalCloseButton(modal);
        }
    });
}

function closeModal(modalId, restoreFocus = true) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    const shouldAnimateClose = is1995ThemeActive()
        && modal.classList.contains('open')
        && !modal.classList.contains('closing');

    if (shouldAnimateClose) {
        const fromRect = elementGhostRect(modal.querySelector('.modal-box'));
        const toRect = pointGhostRectFromElement(lastModalTrigger);

        modal.classList.add('closing', 'win31-window-hidden');
        modal.setAttribute('aria-hidden', 'true');
        play1995GhostBox(fromRect, toRect);
        modal.dataset.closeTimer = String(setTimeout(() => {
            modal.classList.remove('open', 'closing', 'win31-window-hidden');
            delete modal.dataset.closeTimer;
            if (restoreFocus) {
                restoreModalTrigger();
            }
        }, THEME_1995_WINDOW_ANIMATION_MS + 80));
        return;
    }

    modal.classList.remove('open');
    modal.classList.remove('closing', 'win31-window-hidden');
    modal.setAttribute('aria-hidden', 'true');

    if (restoreFocus) {
        restoreModalTrigger();
    }
}

function closeImageModal(restoreFocus = true) {
    const modal = document.getElementById('imageModal');
    if (!modal) return;

    const shouldAnimateClose = is1995ThemeActive()
        && modal.classList.contains('active')
        && !modal.classList.contains('closing');

    if (shouldAnimateClose) {
        const fromRect = elementGhostRect(document.getElementById('modalImage'));
        const toRect = pointGhostRectFromElement(lastModalTrigger);

        modal.classList.add('closing', 'win31-window-hidden');
        modal.setAttribute('aria-hidden', 'true');
        play1995GhostBox(fromRect, toRect);
        setTimeout(() => {
            modal.classList.remove('active', 'closing', 'win31-window-hidden');
            if (restoreFocus) {
                restoreModalTrigger();
            }
        }, THEME_1995_WINDOW_ANIMATION_MS + 80);
        return;
    }

    modal.classList.remove('active');
    modal.classList.remove('closing', 'win31-window-hidden');
    modal.setAttribute('aria-hidden', 'true');

    if (restoreFocus) {
        restoreModalTrigger();
    }
}

function isModalOpen(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return false;
    return !modal.classList.contains('closing')
        && (modal.classList.contains('open') || modal.classList.contains('active'));
}

function closeActiveModal() {
    for (const modalId of modalIds) {
        if (isModalOpen(modalId)) {
            if (modalId === 'imageModal') {
                closeImageModal();
            } else {
                closeModal(modalId);
            }
            return true;
        }
    }

    return false;
}

function handleModalKeydown(e) {
    if (e.key === 'Escape' && closeActiveModal()) {
        e.preventDefault();
    }
}

document.addEventListener('keydown', handleModalKeydown);

// 모달 닫기 버튼 (data-modal 속성 사용)
document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        closeModal(btn.dataset.modal);
    });
});

// 모달 배경 클릭시 닫기
document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal(modal.id);
        }
    });
});

[reportIssueFooterBtn, reportIssueLinkBtn, diagnosticToastDetails].forEach(btn => {
    if (!btn) return;
    btn.addEventListener('click', openDiagnosticReportModal);
});

if (copyDiagnosticBtn) {
    copyDiagnosticBtn.addEventListener('click', copyDiagnosticReport);
}

if (openIssueBtn) {
    openIssueBtn.addEventListener('click', openIssueReportPage);
}

if (diagnosticToastIssue) {
    diagnosticToastIssue.addEventListener('click', openIssueReportPage);
}

if (captureBtn) {
    captureBtn.addEventListener('click', openCaptureModal);
}

[captureScopeCurrent, captureScopeAll, captureUseLeaderFilter].forEach(control => {
    if (!control) return;
    control.addEventListener('change', updateCaptureText);
});

if (copyCaptureBtn) {
    copyCaptureBtn.addEventListener('click', copyCaptureText);
}

if (downloadCaptureBtn) {
    downloadCaptureBtn.addEventListener('click', downloadCaptureText);
}

window.addEventListener('error', (event) => {
    captureDiagnosticError(event.error || event.message, {
        type: 'window.error',
        stage: diagnosticState.stage,
        filename: event.filename,
        line: event.lineno,
        column: event.colno
    });
});

window.addEventListener('unhandledrejection', (event) => {
    captureDiagnosticError(event.reason || 'Unhandled promise rejection', {
        type: 'unhandledrejection',
        stage: diagnosticState.stage
    });
});

// ========== 설정 (테마/폰트) ==========
const settingsBtn = document.getElementById('settingsBtn');

function applyTheme(theme) {
    // 시스템 테마 해석
    let actualTheme = theme;
    if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        actualTheme = prefersDark ? 'dark' : 'light';
    }

    document.documentElement.setAttribute('data-theme', actualTheme);
    localStorage.setItem('theme', theme);

    // 폰트 자동 전환이 활성화된 경우에만
    const fontAutoSwitch = localStorage.getItem('fontAutoSwitch');
    if (fontAutoSwitch === null || fontAutoSwitch === 'true') {
        let autoFont = 'ridi';
        if (actualTheme === 'dark') {
            autoFont = 'neodgm';
        } else if (actualTheme === '1995') {
            autoFont = 'iyagi';
        }
        applyFont(autoFont, true);
    }
}

function applyFont(font, isAutoSwitch = false) {
    if (font === 'default') {
        document.documentElement.removeAttribute('data-font');
    } else {
        document.documentElement.setAttribute('data-font', font);
    }

    // 자동 전환이 아닌 경우에만 localStorage 저장
    if (!isAutoSwitch) {
        localStorage.setItem('font', font);
    }
}

function updateSettingsUI() {
    const currentTheme = localStorage.getItem('theme') || '1995';
    const storedFont = localStorage.getItem('font');
    const appliedFont = document.documentElement.getAttribute('data-font') || 'default';
    const currentFont = localStorage.getItem('fontAutoSwitch') === 'false'
        ? (storedFont || 'iyagi')
        : (appliedFont || storedFont || 'iyagi');

    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === currentTheme);
    });
    document.querySelectorAll('.font-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.font === currentFont);
    });
}

function initSettings() {
    const savedTheme = localStorage.getItem('theme') || '1995';
    let savedFont = localStorage.getItem('font') || 'iyagi';
    const fontAutoSwitch = localStorage.getItem('fontAutoSwitch');

    // 'default' 값을 'neodgm'으로 마이그레이션
    if (savedFont === 'default') {
        savedFont = 'neodgm';
        localStorage.setItem('font', 'neodgm');
    }

    // 테마 먼저 적용 (내부에서 폰트 자동 전환 처리)
    applyTheme(savedTheme);

    // 자동 전환이 비활성화된 경우에만 저장된 폰트 적용
    if (fontAutoSwitch === 'false') {
        applyFont(savedFont, false);
    }

    updateSettingsUI();
}

// 사용자 필터 버튼 클릭
const leaderFilterBtn = document.getElementById('leaderFilterBtn');
const leaderFilterPanel = document.getElementById('leaderFilterPanel');
const leaderFilterInput = document.getElementById('leaderFilterInput');
const leaderFilterApplyBtn = document.getElementById('leaderFilterApplyBtn');
const leaderFilterClearBtn = document.getElementById('leaderFilterClearBtn');

function normalizeLeaderFilterTarget(value) {
    const normalized = String(value || '').trim();
    return normalized || DEFAULT_LEADER_FILTER_TARGET;
}

function updateLeaderFilterUI() {
    leaderFilterBtn.classList.toggle('active', leaderFilterActive);
    leaderFilterBtn.setAttribute('aria-pressed', String(leaderFilterActive));
    leaderFilterBtn.title = `${leaderFilterTarget} 대화만 보기`;
    leaderFilterBtn.setAttribute('aria-label', `${leaderFilterTarget} 대화 필터`);

    if (leaderFilterInput && leaderFilterInput.value !== leaderFilterTarget) {
        leaderFilterInput.value = leaderFilterTarget;
    }
}

function setLeaderFilterPanelOpen(open) {
    if (!leaderFilterPanel) return;

    leaderFilterPanel.hidden = !open;
    leaderFilterBtn.setAttribute('aria-expanded', String(open));

    if (open && leaderFilterInput) {
        leaderFilterInput.value = leaderFilterTarget;
        requestAnimationFrame(() => {
            leaderFilterInput.focus();
            if (typeof leaderFilterInput.select === 'function') {
                leaderFilterInput.select();
            }
        });
    }
}

function recalculateLeaderCountByDate() {
    const nextCounts = {};

    Object.keys(messagesByDate).forEach(date => {
        nextCounts[date] = 0;
    });

    messages.forEach(msg => {
        if (!nextCounts[msg.date]) {
            nextCounts[msg.date] = 0;
        }
        if (isLeader(msg.user)) {
            nextCounts[msg.date]++;
        }
    });

    leaderCountByDate = nextCounts;
}

function refreshLeaderFilterViews() {
    recalculateLeaderCountByDate();
    updateLeaderFilterUI();

    const searchInput = document.getElementById('searchInput');
    renderDateList(searchInput ? searchInput.value.toLowerCase() : '');

    if (selectedDate && messagesByDate[selectedDate]) {
        renderChat(selectedDate);
    } else {
        applyLeaderFilter();
    }
}

function commitLeaderFilterTarget({ activate = true, closePanel = true } = {}) {
    leaderFilterTarget = normalizeLeaderFilterTarget(leaderFilterInput ? leaderFilterInput.value : leaderFilterTarget);
    leaderFilterActive = activate;
    refreshLeaderFilterViews();

    if (closePanel) {
        setLeaderFilterPanelOpen(false);
    }
}

function clearLeaderFilter() {
    leaderFilterActive = false;
    updateLeaderFilterUI();
    applyLeaderFilter();
    setLeaderFilterPanelOpen(false);
}

function hasClass(element, className) {
    if (element.classList && element.classList.contains(className)) {
        return true;
    }
    return String(element.className || '').split(/\s+/).includes(className);
}

leaderFilterBtn.addEventListener('click', () => {
    const shouldOpen = leaderFilterPanel ? leaderFilterPanel.hidden : false;
    setLeaderFilterPanelOpen(shouldOpen);

    if (!leaderFilterActive) {
        leaderFilterActive = true;
        refreshLeaderFilterViews();
    }
});

function applyLeaderFilter() {
    const container = document.getElementById('chatMessages');
    const renderedMessages = Array.from(container.children).filter(child =>
        hasClass(child, 'message')
    );

    renderedMessages.forEach(msg => {
        if (leaderFilterActive) {
            msg.style.display = hasClass(msg, 'leader') ? '' : 'none';
        } else {
            msg.style.display = '';
        }
    });
}

if (leaderFilterApplyBtn) {
    leaderFilterApplyBtn.addEventListener('click', () => {
        commitLeaderFilterTarget();
    });
}

if (leaderFilterClearBtn) {
    leaderFilterClearBtn.addEventListener('click', clearLeaderFilter);
}

if (leaderFilterInput) {
    leaderFilterInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            commitLeaderFilterTarget();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            setLeaderFilterPanelOpen(false);
        }
    });
}

function setLeaderFilterForTest(active, target = leaderFilterTarget) {
    leaderFilterTarget = normalizeLeaderFilterTarget(target);
    leaderFilterActive = active;
    refreshLeaderFilterViews();
}

updateLeaderFilterUI();
setLeaderFilterPanelOpen(false);

// 설정 버튼 클릭
settingsBtn.addEventListener('click', () => {
    openModal('settingsModal');
    updateSettingsUI();
});

clearCacheBtn.addEventListener('click', async () => {
    clearCacheBtn.disabled = true;
    cacheStatus.textContent = '삭제 중...';

    const result = await clearAllCache();
    cacheStatus.textContent = result.ok
        ? '삭제 완료'
        : '삭제 실패';

    clearCacheBtn.disabled = false;
});

// 테마 버튼 클릭
document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // 테마 변경 시 폰트 자동 전환 재활성화
        localStorage.removeItem('fontAutoSwitch');

        // applyTheme 호출 (내부에서 폰트 자동 전환)
        applyTheme(btn.dataset.theme);

        // 자동 전환된 폰트를 localStorage에 저장
        const currentFont = document.documentElement.getAttribute('data-font') || 'default';
        localStorage.setItem('font', currentFont);

        updateSettingsUI();
    });
});

// 폰트 버튼 클릭
document.querySelectorAll('.font-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // 사용자가 수동으로 폰트 변경 → 자동 전환 비활성화
        localStorage.setItem('fontAutoSwitch', 'false');

        applyFont(btn.dataset.font, false);
        updateSettingsUI();
    });
});

// 시스템 테마 변경 감지
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (localStorage.getItem('theme') === 'system') {
        applyTheme('system');
    }
});

// 페이지 로드시 설정 초기화
initSettings();

// ========== ZIP/TXT/CSV 파일 선택 ==========
zipBtn.addEventListener('click', () => zipInput.click());
zipInput.addEventListener('change', async (e) => {
    if (e.target.files.length > 0) {
        const files = Array.from(e.target.files);
        const file = files[0];
        recordDiagnosticInput(files, 'zipInput');
        setDiagnosticStage('zipInput-selected');
        zipName.textContent = `${file.name} (${formatSize(file.size)})`;
        zipBtn.disabled = true;
        folderBtn.disabled = true;
        step1.classList.add('processing');
        progressContainer.classList.add('active');

        try {
            await processFilesOrFolder(files);
            zipName.textContent = `✓ ${file.name} - 처리 완료!`;
            zipName.classList.remove('error');
            zipBtn.classList.add('selected');
            step1.classList.remove('processing');
            step1.classList.add('completed');
            startBtn.disabled = false;
            startBtn.style.display = 'inline-block';
        } catch (error) {
            captureDiagnosticError(error, {
                type: 'upload-processing',
                stage: diagnosticState.stage
            });
            zipName.textContent = `✗ 오류: ${error.message}`;
            zipName.classList.add('error');
            step1.classList.remove('processing');
            step1.classList.add('error');
            zipBtn.disabled = false;
            folderBtn.disabled = false;
        }
    }
});

// ========== 공통 업로드 처리 헬퍼 ==========
async function processFilesOrFolder(files) {
    setDiagnosticStage('input-routing');
    // 단일 .zip 파일이면 ZIP 처리로 라우팅 (폴더 버튼으로 zip을 올린 경우 등)
    if (files.length === 1 && files[0].name.toLowerCase().endsWith('.zip')) {
        return processZipFile(files[0]);
    }
    return processFolderFiles(files);
}

async function readDirectoryEntry(dirEntry, fileList) {
    return new Promise((resolve) => {
        const reader = dirEntry.createReader();
        const readBatch = () => {
            reader.readEntries(async (entries) => {
                if (entries.length === 0) { resolve(); return; }
                for (const entry of entries) {
                    if (entry.isFile) {
                        await new Promise(res => entry.file(f => { fileList.push(f); res(); }));
                    } else if (entry.isDirectory) {
                        await readDirectoryEntry(entry, fileList);
                    }
                }
                readBatch();
            });
        };
        readBatch();
    });
}

// ========== 드래그 앤 드롭 ==========
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', (e) => {
    if (!dropZone.contains(e.relatedTarget)) {
        dropZone.classList.remove('drag-over');
    }
});
dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');

    const items = Array.from(e.dataTransfer.items);
    const files = [];
    for (const item of items) {
        const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
        if (entry && entry.isDirectory) {
            await readDirectoryEntry(entry, files);
        } else {
            const f = item.getAsFile();
            if (f) files.push(f);
        }
    }
    if (files.length === 0) return;

    recordDiagnosticInput(files, 'dropZone');
    setDiagnosticStage('dropZone-files-detected');
    zipName.textContent = `${files.length}개 파일 감지됨`;
    zipBtn.disabled = true;
    folderBtn.disabled = true;
    step1.classList.add('processing');
    progressContainer.classList.add('active');

    try {
        await processFilesOrFolder(files);
        zipName.textContent = `✓ ${files.length}개 파일 - 처리 완료!`;
        zipName.classList.remove('error');
        step1.classList.remove('processing');
        step1.classList.add('completed');
        startBtn.disabled = false;
        startBtn.style.display = 'inline-block';
    } catch (error) {
        captureDiagnosticError(error, {
            type: 'drop-processing',
            stage: diagnosticState.stage
        });
        zipName.textContent = `✗ 오류: ${error.message}`;
        zipName.classList.add('error');
        step1.classList.remove('processing');
        step1.classList.add('error');
        zipBtn.disabled = false;
        folderBtn.disabled = false;
    }
});

// ========== 폴더 선택 ==========
folderBtn.addEventListener('click', () => folderInput.click());
folderInput.addEventListener('change', async (e) => {
    // 파일이 하나도 선택되지 않았을 때
    if (e.target.files.length === 0) {
        zipName.textContent = '⚠️ 파일을 선택하지 않았습니다. 폴더 안의 모든 파일을 선택해주세요.';
        zipName.classList.add('error');
        return;
    }

    if (e.target.files.length > 0) {
        const files = Array.from(e.target.files);
        recordDiagnosticInput(files, 'folderInput');
        setDiagnosticStage('folderInput-selected');
        zipName.textContent = `${files.length}개 파일 선택됨`;
        folderBtn.disabled = true;
        zipBtn.disabled = true;
        step1.classList.add('processing');
        progressContainer.classList.add('active');

        try {
            // 교차 감지: 단일 .zip이면 ZIP 처리
            await processFilesOrFolder(files);
            zipName.textContent = `✓ ${files.length}개 파일 - 처리 완료!`;
            zipName.classList.remove('error');
            folderBtn.classList.add('selected');
            step1.classList.remove('processing');
            step1.classList.add('completed');
            startBtn.disabled = false;
            startBtn.style.display = 'inline-block';
        } catch (error) {
            captureDiagnosticError(error, {
                type: 'folder-processing',
                stage: diagnosticState.stage
            });
            zipName.textContent = `✗ 오류: ${error.message}`;
            zipName.classList.add('error');
            step1.classList.remove('processing');
            step1.classList.add('error');
            folderBtn.disabled = false;
            zipBtn.disabled = false;
        }
    }
});

// ========== ZIP 파일 처리 (IndexedDB 캐싱 통합) ==========
async function processZipFile(file) {
    const startTime = performance.now();
    setDiagnosticStage('zip-processing-start');
    resetDiagnosticProcessing('zip');
    updateDiagnosticProcessing({
        zipFile: buildDiagnosticFileInfo(file)
    });
    console.log('⏱️ ZIP 처리 시작');
    resetRuntimeAttachmentState();

    // === 캐시 확인 ===
    const cacheKey = generateCacheKey(file.name, file.size, file.lastModified);

    updateProgress(3, '캐시 확인 중...');
    const cachedData = await getCache(cacheKey);

    if (cachedData) {
        // 캐시 히트 - 상태 복원
        updateProgress(50, '캐시에서 데이터 로드 중...');

        restoreCachedChatData(cachedData);
        attachmentEntries = cachedData.attachmentEntries || {};

        // ZIP 인스턴스는 다시 로드 필요
        updateProgress(70, 'ZIP 파일 연결 중...');
        const zip = await JSZip.loadAsync(file);
        zipInstance = zip;

        updateProgress(100, '완료! (캐시 사용)');
        console.log(`⏱️ 총 처리 시간 (캐시): ${(performance.now() - startTime).toFixed(0)}ms`);

        // 백그라운드에서 오래된 캐시 정리
        cleanOldCache();

        return;
    }

    // === 캐시 미스 - 기존 로직 실행 ===
    updateProgress(5, 'ZIP 파일 읽는 중...');

    const zip = await JSZip.loadAsync(file);
    zipInstance = zip;  // 지연 로딩용으로 저장
    const entries = Object.keys(zip.files);
    updateDiagnosticProcessing({
        zipEntryCount: entries.length,
        zipEntries: entries
            .filter(name => !zip.files[name].dir)
            .slice(0, DIAGNOSTIC_ZIP_ENTRY_SAMPLE_LIMIT)
            .map(name => buildDiagnosticZipEntryInfo(name, zip.files[name])),
        omittedZipEntryCount: Math.max(0, entries.filter(name => !zip.files[name].dir).length - DIAGNOSTIC_ZIP_ENTRY_SAMPLE_LIMIT)
    });

    updateProgress(10, `${entries.length}개 파일 발견`);

    // 대화 파일 찾기 (모든 .txt/.csv 파일 검증)
    const allChatFiles = entries.filter(name =>
        name.match(CHAT_FILE_PATTERN) && !zip.files[name].dir
    );
    updateDiagnosticProcessing({
        chatCandidateCount: allChatFiles.length
    });

    if (allChatFiles.length === 0) {
        throw new Error(`대화 파일(.txt/.csv)을 찾을 수 없습니다. ZIP 내부 파일 ${entries.length}개 중 TXT/CSV 후보가 없습니다.`);
    }

    updateProgress(15, `${allChatFiles.length}개 대화 파일 검증 중...`);

    // 각 대화 파일 읽고 검증
    const validChatFiles = [];
    for (const chatFile of allChatFiles) {
        const content = await zip.files[chatFile].async('string');
        const validation = analyzeChatFileContent(content);
        logChatValidationAnalysis(validation, content);
        recordDiagnosticChatCandidate(buildDiagnosticChatCandidate(chatFile.split('/').pop(), 'zip', validation, {
            size: getZipEntrySize(zip.files[chatFile]),
            entryPath: chatFile
        }));
        if (validation.valid) {
            validChatFiles.push({ name: chatFile, content });
        }
    }
    updateDiagnosticProcessing({
        validChatFileCount: validChatFiles.length
    });

    if (validChatFiles.length === 0) {
        throw new Error(`유효한 대화 파일을 찾을 수 없습니다. TXT/CSV 후보 ${allChatFiles.length}개를 검사했지만 지원 형식과 맞지 않았습니다.`);
    }

    console.log(`⏱️ ${validChatFiles.length}개 유효한 대화 파일 발견`);

    // 첨부파일 엔트리 매핑 (지연 로딩 - blob 생성 안 함)
    updateProgress(30, '첨부파일 목록 확인 중...');

    const attachEntryList = entries.filter(name => {
        if (zip.files[name].dir) return false;
        const filename = name.split('/').pop();
        return isAttachmentFile(filename);
    });
    updateDiagnosticProcessing({
        attachmentCandidateCount: attachEntryList.length,
        attachmentExtensions: summarizeAttachmentExtensions(attachEntryList.map(e => e.split('/').pop()))
    });

    // 파일명 -> ZIP 엔트리 경로 매핑
    for (const entry of attachEntryList) {
        const filename = entry.split('/').pop();
        attachmentEntries[filename] = entry;
    }
    console.log(`⏱️ 첨부파일 ${attachEntryList.length}개 발견 (지연 로딩 준비)`);

    // 플랫폼 감지 (대화 파일명 + 첨부파일명 기반)
    const attachFilenames = attachEntryList.map(e => e.split('/').pop());
    detectedPlatform = detectPlatform(allChatFiles, attachFilenames);
    updateDiagnosticProcessing({
        detectedPlatform
    });
    setDiagnosticStage(`platform-detected-${detectedPlatform}`);
    console.log(`플랫폼 감지: ${detectedPlatform}`);

    updateProgress(60, '대화 내용 파싱 중...');

    // 대화 파싱 (단일 또는 병합)
    if (validChatFiles.length === 1) {
        parseKakaoChat(validChatFiles[0].content);
    } else {
        const contents = validChatFiles.map(f => f.content);
        parseMergedChatFiles(contents);
        console.log(`⏱️ ${validChatFiles.length}개 파일 병합 완료, 총 ${messages.length}개 메시지`);
    }

    updateProgress(90, '첨부파일 매핑 중...');

    // 첨부파일 매핑
    mapAttachments();
    updateDiagnosticProcessing({
        parseResult: {
            messageCount: messages.length,
            dateCount: dates.length,
            attachmentMappedCount: messages.filter(msg => msg.attachment_path).length
        }
    });

    updateProgress(95, '캐시 저장 중...');

    // === 캐시 저장 ===
    await setCache(cacheKey, {
        messages: messages,
        messagesByDate: messagesByDate,
        leaderCountByDate: leaderCountByDate,
        dates: dates,
        attachmentEntries: attachmentEntries
    });

    updateProgress(100, '완료!');

    console.log(`⏱️ 총 처리 시간: ${(performance.now() - startTime).toFixed(0)}ms`);

    // 백그라운드에서 오래된 캐시 정리
    cleanOldCache();
}

// ========== 폴더 파일 처리 (IndexedDB 캐싱 통합) ==========
async function processFolderFiles(files) {
    const startTime = performance.now();
    setDiagnosticStage('folder-processing-start');
    resetDiagnosticProcessing('folder');
    console.log('⏱️ 폴더 처리 시작');
    resetRuntimeAttachmentState();

    updateProgress(5, '파일 분석 중...');

    // 대화 파일 찾기 (모든 .txt/.csv 파일 검증)
    const allChatFiles = files.filter(f => f.name.match(CHAT_FILE_PATTERN));
    updateDiagnosticProcessing({
        chatCandidateCount: allChatFiles.length
    });

    if (allChatFiles.length === 0) {
        throw new Error(`대화 파일(.txt/.csv)을 찾을 수 없습니다. 선택한 파일 ${files.length}개 중 TXT/CSV 후보가 없습니다.`);
    }

    updateProgress(7, `${allChatFiles.length}개 대화 파일 검증 중...`);

    // 각 대화 파일 읽고 검증
    const validChatFiles = [];
    for (const chatFile of allChatFiles) {
        const content = await chatFile.text();
        const validation = analyzeChatFileContent(content);
        logChatValidationAnalysis(validation, content);
        recordDiagnosticChatCandidate(buildDiagnosticChatCandidate(chatFile.name, 'folder', validation, {
            size: chatFile.size,
            entryPath: chatFile.webkitRelativePath || ''
        }));
        if (validation.valid) {
            validChatFiles.push({ file: chatFile, content });
        }
    }
    updateDiagnosticProcessing({
        validChatFileCount: validChatFiles.length
    });

    if (validChatFiles.length === 0) {
        throw new Error(`유효한 대화 파일을 찾을 수 없습니다. TXT/CSV 후보 ${allChatFiles.length}개를 검사했지만 지원 형식과 맞지 않았습니다.`);
    }

    console.log(`⏱️ ${validChatFiles.length}개 유효한 대화 파일 발견`);

    // 플랫폼 감지 (대화 파일명 + 첨부파일명 기반)
    const attachFilenames = files.filter(f => isAttachmentFile(f.name)).map(f => f.name);
    detectedPlatform = detectPlatform(allChatFiles.map(f => f.name), attachFilenames);
    updateDiagnosticProcessing({
        detectedPlatform,
        attachmentCandidateCount: attachFilenames.length,
        attachmentExtensions: summarizeAttachmentExtensions(attachFilenames)
    });
    setDiagnosticStage(`platform-detected-${detectedPlatform}`);
    console.log(`플랫폼 감지: ${detectedPlatform}`);

    // === 캐시 확인 (첫 번째 대화 파일 + 파일 개수 기준) ===
    const firstFile = validChatFiles[0].file;
    const cacheKey = generateCacheKey(
        `${firstFile.name}_count${validChatFiles.length}`,
        firstFile.size,
        firstFile.lastModified
    );

    updateProgress(7, '캐시 확인 중...');
    const cachedData = await getCache(cacheKey);

    if (cachedData) {
        // 캐시 히트 - 상태 복원
        updateProgress(30, '캐시에서 데이터 로드 중...');

        restoreCachedChatData(cachedData);

        // 첨부파일은 다시 로드 필요 (Blob URL은 캐시 불가)
        updateProgress(50, '첨부파일 로드 중...');

        const attachmentFiles_arr = files.filter(f => isAttachmentFile(f.name));

        let loadedCount = 0;
        for (let i = 0; i < attachmentFiles_arr.length; i++) {
            const file = attachmentFiles_arr[i];
            try {
                const blobUrl = URL.createObjectURL(file);
                attachmentFiles[file.name] = blobUrl;
                loadedCount++;
            } catch (err) {
                // 오류 무시
            }

            if (loadedCount % 10 === 0) {
                const pct = 50 + (loadedCount / attachmentFiles_arr.length) * 40;
                updateProgress(pct, `첨부파일 로드 중... (${loadedCount}/${attachmentFiles_arr.length})`);
            }
        }

        updateProgress(90, '첨부파일 매핑 중...');
        mapAttachments();

        updateProgress(100, '완료! (캐시 사용)');
        console.log(`⏱️ 총 처리 시간 (캐시): ${(performance.now() - startTime).toFixed(0)}ms`);

        cleanOldCache();
        return;
    }

    // === 캐시 미스 - 기존 로직 실행 ===
    updateProgress(10, `${files.length}개 파일 발견`);

    // 첨부파일 필터링
    const attachmentFiles_arr = files.filter(f => isAttachmentFile(f.name));

    updateProgress(30, '첨부파일 로드 중...');

    // 첨부파일 로드
    const attachStart = performance.now();
    let loadedCount = 0;
    for (const file of attachmentFiles_arr) {
        try {
            const blobUrl = URL.createObjectURL(file);
            attachmentFiles[file.name] = blobUrl;
            loadedCount++;
        } catch (err) {
            // 오류 무시
        }

        if (loadedCount % 10 === 0) {
            const pct = 30 + (loadedCount / attachmentFiles_arr.length) * 30;
            updateProgress(pct, `첨부파일 로드 중... (${loadedCount}/${attachmentFiles_arr.length})`);
        }
    }
    console.log(`⏱️ 첨부파일 ${attachmentFiles_arr.length}개 로드: ${(performance.now() - attachStart).toFixed(0)}ms`);

    updateProgress(60, '대화 내용 파싱 중...');

    // 대화 파싱 (단일 또는 병합)
    if (validChatFiles.length === 1) {
        parseKakaoChat(validChatFiles[0].content);
    } else {
        const contents = validChatFiles.map(f => f.content);
        parseMergedChatFiles(contents);
        console.log(`⏱️ ${validChatFiles.length}개 파일 병합 완료, 총 ${messages.length}개 메시지`);
    }

    updateProgress(90, '첨부파일 매핑 중...');

    // 첨부파일 매핑
    mapAttachments();
    updateDiagnosticProcessing({
        parseResult: {
            messageCount: messages.length,
            dateCount: dates.length,
            attachmentMappedCount: messages.filter(msg => msg.attachment_path).length
        }
    });

    updateProgress(95, '캐시 저장 중...');

    // === 캐시 저장 ===
    await setCache(cacheKey, {
        messages: messages,
        messagesByDate: messagesByDate,
        leaderCountByDate: leaderCountByDate,
        dates: dates
    });

    updateProgress(100, '완료!');

    console.log(`⏱️ 총 처리 시간: ${(performance.now() - startTime).toFixed(0)}ms`);

    cleanOldCache();
}

function parseCsvRecords(content, maxRecords = Infinity) {
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

function normalizeCsvHeaderCell(value) {
    return String(value || '').replace(/^\uFEFF/, '').trim();
}

function isMacOSCsvHeader(row) {
    if (!row || row.length < 3) return false;
    return normalizeCsvHeaderCell(row[0]) === 'Date' &&
        normalizeCsvHeaderCell(row[1]) === 'User' &&
        normalizeCsvHeaderCell(row[2]) === 'Message';
}

function isMacOSCsvContent(content) {
    return isMacOSCsvHeader(parseCsvRecords(content, 1)[0]);
}

function parseMacOSDateTime(value) {
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

function isMacOSSystemMessage(content) {
    const stripped = String(content || '').trim();
    return stripped === DELETED_MESSAGE ||
        stripped === '관리자가 메시지를 가렸습니다.' ||
        /^.+?님이 (?:들어왔습니다|나갔습니다)\.$/.test(stripped);
}

function validateMacOSCsvFile(content) {
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

function addMessageToCollections(msg) {
    messages.push(msg);

    if (!messagesByDate[msg.date]) {
        messagesByDate[msg.date] = [];
        leaderCountByDate[msg.date] = 0;
    }
    messagesByDate[msg.date].push(msg);

    if (isLeader(msg.user)) {
        leaderCountByDate[msg.date]++;
    }
}

function analyzeChatFileContent(content) {
    const lines = content.split('\n');
    const analysis = {
        valid: false,
        format: 'unknown',
        reason: '',
        lineCount: lines.length,
        checkedLines: Math.min(lines.length, 100),
        hasBom: content.charCodeAt(0) === 0xFEFF,
        hasMacOSCsvHeader: false,
        hasValidMacOSCsv: false,
        hasDateHeader: false,
        hasMessage: false,
        hasAndroidMessage: false,
        hasWindowsDateHeader: false,
        hasWindowsMessage: false,
        sampleLines: getDiagnosticTextSampleLines(content)
    };

    const csvHeader = parseCsvRecords(content, 1)[0];
    analysis.hasMacOSCsvHeader = isMacOSCsvHeader(csvHeader);
    analysis.hasValidMacOSCsv = analysis.hasMacOSCsvHeader && validateMacOSCsvFile(content);

    if (analysis.hasValidMacOSCsv) {
        analysis.valid = true;
        analysis.format = 'macos-csv';
        analysis.reason = 'Date,User,Message 헤더와 유효한 날짜/사용자 행을 찾았습니다.';
        return analysis;
    }

    // 최소 20줄 이상이어야 함
    if (lines.length < 20) {
        analysis.reason = `20줄 미만입니다. 실제 ${lines.length}줄입니다.`;
        return analysis;
    }

    // 처음 100줄만 검사 (성능 최적화)
    for (let i = 0; i < analysis.checkedLines; i++) {
        const line = lines[i].trim();

        // 날짜 헤더 체크 (iOS 전용) - 배열의 모든 패턴 시도
        if (testPatternArray(line, PATTERNS.DATE_HEADER)) {
            analysis.hasDateHeader = true;
        }

        // Windows 날짜 헤더 체크
        if (testPatternArray(line, PATTERNS.DATE_HEADER_WINDOWS)) {
            analysis.hasWindowsDateHeader = true;
        }

        // 메시지 패턴 체크 (iOS 또는 Android) - 배열의 모든 패턴 시도
        if (testPatternArray(line, PATTERNS.MESSAGE_IOS)) {
            analysis.hasMessage = true;
        }
        if (testPatternArray(line, PATTERNS.MESSAGE_ANDROID)) {
            analysis.hasAndroidMessage = true;
        }
        if (testPatternArray(line, PATTERNS.MESSAGE_WINDOWS)) {
            analysis.hasWindowsMessage = true;
        }

        // Android: 메시지만 있어도 유효 (날짜 헤더 없음)
        if (analysis.hasAndroidMessage) {
            analysis.valid = true;
            analysis.format = 'android-txt';
            analysis.reason = 'Android 메시지 패턴을 찾았습니다.';
            return analysis;
        }

        // iOS: 날짜 헤더 + 메시지 둘 다 발견되면 유효한 파일
        if (analysis.hasDateHeader && analysis.hasMessage) {
            analysis.valid = true;
            analysis.format = 'ios-txt';
            analysis.reason = 'iOS 날짜 헤더와 메시지 패턴을 찾았습니다.';
            return analysis;
        }

        // Windows: 날짜 헤더 + 메시지 둘 다 발견되면 유효한 파일
        if (analysis.hasWindowsDateHeader && analysis.hasWindowsMessage) {
            analysis.valid = true;
            analysis.format = 'windows-txt';
            analysis.reason = 'Windows 날짜 헤더와 메시지 패턴을 찾았습니다.';
            return analysis;
        }
    }

    analysis.reason = `처음 ${analysis.checkedLines}줄에서 지원 형식의 날짜/메시지 패턴을 찾지 못했습니다.`;
    return analysis;
}

function logChatValidationAnalysis(analysis, content) {
    if (analysis.valid) {
        console.log(`✅ 유효한 ${analysis.format} 대화 파일로 확인됨`);
        return;
    }

    if (analysis.lineCount < 20) {
        console.log('⚠️ 파일 검증 실패: 20줄 미만 (실제: ' + analysis.lineCount + '줄)');
        return;
    }

    const lines = content.split('\n');
    // 디버그: 파일의 처음 5줄 출력
    console.log('⚠️ 파일 검증 실패 - 처음 5줄:');
    for (let i = 0; i < Math.min(5, lines.length); i++) {
        console.log(`  줄 ${i + 1}: ${lines[i]}`);
    }
    console.log(`hasDateHeader: ${analysis.hasDateHeader}, hasMessage: ${analysis.hasMessage}, hasAndroidMessage: ${analysis.hasAndroidMessage}, hasWindowsDateHeader: ${analysis.hasWindowsDateHeader}, hasWindowsMessage: ${analysis.hasWindowsMessage}`);
}

// ========== 대화 파일 검증 (카카오톡 패턴 확인) ==========
function validateChatFile(content) {
    const analysis = analyzeChatFileContent(content);
    logChatValidationAnalysis(analysis, content);
    return analysis.valid;
}

function parseMacOSCsvChat(content) {
    const records = parseCsvRecords(content);
    messages = [];
    messagesByDate = {};
    leaderCountByDate = {};
    detectedPlatform = 'macos';

    if (!isMacOSCsvHeader(records[0])) {
        dates = [];
        return;
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

            addMessageToCollections(msg);
            lastMessage = msg;
        }
    }

    dates = sortDatesDescending(Object.keys(messagesByDate));
}

// ========== 카카오톡 대화 파싱 (정규식 최적화) ==========
function parseKakaoChat(content) {
    if (isMacOSCsvContent(content)) {
        parseMacOSCsvChat(content);
        return;
    }

    const lines = content.split('\n');
    messages = [];
    messagesByDate = {};
    leaderCountByDate = {};

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
            messages.push(msg);
            if (!messagesByDate[msg.date]) {
                messagesByDate[msg.date] = [];
                leaderCountByDate[msg.date] = 0;
            }
            messagesByDate[msg.date].push(msg);
            if (isLeader(msg.user)) leaderCountByDate[msg.date]++;
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
                const [, user, ampm, hour, minute, content] = windowsMatch;

                // 12시간 → 24시간 변환
                let h = parseInt(hour);
                if (ampm === '오후' && h !== 12) h += 12;
                if (ampm === '오전' && h === 12) h = 0;

                const dateStr = currentDate;
                const timeStr = `${h.toString().padStart(2, '0')}:${minute}`;
                const datetimeStr = `${dateStr} ${timeStr}`;

                // 메시지 타입 분류
                const { type, attachType, attachRef } = classifyContent(content);
                const hasLink = containsUrl(content);

                const isAttachment = ['photo', 'file', 'emoticon'].includes(type);

                // 연속 발화 병합 (첨부파일 제외)
                if (!isAttachment && lastMessage &&
                    lastMessage.user === user &&
                    lastMessage.date === dateStr &&
                    lastMessage.message_type === 'text') {
                    lastMessage.content += '\n' + content;
                    if (hasLink) lastMessage.has_link = true;
                } else {
                    const msg = {
                        datetime: datetimeStr,
                        date: dateStr,
                        time: timeStr,
                        user: user,
                        message_type: type,
                        content: content,
                        has_attachment: !!attachType,
                        attachment_type: attachType,
                        attachment_ref: attachRef,
                        attachment_path: '',
                        has_link: hasLink
                    };

                    messages.push(msg);

                    if (!messagesByDate[dateStr]) {
                        messagesByDate[dateStr] = [];
                        leaderCountByDate[dateStr] = 0;
                    }
                    messagesByDate[dateStr].push(msg);

                    // 필터 대상 사용자 메시지 카운트 (사전 계산)
                    if (isLeader(user)) {
                        leaderCountByDate[dateStr]++;
                    }

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
                let year, month, day, hour, minute, user, content;

                if (msgMatch) {
                    // iOS 패턴 구분: 24시간 vs 12시간 형식
                    if (msgMatch[4] === '오전' || msgMatch[4] === '오후') {
                        // 12시간 형식: year, month, day, ampm, hour, minute, second(선택적), user, content
                        const ampm = msgMatch[4];
                        [, year, month, day, , hour, minute, , user, content] = msgMatch;
                        // 24시간 형식으로 변환
                        let h = parseInt(hour);
                        if (ampm === '오후' && h !== 12) h += 12;
                        if (ampm === '오전' && h === 12) h = 0;
                        hour = h.toString();
                    } else {
                        // 24시간 형식: year, month, day, hour, minute, second(선택적), user, content
                        [, year, month, day, hour, minute, , user, content] = msgMatch;
                    }
                } else {
                    // Android 패턴 시도
                    msgMatch = execPatternArray(line, PATTERNS.MESSAGE_ANDROID);
                    if (msgMatch) {
                        [, year, month, day, , hour, minute, user, content] = msgMatch;
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
                    const { type, attachType, attachRef } = classifyContent(content);
                    const hasLink = containsUrl(content);

                    const isAttachment = ['photo', 'file', 'emoticon'].includes(type);

                    // 연속 발화 병합 (첨부파일 제외)
                    if (!isAttachment && lastMessage &&
                        lastMessage.user === user &&
                        lastMessage.date === dateStr &&
                        lastMessage.message_type === 'text') {
                        lastMessage.content += '\n' + content;
                        if (hasLink) lastMessage.has_link = true;
                    } else {
                        const msg = {
                            datetime: datetimeStr,
                            date: dateStr,
                            time: timeStr,
                            user: user,
                            message_type: type,
                            content: content,
                            has_attachment: !!attachType,
                            attachment_type: attachType,
                            attachment_ref: attachRef,
                            attachment_path: '',
                            has_link: hasLink
                        };

                        messages.push(msg);

                        if (!messagesByDate[dateStr]) {
                            messagesByDate[dateStr] = [];
                            leaderCountByDate[dateStr] = 0;
                        }
                        messagesByDate[dateStr].push(msg);

                        // 필터 대상 사용자 메시지 카운트 (사전 계산)
                        if (isLeader(user)) {
                            leaderCountByDate[dateStr]++;
                        }

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

    dates = sortDatesDescending(Object.keys(messagesByDate)); // 최신 날짜부터 표시 (내림차순)
}

// ========== 여러 대화 파일 병합 ==========
function parseMergedChatFiles(chatContents) {
    const allMessages = [];

    // 각 파일을 파싱하고 메시지 수집
    for (const content of chatContents) {
        parseKakaoChat(content);
        allMessages.push(...messages);
    }

    // 시간순으로 정렬
    allMessages.sort((a, b) => {
        const dtA = new Date(a.datetime);
        const dtB = new Date(b.datetime);
        return dtA - dtB;
    });

    // 전역 변수 재구성
    messages = allMessages;
    messagesByDate = {};
    leaderCountByDate = {};

    for (const msg of messages) {
        if (!messagesByDate[msg.date]) {
            messagesByDate[msg.date] = [];
            leaderCountByDate[msg.date] = 0;
        }
        messagesByDate[msg.date].push(msg);

        if (isLeader(msg.user)) {
            leaderCountByDate[msg.date]++;
        }
    }

    dates = sortDatesDescending(Object.keys(messagesByDate));
}

// ========== 메시지 내용 분류 ==========
function classifyContent(content) {
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

function decodeAttachmentName(filename) {
    try {
        return decodeURIComponent(filename);
    } catch (error) {
        return filename;
    }
}

function findAttachmentByReference(filenameSource, ref) {
    if (!ref) return '';

    const candidates = [ref, decodeAttachmentName(ref)];
    for (const candidate of candidates) {
        if (filenameSource[candidate]) {
            return candidate;
        }
    }

    const normalizedRef = decodeAttachmentName(ref);
    for (const filename of Object.keys(filenameSource)) {
        if (decodeAttachmentName(filename) === normalizedRef) {
            return filename;
        }
    }

    return '';
}

// ========== 첨부파일 지연 로딩 ==========
async function loadAttachment(filename) {
    // 이미 로드된 경우 캐시에서 반환
    if (attachmentFiles[filename]) {
        return attachmentFiles[filename];
    }

    // ZIP에서 지연 로딩
    const entryPath = attachmentEntries[filename];
    if (entryPath && zipInstance) {
        try {
            const blob = await zipInstance.files[entryPath].async('blob');
            const blobUrl = URL.createObjectURL(blob);
            attachmentFiles[filename] = blobUrl;  // 캐시
            return blobUrl;
        } catch (err) {
            console.error(`첨부파일 로드 실패: ${filename}`, err);
        }
    }

    return null;
}

// 첨부파일 로드 후 DOM 업데이트
async function loadAndRenderAttachment(elementId, filename, type, ref) {
    const url = await loadAttachment(filename);
    const el = document.getElementById(elementId);
    if (!el) return;

    if (url) {
        if (type === 'photo') {
            el.innerHTML = `<img src="${url}" onclick="showImage('${url}', this)" alt="사진">`;
        } else {
            el.innerHTML = `<a class="file-link" href="${url}" target="_blank" rel="noopener">📎 ${escapeHtml(ref || filename)}</a>`;
        }
    } else {
        if (type === 'photo') {
            el.className = 'attachment missing-attachment';
            el.innerHTML = renderMissingPhotoAttachmentContent('로드 실패');
        } else {
            el.innerHTML = `<span class="no-file">📎 ${escapeHtml(ref || '파일')} (로드 실패)</span>`;
        }
    }
}

// ========== IndexedDB 캐시 헬퍼 함수 ==========

// 캐시 키 생성
function generateCacheKey(fileName, fileSize, lastModified) {
    return `${fileName}_${fileSize}_${lastModified || 0}`;
}

function sortDatesDescending(dateKeys) {
    return [...new Set(dateKeys || [])].sort().reverse();
}

function restoreCachedChatData(cachedData) {
    messages = cachedData.messages || [];
    messagesByDate = cachedData.messagesByDate || {};

    const cachedDates = Array.isArray(cachedData.dates) && cachedData.dates.length > 0
        ? cachedData.dates
        : Object.keys(messagesByDate);
    dates = sortDatesDescending(cachedDates);
    recalculateLeaderCountByDate();
}

// 캐시 조회
async function getCache(cacheKey) {
    try {
        const db = await initDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([DB_CONFIG.storeName], 'readonly');
            const store = transaction.objectStore(DB_CONFIG.storeName);
            const request = store.get(cacheKey);

            request.onsuccess = () => {
                const result = request.result;
                if (result) {
                    console.log(`✅ 캐시 HIT: ${cacheKey}`);
                    resolve(result.data);
                } else {
                    console.log(`❌ 캐시 MISS: ${cacheKey}`);
                    resolve(null);
                }
            };

            request.onerror = () => {
                console.warn('캐시 조회 실패:', request.error);
                resolve(null);
            };
        });
    } catch (error) {
        console.warn('IndexedDB 초기화 실패:', error);
        return null;
    }
}

// 캐시 저장
async function setCache(cacheKey, data) {
    try {
        const db = await initDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([DB_CONFIG.storeName], 'readwrite');
            const store = transaction.objectStore(DB_CONFIG.storeName);

            const cacheData = {
                cacheKey: cacheKey,
                timestamp: Date.now(),
                data: data
            };

            const request = store.put(cacheData);

            request.onsuccess = () => {
                console.log(`💾 캐시 저장 완료: ${cacheKey}`);
                resolve(true);
            };

            request.onerror = () => {
                console.warn('캐시 저장 실패:', request.error);
                resolve(false);
            };
        });
    } catch (error) {
        console.warn('캐시 저장 중 오류:', error);
        return false;
    }
}

// 오래된 캐시 정리 (30일 이상)
async function cleanOldCache() {
    try {
        const db = await initDB();
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

        return new Promise((resolve) => {
            const transaction = db.transaction([DB_CONFIG.storeName], 'readwrite');
            const store = transaction.objectStore(DB_CONFIG.storeName);
            const index = store.index('timestamp');
            const range = IDBKeyRange.upperBound(thirtyDaysAgo);

            const request = index.openCursor(range);
            let deletedCount = 0;

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    deletedCount++;
                    cursor.continue();
                } else {
                    if (deletedCount > 0) {
                        console.log(`🗑️ 오래된 캐시 ${deletedCount}개 삭제`);
                    }
                    resolve(deletedCount);
                }
            };

            request.onerror = () => resolve(0);
        });
    } catch (error) {
        return 0;
    }
}

// ========== 첨부파일 매핑 ==========
// 타임스탬프 기반 매칭 (±30분 허용)
function mapAttachments() {
    // ZIP인 경우 attachmentEntries 사용, 폴더인 경우 attachmentFiles 사용
    const filenameSource = Object.keys(attachmentEntries).length > 0
        ? attachmentEntries
        : attachmentFiles;

    let matchedCount = 0;

    if (detectedPlatform === 'android') {
        // Android: attachment_ref가 직접 파일명 → 직접 매핑
        for (const msg of messages) {
            if (msg.attachment_ref) {
                const matchedFilename = findAttachmentByReference(filenameSource, msg.attachment_ref);
                if (matchedFilename) {
                    msg.attachment_path = matchedFilename;
                    matchedCount++;
                }
            }
        }
    } else if (detectedPlatform === 'ios') {
        // iOS: 날짜 기반 탐색
        const attachmentList = Object.keys(filenameSource)
            .map(filename => parseAttachmentFilename(filename))
            .filter(x => x && x.datetime); // datetime이 있는 파일만 (iOS 패턴)

        // 시간순 정렬
        attachmentList.sort((a, b) => a.datetime - b.datetime);

        for (const msg of messages) {
            if (msg.message_type === 'photo') {
                const msgDt = parseDateTime(msg.datetime);
                const match = findClosestAttachment(attachmentList, msgDt, 'image', 30);
                if (match) {
                    msg.attachment_path = match.filename;
                    match.used = true;
                    matchedCount++;
                }
            } else if (msg.message_type === 'file' && msg.attachment_ref.toLowerCase().endsWith('.pdf')) {
                const msgDt = parseDateTime(msg.datetime);
                const match = findClosestAttachment(attachmentList, msgDt, 'pdf', 30);
                if (match) {
                    msg.attachment_path = match.filename;
                    match.used = true;
                    matchedCount++;
                }
            }
        }
    } else {
        // Windows/macOS 첨부파일 구조는 실제 export 규칙 확인 전까지 매핑하지 않는다.
    }

}

function parseDateTime(str) {
    const [date, time] = str.split(' ');
    const [y, m, d] = date.split('-').map(Number);
    const [h, min] = time.split(':').map(Number);
    return new Date(y, m - 1, d, h, min);
}

function findClosestAttachment(list, targetDt, type, toleranceMinutes) {
    const tolerance = toleranceMinutes * 60 * 1000;
    let bestMatch = null;
    let bestDiff = tolerance;

    for (const item of list) {
        if (item.used || item.type !== type) continue;

        const diff = Math.abs(item.datetime - targetDt);
        if (diff < bestDiff) {
            bestDiff = diff;
            bestMatch = item;
        }
    }

    return bestMatch;
}

// ========== 프로그레스 업데이트 ==========
function updateProgress(percent, text) {
    progressFill.style.width = `${percent}%`;
    progressText.textContent = text;
    diagnosticState.progress = {
        percent: Math.round(Number(percent) || 0),
        text: sanitizeDiagnosticText(text, 160)
    };
    setDiagnosticStage(text);
}

// ========== 시작 버튼 ==========
startBtn.addEventListener('click', () => {
    setupScreen.style.display = 'none';
    app.classList.add('active');
    initApp();
    requestAnimationFrame(() => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    });
});

// ========== 앱 초기화 ==========
function initApp() {
    const users = new Set(messages.map(m => m.user));
    document.getElementById('stats').textContent =
        `${messages.length.toLocaleString()}개 메시지 · ${users.size}명 · ${dates.length}일`;
    if (captureBtn) {
        captureBtn.disabled = messages.length === 0;
    }

    if (dates.length > 0) {
        // 오늘 날짜와 가장 가까운 날짜로 달력 이동 (선택은 하지 않음)
        const today = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
        let closestDate = dates[0];
        let minDiff = Math.abs(new Date(today) - new Date(dates[0]));

        for (let i = 1; i < dates.length; i++) {
            const diff = Math.abs(new Date(today) - new Date(dates[i]));
            if (diff < minDiff) {
                minDiff = diff;
                closestDate = dates[i];
            }
        }

        // 달력을 해당 날짜의 월로 이동 (브라우저 호환성을 위해 수동 파싱)
        const [year, month, day] = closestDate.split('-').map(Number);
        currentMonth = new Date(year, month - 1, 1);
        renderCalendar();
        renderDateList();

        // 날짜 목록도 해당 날짜로 스크롤 (선택은 하지 않음)
        scrollToDateInList(closestDate);
    } else {
        renderCalendar();
        renderDateList();
    }

    document.getElementById('prevMonth').addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() - 1);
        renderCalendar();
        focusDateForMonth(currentMonth.getFullYear(), currentMonth.getMonth());
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        renderCalendar();
        focusDateForMonth(currentMonth.getFullYear(), currentMonth.getMonth());
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
        renderDateList(e.target.value.toLowerCase());
    });

    document.getElementById('modalClose').addEventListener('click', () => {
        closeImageModal();
    });

    document.getElementById('imageModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            closeImageModal();
        }
    });
}

// ========== 캘린더 렌더링 ==========
function renderCalendar() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    document.getElementById('monthYear').textContent = `${year}년 ${month + 1}월`;

    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';

    ['일', '월', '화', '수', '목', '금', '토'].forEach(day => {
        const el = document.createElement('div');
        el.className = 'weekday';
        el.textContent = day;
        grid.appendChild(el);
    });

    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const prevLastDate = new Date(year, month, 0).getDate();

    for (let i = firstDay - 1; i >= 0; i--) {
        const el = document.createElement('div');
        el.className = 'day other-month';
        el.textContent = prevLastDate - i;
        grid.appendChild(el);
    }

    for (let i = 1; i <= lastDate; i++) {
        const el = document.createElement('div');
        el.className = 'day';
        el.textContent = i;

        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;

        if (messagesByDate[dateStr]) {
            el.classList.add('has-messages');
            el.addEventListener('click', () => selectDate(dateStr));
        }

        if (dateStr === selectedDate) {
            el.classList.add('selected');
        }

        grid.appendChild(el);
    }

    const totalCells = firstDay + lastDate;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remaining; i++) {
        const el = document.createElement('div');
        el.className = 'day other-month';
        el.textContent = i;
        grid.appendChild(el);
    }
}

// ========== 날짜 목록 렌더링 ==========
function renderDateList(searchQuery = '') {
    const list = document.getElementById('dateList');
    list.innerHTML = '';

    let filteredDates = dates;

    if (searchQuery) {
        filteredDates = dates.filter(date => {
            return messagesByDate[date].some(msg =>
                msg.content.toLowerCase().includes(searchQuery) ||
                msg.user.toLowerCase().includes(searchQuery)
            );
        });
    }

    filteredDates.forEach(date => {
        const msgs = messagesByDate[date];
        const el = document.createElement('div');
        el.className = 'date-item';
        if (date === selectedDate) el.classList.add('selected');

        const dateObj = new Date(date);
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        const displayDate = `${dateObj.getFullYear()}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')} (${dayNames[dateObj.getDay()]})`;

        const leaderCount = leaderCountByDate[date] || 0;
        const leaderRatio = Math.round((leaderCount / msgs.length) * 100);

        el.innerHTML = `
            <span class="date">${displayDate}</span>
            <span>
                <span class="leader-ratio">${leaderRatio}%</span>
                <span class="count">${msgs.length}개</span>
            </span>
        `;

        el.addEventListener('click', () => selectDate(date));
        list.appendChild(el);
    });
}

// ========== 날짜 선택 ==========
function selectDate(date) {
    selectedDate = date;

    const dateObj = new Date(date);
    if (dateObj.getMonth() !== currentMonth.getMonth() ||
        dateObj.getFullYear() !== currentMonth.getFullYear()) {
        currentMonth = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
    }
    renderCalendar();
    renderDateList(document.getElementById('searchInput').value);
    renderChat(date);
    closeSidebarIfMobile();

    // 날짜 목록에서 선택된 날짜로 스크롤
    scrollToDateInList(date);
}

// ========== 월 변경 시 날짜 목록 포커스 ==========
function focusDateForMonth(year, month) {
    // 해당 년/월의 첫 날짜를 "YYYY-MM-01" 형식으로 생성
    const targetYearMonth = `${year}-${String(month + 1).padStart(2, '0')}`;

    // dates 배열에서 해당 년/월로 시작하는 첫 번째 날짜 찾기
    let targetDate = dates.find(date => date.startsWith(targetYearMonth));

    // 해당 월에 날짜가 없으면, 그 이후 가장 빠른 날짜 찾기
    if (!targetDate) {
        targetDate = dates.find(date => date > targetYearMonth);
    }

    // 찾은 날짜가 있으면 스크롤
    if (targetDate) {
        scrollToDateInList(targetDate);
    }
}

function scrollToDateInList(date) {
    requestAnimationFrame(() => {
        const dateList = document.getElementById('dateList');
        const dateItems = Array.from(dateList.querySelectorAll('.date-item'));
        const targetIndex = dates.indexOf(date);

        if (targetIndex !== -1 && dateItems[targetIndex]) {
            const targetElement = dateItems[targetIndex];

            // scrollIntoView로 스크롤 (instant로 성능 개선)
            targetElement.scrollIntoView({
                behavior: 'auto',
                block: 'start',
                inline: 'nearest'
            });

            // 0.5초간 하이라이트 효과
            targetElement.style.transition = 'background-color 0.3s';
            const originalBg = targetElement.style.backgroundColor;
            targetElement.style.backgroundColor = 'var(--bg-tertiary)';
            setTimeout(() => {
                targetElement.style.backgroundColor = originalBg;
            }, 500);
        }
    });
}

// ========== 필터 대상 사용자 판별 ==========
function isLeader(username) {
    return username === leaderFilterTarget;
}

function renderMissingPhotoAttachmentContent(reason) {
    const helpText = '카카오톡 원본 대화에서 해당 사진을 한 번 열어 기기에 내려받은 뒤, 첨부파일을 포함해 다시 내보내면 표시될 수 있습니다.';
    return `
        <span class="no-file">📷 사진 (${reason})</span>
        <span class="missing-attachment-tooltip" role="tooltip">${helpText}</span>
        <details class="missing-attachment-help">
            <summary>도움말</summary>
            <p>${helpText}</p>
        </details>
    `;
}

function renderMissingPhotoAttachment(reason) {
    return `<div class="attachment missing-attachment">${renderMissingPhotoAttachmentContent(reason)}</div>`;
}

// ========== 대화 렌더링 ==========
function renderChat(date) {
    const msgs = messagesByDate[date];

    const dateObj = new Date(date);
    const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

    document.getElementById('chatTitle').textContent =
        `${dateObj.getFullYear()}년 ${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일 ${dayNames[dateObj.getDay()]}`;

    const users = new Set(msgs.map(m => m.user));
    const photos = msgs.filter(m => m.message_type === 'photo').length;
    const leaderMsgs = msgs.filter(m => isLeader(m.user)).length;
    document.getElementById('chatInfo').textContent =
        `${msgs.length}개 메시지 · ${users.size}명 참여` +
        (leaderMsgs > 0 ? ` · 필터 ${leaderMsgs}개` : '') +
        (photos > 0 ? ` · 사진 ${photos}장` : '');

    const container = document.getElementById('chatMessages');
    container.innerHTML = '';

    const leaderPositions = [];

    msgs.forEach((msg, index) => {
        const el = document.createElement('div');
        el.className = 'message';
        el.dataset.index = index;

        if (isLeader(msg.user)) {
            el.classList.add('leader');
            leaderPositions.push({ index, ratio: index / msgs.length });
        }

        let contentHtml = escapeHtml(msg.content);
        contentHtml = contentHtml.replace(
            /(https?:\/\/[^\s]+)/g,
            '<a href="$1" target="_blank" rel="noopener">$1</a>'
        );

        let attachmentHtml = '';
        const attachId = `attach-${index}`;

        if (msg.message_type === 'photo') {
            if (msg.attachment_path && attachmentFiles[msg.attachment_path]) {
                // 이미 로드됨 (캐시)
                const url = attachmentFiles[msg.attachment_path];
                attachmentHtml = `
                    <div class="attachment">
                        <img src="${url}" onclick="showImage('${url}', this)" alt="사진">
                    </div>
                `;
            } else if (msg.attachment_path && attachmentEntries[msg.attachment_path]) {
                // 지연 로딩 필요
                attachmentHtml = `
                    <div class="attachment" id="${attachId}">
                        <div class="loading-placeholder">📷 로딩 중...</div>
                    </div>
                `;
                // 비동기 로드
                setTimeout(() => loadAndRenderAttachment(attachId, msg.attachment_path, 'photo'), 0);
            } else {
                attachmentHtml = renderMissingPhotoAttachment('파일 없음');
            }
        } else if (msg.message_type === 'file') {
            if (msg.attachment_path && attachmentFiles[msg.attachment_path]) {
                const url = attachmentFiles[msg.attachment_path];
                attachmentHtml = `
                    <div class="attachment">
                        <a class="file-link" href="${url}" target="_blank" rel="noopener">
                            📎 ${escapeHtml(msg.attachment_ref || msg.attachment_path)}
                        </a>
                    </div>
                `;
            } else if (msg.attachment_path && attachmentEntries[msg.attachment_path]) {
                attachmentHtml = `
                    <div class="attachment" id="${attachId}">
                        <div class="loading-placeholder">📎 로딩 중...</div>
                    </div>
                `;
                setTimeout(() => loadAndRenderAttachment(attachId, msg.attachment_path, 'file', msg.attachment_ref), 0);
            } else {
                attachmentHtml = `<div class="attachment"><span class="no-file">📎 ${escapeHtml(msg.attachment_ref || '파일')} (파일 없음)</span></div>`;
            }
        } else if (msg.message_type === 'emoticon') {
            attachmentHtml = `<div class="attachment"><span class="emoticon">😊 이모티콘</span></div>`;
        }

        const userName = isLeader(msg.user)
            ? `👑 ${escapeHtml(msg.user)}`
            : escapeHtml(msg.user);

        el.innerHTML = `
            <div class="user-name desktop-only">${userName}</div>
            <div class="message-bubble">
                <div class="user-name mobile-only">${userName}</div>
                <div class="content">${contentHtml}</div>
                ${attachmentHtml}
                <div class="time">${msg.time}</div>
            </div>
        `;

        container.appendChild(el);
    });

    container.scrollTop = 0;
    renderScrollMarkers(leaderPositions);

    // 사용자 필터가 활성화되어 있으면 적용
    if (leaderFilterActive) {
        applyLeaderFilter();
    }
}

// ========== 스크롤 마커 렌더링 ==========
function renderScrollMarkers(positions) {
    const markersContainer = document.getElementById('scrollMarkers');
    markersContainer.innerHTML = '';

    const container = document.getElementById('chatMessages');

    positions.forEach(item => {
        const marker = document.createElement('div');
        marker.className = 'scroll-marker';
        marker.style.top = `${item.ratio * 100}%`;

        marker.addEventListener('click', () => {
            const targetEl = container.querySelector(`[data-index="${item.index}"]`);
            if (targetEl) {
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });

        markersContainer.appendChild(marker);
    });
}

// ========== 유틸리티 ==========
function showImage(url, triggerElement = null) {
    rememberModalTrigger();
    const fromRect = pointGhostRectFromElement(triggerElement || lastModalTrigger);
    document.getElementById('modalImage').src = url;
    const modal = document.getElementById('imageModal');
    modal.classList.remove('closing', 'win31-window-hidden');
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');

    const focusClose = () => document.getElementById('modalClose').focus();
    if (!is1995ThemeActive()) {
        focusClose();
        return;
    }

    modal.classList.add('win31-window-hidden');
    play1995GhostBox(fromRect, elementGhostRect(document.getElementById('modalImage')), () => {
        modal.classList.remove('win31-window-hidden');
        if (modal.classList.contains('active') && !modal.classList.contains('closing')) {
            focusClose();
        }
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function isMobileView() {
    return window.matchMedia('(max-width: 900px)').matches;
}

function setPanelOverlayActive(active) {
    sidebarOverlay.classList.toggle('active', active);
}

function hasOpenMobilePanel() {
    return sidebar.classList.contains('open') || linkSidebar.classList.contains('open');
}

function openSidebar() {
    if (isMobileView()) {
        closeLinkSidebar(false);
    }

    const fromRect = pointGhostRectFromElement(sidebarToggle);
    sidebar.classList.add('open');
    setPanelOverlayActive(true);
    app.classList.add('sidebar-open');
    updateSidebarToggle();
    animate1995Panel(sidebar, 'panel-opening', fromRect, elementGhostRect(sidebar));

    // 모바일에서만 백그라운드 스크롤 차단
    if (isMobileView()) {
        document.body.style.overflow = 'hidden';
    }
}

function closeSidebar(updateOverlay = true) {
    const fromRect = elementGhostRect(sidebar);
    const toRect = pointGhostRectFromElement(sidebarToggle);

    if (sidebar.classList.contains('open')) {
        animate1995Panel(sidebar, 'panel-closing', fromRect, toRect);
    }
    sidebar.classList.remove('open');
    app.classList.remove('sidebar-open');
    updateSidebarToggle();

    if (updateOverlay) {
        setPanelOverlayActive(hasOpenMobilePanel());
        if (!hasOpenMobilePanel()) {
            document.body.style.overflow = '';
        }
    }
}

function openLinkSidebar() {
    if (isMobileView()) {
        closeSidebar(false);
    }

    const fromRect = pointGhostRectFromElement(linkSidebarToggle);
    linkSidebar.classList.add('open');
    setPanelOverlayActive(true);
    app.classList.add('link-sidebar-open');
    updateLinkSidebarToggle();
    animate1995Panel(linkSidebar, 'panel-opening', fromRect, elementGhostRect(linkSidebar));

    if (isMobileView()) {
        document.body.style.overflow = 'hidden';
    }
}

function closeLinkSidebar(updateOverlay = true) {
    const fromRect = elementGhostRect(linkSidebar);
    const toRect = pointGhostRectFromElement(linkSidebarToggle);

    if (linkSidebar.classList.contains('open')) {
        animate1995Panel(linkSidebar, 'panel-closing', fromRect, toRect);
    }
    linkSidebar.classList.remove('open');
    app.classList.remove('link-sidebar-open');
    updateLinkSidebarToggle();

    if (updateOverlay) {
        setPanelOverlayActive(hasOpenMobilePanel());
        if (!hasOpenMobilePanel()) {
            document.body.style.overflow = '';
        }
    }
}

function closeMobilePanels() {
    closeSidebar(false);
    closeLinkSidebar(false);
    setPanelOverlayActive(false);
    document.body.style.overflow = '';
}

function closeSidebarIfMobile() {
    if (isMobileView()) {
        closeMobilePanels();
    }
}

function updateSidebarToggle() {
    if (sidebar.classList.contains('open')) {
        sidebarToggle.textContent = '<';
        sidebarToggle.setAttribute('aria-label', '날짜 패널 접기');
    } else {
        sidebarToggle.textContent = '>';
        sidebarToggle.setAttribute('aria-label', '날짜 패널 열기');
    }
}

function updateLinkSidebarToggle() {
    if (linkSidebar.classList.contains('open')) {
        linkSidebarToggle.textContent = '>';
        linkSidebarToggle.setAttribute('aria-label', '링크 패널 접기');
    } else {
        linkSidebarToggle.textContent = '<';
        linkSidebarToggle.setAttribute('aria-label', '링크 패널 열기');
    }
}

sidebarToggle.addEventListener('click', () => {
    if (sidebar.classList.contains('open')) {
        closeSidebar();
    } else {
        openSidebar();
    }
});

linkSidebarToggle.addEventListener('click', () => {
    if (linkSidebar.classList.contains('open')) {
        closeLinkSidebar();
    } else {
        openLinkSidebar();
    }
});

sidebarOverlay.addEventListener('click', closeMobilePanels);

window.addEventListener('resize', () => {
    if (!isMobileView()) {
        closeMobilePanels();
    }
});

updateSidebarToggle();
updateLinkSidebarToggle();

function buildParserTestSnapshot() {
    const typeCounts = {};
    for (const msg of messages) {
        typeCounts[msg.message_type] = (typeCounts[msg.message_type] || 0) + 1;
    }

    return {
        detectedPlatform,
        messageCount: messages.length,
        dateCount: dates.length,
        dates: [...dates],
        typeCounts,
        attachmentRefCount: messages.filter(msg => msg.has_attachment).length,
        attachmentMappedCount: messages.filter(msg => !!msg.attachment_path).length,
        leaderFilterTarget,
        leaderCountByDate: { ...leaderCountByDate },
        messages: messages.map(msg => ({ ...msg }))
    };
}

function buildRenderedChatTestSnapshot(date) {
    renderChat(date);
    const container = document.getElementById('chatMessages');
    return {
        date,
        messageCount: container.children.length,
        messagesHtml: Array.from(container.children).map(child => child.innerHTML)
    };
}

function buildUiTestSnapshot() {
    const renderedMessages = Array.from(document.getElementById('chatMessages').children).filter(child =>
        hasClass(child, 'message')
    );

    return {
        stats: document.getElementById('stats').textContent,
        selectedDate,
        currentMonth: `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`,
        dateListCount: document.getElementById('dateList').children.length,
        calendarCellCount: document.getElementById('calendarGrid').children.length,
        chatMessageCount: document.getElementById('chatMessages').children.length,
        leaderMessageCount: renderedMessages.filter(child => hasClass(child, 'leader')).length,
        hiddenChatMessageCount: renderedMessages.filter(child => child.style.display === 'none').length,
        chatTitle: document.getElementById('chatTitle').textContent,
        chatInfo: document.getElementById('chatInfo').textContent,
        captureButtonDisabled: captureBtn ? captureBtn.disabled : null,
        captureModalOpen: isModalOpen('captureModal'),
        leaderFilterActive,
        leaderFilterTarget,
        leaderFilterPanelOpen: leaderFilterPanel ? !leaderFilterPanel.hidden : false,
        settingsModalOpen: isModalOpen('settingsModal'),
        sidebarOpen: sidebar.classList.contains('open'),
        linkSidebarOpen: linkSidebar.classList.contains('open'),
        sidebarOverlayActive: sidebarOverlay.classList.contains('active'),
        linkCount: document.querySelectorAll('.link-sidebar .link-item').length,
        theme: document.documentElement.getAttribute('data-theme'),
        font: document.documentElement.getAttribute('data-font') || 'default',
        storedTheme: localStorage.getItem('theme'),
        storedFont: localStorage.getItem('font')
    };
}

if (window.__CHAEXTRACTOR_ENABLE_TEST_API__) {
    window.__CHAEXTRACTOR_TEST__ = {
        parseChat(content, options = {}) {
            detectedPlatform = options.platform || detectedPlatform;
            attachmentEntries = {};
            attachmentFiles = {};
            zipInstance = null;

            if (options.attachments) {
                for (const filename of options.attachments) {
                    const base = filename.split('/').pop();
                    attachmentEntries[base] = filename;
                }
            }

            parseKakaoChat(content);
            if (options.mapAttachments) {
                mapAttachments();
            }

            return buildParserTestSnapshot();
        },
        parseMergedChatFiles(contents, options = {}) {
            detectedPlatform = options.platform || detectedPlatform;
            attachmentEntries = {};
            attachmentFiles = {};
            zipInstance = null;

            if (options.attachments) {
                for (const filename of options.attachments) {
                    const base = filename.split('/').pop();
                    attachmentEntries[base] = filename;
                }
            }

            parseMergedChatFiles(contents);
            if (options.mapAttachments) {
                mapAttachments();
            }

            return buildParserTestSnapshot();
        },
        classifyContent,
        getSnapshot: buildParserTestSnapshot,
        renderChat: buildRenderedChatTestSnapshot,
        getUiSnapshot: buildUiTestSnapshot,
        initApp,
        selectDate,
        renderDateList,
        setLeaderFilterForTest,
        applyTheme,
        applyFont,
        openSidebar,
        closeSidebar,
        openLinkSidebar,
        closeLinkSidebar,
        closeMobilePanels,
        applyBrowserCapabilityStatus,
        getBrowserCapabilityStatus,
        getCapabilitySnapshot: buildCapabilityTestSnapshot,
        setAttachmentFilesForTest,
        getCachePrivacySnapshot: buildCachePrivacyTestSnapshot,
        clearRuntimeAttachmentFiles,
        resetRuntimeAttachmentState,
        clearAllCache,
        openModal,
        closeActiveModal,
        handleModalKeydown,
        isModalOpen,
        showImage,
        restoreCachedChatData,
        recordDiagnosticInput,
        setDiagnosticStage,
        updateDiagnosticProcessing,
        recordDiagnosticChatCandidate,
        analyzeChatFileContent,
        buildDiagnosticChatCandidate,
        captureDiagnosticError,
        buildDiagnosticReport,
        buildDiagnosticIssueUrl,
        openDiagnosticReportModal,
        getDiagnosticSnapshot: buildDiagnosticTestSnapshot,
        openCaptureModal,
        updateCaptureText,
        buildCaptureText,
        getCaptureSnapshot: buildCaptureTestSnapshot
    };
}

window.showImage = showImage;
