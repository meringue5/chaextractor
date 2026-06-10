import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const appScriptPath = path.join(repoRoot, 'assets/scripts/app.js');
const chatDomainScriptPath = path.join(repoRoot, 'assets/scripts/chat-domain.js');
const chatCoreScriptPath = path.join(repoRoot, 'assets/scripts/chat-core.js');
const chatDomain = await import(pathToFileURL(chatDomainScriptPath));
const chatCore = await import(pathToFileURL(chatCoreScriptPath));
const appScript = fs.readFileSync(appScriptPath, 'utf8')
  .replace(
    /import\s+\{[\s\S]*?\}\s+from\s+['"]\.\/chat-domain\.js['"];\n/,
    `const {
    PATTERNS,
    classifyContent,
    detectPlatform,
    isAttachmentFile,
    isMacOSCsvHeader,
    parseAttachmentFilename,
    parseCsvRecords,
    testPatternArray,
    validateMacOSCsvFile
  } = __CHAEXTRACTOR_IMPORTS__.chatDomain;\n`
  )
  .replace(
    /import\s+\{[\s\S]*?\}\s+from\s+['"]\.\/chat-core\.js['"];\n\n/,
    `const {
    parseKakaoChat: parseKakaoChatCore,
    parseMergedChatFiles: parseMergedChatFilesCore,
    sortDatesDescending
  } = __CHAEXTRACTOR_IMPORTS__.chatCore;\n\n`
  );
const input = JSON.parse(fs.readFileSync(0, 'utf8'));

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function createClassList() {
  const values = new Set();
  return {
    add(...items) {
      for (const item of items) values.add(item);
    },
    remove(...items) {
      for (const item of items) values.delete(item);
    },
    toggle(item, force) {
      if (force === true) {
        values.add(item);
        return true;
      }
      if (force === false) {
        values.delete(item);
        return false;
      }
      if (values.has(item)) {
        values.delete(item);
        return false;
      }
      values.add(item);
      return true;
    },
    contains(item) {
      return values.has(item);
    }
  };
}

function createElement(tagName = 'div') {
  let text = '';
  let html = '';

  return {
    tagName: tagName.toUpperCase(),
    style: {},
    dataset: {},
    children: [],
    attributes: {},
    classList: createClassList(),
    disabled: false,
    hidden: false,
    value: '',
    files: [],
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    addEventListener() {},
    removeEventListener() {},
    click() {},
    focus() {
      documentActiveElement = this;
    },
    select() {},
    remove() {},
    scrollIntoView() {},
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    getAttribute(name) {
      return this.attributes[name] ?? null;
    },
    removeAttribute(name) {
      delete this.attributes[name];
    },
    get textContent() {
      return text;
    },
    set textContent(value) {
      text = String(value);
      html = escapeHtml(text);
    },
    get innerHTML() {
      return html;
    },
    set innerHTML(value) {
      html = String(value);
      if (html === '') {
        this.children = [];
      }
    }
  };
}

const elementsById = new Map();
const documentElement = createElement('html');
const body = createElement('body');
let documentActiveElement = body;
const documentListeners = new Map();

function getElementById(id) {
  if (!elementsById.has(id)) {
    const el = createElement('div');
    el.id = id;
    if (id === 'diagnosticToast') {
      el.hidden = true;
    }
    elementsById.set(id, el);
  }
  return elementsById.get(id);
}

const localStorageData = new Map();
const localStorage = {
  getItem(key) {
    return localStorageData.has(key) ? localStorageData.get(key) : null;
  },
  setItem(key, value) {
    localStorageData.set(key, String(value));
  },
  removeItem(key) {
    localStorageData.delete(key);
  }
};

function FakeFile() {}
function FakeBlob() {}
const revokedObjectUrls = [];
let mobileMatches = false;

function createSuccessRequest(resultValue) {
  const request = { result: resultValue };
  setTimeout(() => {
    if (request.onsuccess) {
      request.onsuccess({ target: { result: resultValue } });
    }
  }, 0);
  return request;
}

function createFakeIndexedDB() {
  const store = new Map();
  const db = {
    objectStoreNames: {
      contains() {
        return true;
      }
    },
    createObjectStore() {
      return this.transaction().objectStore();
    },
    transaction() {
      return {
        objectStore() {
          return {
            clear() {
              store.clear();
              return createSuccessRequest(undefined);
            },
            get(key) {
              return createSuccessRequest(store.get(key));
            },
            put(value) {
              store.set(value.cacheKey, value);
              return createSuccessRequest(undefined);
            },
            createIndex() {}
          };
        }
      };
    }
  };

  return {
    open() {
      return createSuccessRequest(db);
    }
  };
}

const windowObject = {
  __CHAEXTRACTOR_ENABLE_TEST_API__: true,
  File: FakeFile,
  Blob: FakeBlob,
  addEventListener() {},
  removeEventListener() {},
  scrollTo() {},
  matchMedia(query) {
    return {
      matches: mobileMatches && String(query).includes('max-width: 900px'),
      addEventListener() {},
      removeEventListener() {}
    };
  }
};

const fakeIndexedDB = createFakeIndexedDB();

const context = {
  __CHAEXTRACTOR_IMPORTS__: { chatDomain, chatCore },
  console: {
    log() {},
    warn() {},
    error() {}
  },
  document: {
    body,
    documentElement,
    createElement,
    getElementById,
    get activeElement() {
      return documentActiveElement;
    },
    addEventListener(type, handler) {
      if (!documentListeners.has(type)) {
        documentListeners.set(type, []);
      }
      documentListeners.get(type).push(handler);
    },
    removeEventListener(type, handler) {
      const handlers = documentListeners.get(type) || [];
      documentListeners.set(type, handlers.filter(item => item !== handler));
    },
    querySelector(selector) {
      if (selector === '.sidebar') return getElementById('sidebar');
      return createElement('div');
    },
    querySelectorAll() {
      return [];
    }
  },
  window: windowObject,
  File: FakeFile,
  Blob: FakeBlob,
  indexedDB: fakeIndexedDB,
  localStorage,
  performance: { now: () => 0 },
  URL: {
    createObjectURL: () => 'blob:test',
    revokeObjectURL(url) {
      revokedObjectUrls.push(url);
    }
  },
  setTimeout,
  clearTimeout,
  requestAnimationFrame(callback) {
    callback();
  }
};

context.globalThis = context;
windowObject.document = context.document;
windowObject.localStorage = localStorage;
windowObject.indexedDB = context.indexedDB;
windowObject.URL = context.URL;

vm.createContext(context);
vm.runInContext(appScript, context, { filename: 'assets/scripts/app.js' });

if (!windowObject.__CHAEXTRACTOR_TEST__) {
  throw new Error('assets/scripts/app.js did not expose __CHAEXTRACTOR_TEST__');
}

if (windowObject.__CHAEXTRACTOR_TEST__.contractVersion !== 1) {
  throw new Error('assets/scripts/app.js exposed an unsupported __CHAEXTRACTOR_TEST__ contractVersion');
}

if (input.mode === 'modalEscape') {
  const api = windowObject.__CHAEXTRACTOR_TEST__;
  const modalIds = ['settingsModal', 'captureModal', 'reportIssueModal'];
  const results = [];

  for (const modalId of modalIds) {
    let prevented = false;
    api.ui.modals.open(modalId);
    const before = api.ui.modals.isOpen(modalId);
    api.ui.modals.handleKeydown({
      key: 'Escape',
      preventDefault() {
        prevented = true;
      }
    });
    results.push({ modalId, before, after: api.ui.modals.isOpen(modalId), prevented });
  }

  let prevented = false;
  api.ui.modals.showImage('blob:test-image');
  const before = api.ui.modals.isOpen('imageModal');
  api.ui.modals.handleKeydown({
    key: 'Escape',
    preventDefault() {
      prevented = true;
    }
  });
  results.push({
    modalId: 'imageModal',
    before,
    after: api.ui.modals.isOpen('imageModal'),
    prevented
  });

  process.stdout.write(JSON.stringify({ results }, null, 2));
  process.exit(0);
}

if (input.mode === 'diagnosticReport') {
  const api = windowObject.__CHAEXTRACTOR_TEST__;
  const invalidChatContent = [
    'KakaoTalk Export',
    '채팅방 이름: 머니버스',
    '내보내기 시각: 2026-05-17',
    '이 줄은 지원하는 날짜/메시지 패턴이 아닙니다.',
    '사진',
    '오류 재현용 짧은 파일'
  ].join('\n');
  api.diagnostics.recordInput([
    { name: 'private-chat-name.txt', size: 2048 },
    { name: '20260517_120000.jpeg', size: 4096 }
  ], 'testInput');
  api.diagnostics.updateProcessing({
    route: 'folder',
    chatCandidateCount: 1,
    attachmentCandidateCount: 1,
    attachmentExtensions: ['jpeg:1']
  });
  api.diagnostics.recordChatCandidate(api.diagnostics.buildDiagnosticChatCandidate(
    'private-chat-name.txt',
    'testInput',
    api.diagnostics.analyzeChatFileContent(invalidChatContent),
    { size: 2048, entryPath: 'Talk/private-chat-name.txt' }
  ));
  api.diagnostics.setStage('test-processing');
  api.diagnostics.captureError(new Error('synthetic diagnostic failure in private-chat-name.txt'), {
    type: 'test-error',
    stage: 'test-processing',
    filename: 'http://127.0.0.1/assets/scripts/app.js',
    line: 123,
    column: 4
  });
  api.diagnostics.openReportModal();
  process.stdout.write(JSON.stringify(api.diagnostics.getSnapshot(), null, 2));
  process.exit(0);
}

if (input.mode === 'cacheDateSort') {
  const api = windowObject.__CHAEXTRACTOR_TEST__;
  api.runtime.restoreCachedChatData(input.cachedData || {});
  process.stdout.write(JSON.stringify(api.parser.getSnapshot(), null, 2));
  process.exit(0);
}

if (input.mode === 'uiSmoke') {
  const api = windowObject.__CHAEXTRACTOR_TEST__;
  const parseResult = api.parser.parseChat(input.content, {
    platform: input.platform,
    attachments: input.attachments || [],
    mapAttachments: true
  });

  api.ui.initApp();
  const afterInit = api.ui.getSnapshot();
  const beforeSelectCaptureAttempt = api.ui.capture.openModal();
  const afterCaptureBeforeSelect = api.ui.getSnapshot();

  api.ui.selectDate(input.selectDate || parseResult.dates[0]);
  const afterSelect = api.ui.getSnapshot();

  api.ui.capture.openModal();
  const afterCaptureModal = api.ui.capture.getSnapshot();

  api.ui.renderDateList(input.searchQuery || '');
  const afterSearch = api.ui.getSnapshot();

  api.ui.setLeaderFilterForTest(true, '테스터');
  const afterLeaderFilter = api.ui.getSnapshot();
  api.ui.capture.openModal();
  const afterFilteredCaptureModal = api.ui.capture.getSnapshot();

  api.ui.applyTheme('1995');
  const afterTheme1995 = api.ui.getSnapshot();

  api.ui.applyTheme('dark');
  api.ui.applyFont('ridi');
  const afterSettings = api.ui.getSnapshot();

  api.ui.modals.open('settingsModal');
  const afterSettingsModal = api.ui.getSnapshot();

  api.ui.navigation.openSidebar();
  const afterSidebarOpen = api.ui.getSnapshot();

  api.ui.navigation.closeSidebar();
  const afterSidebarClose = api.ui.getSnapshot();

  mobileMatches = true;
  api.ui.navigation.openSidebar();
  const afterMobileSidebarOpen = api.ui.getSnapshot();

  api.ui.navigation.openLinkSidebar();
  const afterMobileLinkSidebarOpen = api.ui.getSnapshot();

  api.ui.navigation.openSidebar();
  const afterMobileSidebarReopen = api.ui.getSnapshot();

  api.ui.navigation.closeMobilePanels();
  const afterMobilePanelsClose = api.ui.getSnapshot();

  process.stdout.write(JSON.stringify({
    parseResult,
    afterInit,
    beforeSelectCaptureAttempt,
    afterCaptureBeforeSelect,
    afterSelect,
    afterCaptureModal,
    afterSearch,
    afterLeaderFilter,
    afterFilteredCaptureModal,
    afterTheme1995,
    afterSettings,
    afterSettingsModal,
    afterSidebarOpen,
    afterSidebarClose,
    afterMobileSidebarOpen,
    afterMobileLinkSidebarOpen,
    afterMobileSidebarReopen,
    afterMobilePanelsClose
  }, null, 2));
  process.exit(0);
}

if (input.mode === 'capabilityNotice') {
  const api = windowObject.__CHAEXTRACTOR_TEST__;
  const result = api.runtime.applyBrowserCapabilityStatus(input.status);
  process.stdout.write(JSON.stringify({
    result,
    snapshot: api.runtime.getCapabilitySnapshot()
  }, null, 2));
  process.exit(0);
}

if (input.mode === 'cachePrivacy') {
  const api = windowObject.__CHAEXTRACTOR_TEST__;
  api.runtime.setAttachmentFilesForTest({
    image: 'blob:test-image',
    file: 'blob:test-file',
    external: 'https://example.com/not-a-blob'
  });
  const beforeCleanup = api.runtime.getCachePrivacySnapshot();
  const revokedCount = api.runtime.resetRuntimeAttachmentState();
  const afterCleanup = api.runtime.getCachePrivacySnapshot();
  const clearCacheResult = await api.runtime.clearAllCache();

  process.stdout.write(JSON.stringify({
    beforeCleanup,
    revokedCount,
    revokedObjectUrls,
    afterCleanup,
    clearCacheResult
  }, null, 2));
  process.exit(0);
}

if (input.mode === 'inputBundle') {
  const api = windowObject.__CHAEXTRACTOR_TEST__;
  const result = await api.runtime.input.buildBundleFromEntries(
    input.sourceType || 'zip',
    input.entries || [],
    {
      sourceName: input.sourceName,
      cacheKey: input.cacheKey
    }
  );
  process.stdout.write(JSON.stringify(result, null, 2));
  process.exit(0);
}

function buildSyntheticAndroidChat(messageCount) {
  const lines = [
    'Synthetic Android chat',
    '저장한 날짜 : 2026년 4월 1일 오전 9:00',
    '',
    '',
    ''
  ];

  for (let i = 0; i < messageCount; i++) {
    const day = (i % 10) + 1;
    const hour24 = i % 24;
    const ampm = hour24 < 12 ? '오전' : '오후';
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    const minute = String(i % 60).padStart(2, '0');
    const user = i % 17 === 0 ? '채상욱 리더' : `사용자${i % 20}`;
    const content = i % 50 === 0 ? '이모티콘' : `합성 메시지 ${i}`;
    lines.push(`2026년 4월 ${day}일 ${ampm} ${hour12}:${minute}, ${user} : ${content}`);
  }

  return lines.join('\n');
}

if (input.mode === 'performanceSmoke') {
  const api = windowObject.__CHAEXTRACTOR_TEST__;
  const messageCount = input.messageCount || 10000;
  const content = buildSyntheticAndroidChat(messageCount);
  const start = process.hrtime.bigint();
  const result = api.parser.parseChat(content, {
    platform: 'android',
    attachments: [],
    mapAttachments: false
  });
  const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;

  process.stdout.write(JSON.stringify({
    requestedMessageCount: messageCount,
    elapsedMs,
    messageCount: result.messageCount,
    dateCount: result.dateCount,
    typeCounts: result.typeCounts
  }, null, 2));
  process.exit(0);
}

let result = windowObject.__CHAEXTRACTOR_TEST__.parser.parseChat(input.content, {
  platform: input.platform,
  attachments: input.attachments || [],
  mapAttachments: true
});

if (input.renderDate) {
  result = {
    ...result,
    rendered: windowObject.__CHAEXTRACTOR_TEST__.ui.renderChat(input.renderDate)
  };
}

process.stdout.write(JSON.stringify(result, null, 2));
