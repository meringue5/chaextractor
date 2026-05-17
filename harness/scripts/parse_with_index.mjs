import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const indexHtml = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
const jsZipMarker = '<!-- JSZip';
const appHtml = indexHtml.slice(0, indexHtml.indexOf(jsZipMarker));
const scripts = [...appHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)];

if (scripts.length === 0) {
  throw new Error('Could not find app script in index.html');
}

const appScript = scripts[scripts.length - 1][1];
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
  matchMedia() {
    return {
      matches: false,
      addEventListener() {},
      removeEventListener() {}
    };
  }
};

const fakeIndexedDB = createFakeIndexedDB();

const context = {
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
vm.runInContext(appScript, context, { filename: 'index.html' });

if (!windowObject.__CHAEXTRACTOR_TEST__) {
  throw new Error('index.html did not expose __CHAEXTRACTOR_TEST__');
}

if (input.mode === 'modalEscape') {
  const api = windowObject.__CHAEXTRACTOR_TEST__;
  const modalIds = ['tipsModal', 'settingsModal'];
  const results = [];

  for (const modalId of modalIds) {
    let prevented = false;
    api.openModal(modalId);
    const before = api.isModalOpen(modalId);
    api.handleModalKeydown({
      key: 'Escape',
      preventDefault() {
        prevented = true;
      }
    });
    results.push({ modalId, before, after: api.isModalOpen(modalId), prevented });
  }

  let prevented = false;
  api.showImage('blob:test-image');
  const before = api.isModalOpen('imageModal');
  api.handleModalKeydown({
    key: 'Escape',
    preventDefault() {
      prevented = true;
    }
  });
  results.push({
    modalId: 'imageModal',
    before,
    after: api.isModalOpen('imageModal'),
    prevented
  });

  process.stdout.write(JSON.stringify({ results }, null, 2));
  process.exit(0);
}

if (input.mode === 'cacheDateSort') {
  const api = windowObject.__CHAEXTRACTOR_TEST__;
  api.restoreCachedChatData(input.cachedData || {});
  process.stdout.write(JSON.stringify(api.getSnapshot(), null, 2));
  process.exit(0);
}

if (input.mode === 'uiSmoke') {
  const api = windowObject.__CHAEXTRACTOR_TEST__;
  const parseResult = api.parseChat(input.content, {
    platform: input.platform,
    attachments: input.attachments || [],
    mapAttachments: true
  });

  api.initApp();
  const afterInit = api.getUiSnapshot();

  api.selectDate(input.selectDate || parseResult.dates[0]);
  const afterSelect = api.getUiSnapshot();

  api.renderDateList(input.searchQuery || '');
  const afterSearch = api.getUiSnapshot();

  api.setLeaderFilterForTest(true);
  const afterLeaderFilter = api.getUiSnapshot();

  api.applyTheme('dark');
  api.applyFont('ridi');
  const afterSettings = api.getUiSnapshot();

  api.openModal('settingsModal');
  const afterSettingsModal = api.getUiSnapshot();

  api.openSidebar();
  const afterSidebarOpen = api.getUiSnapshot();

  api.closeSidebar();
  const afterSidebarClose = api.getUiSnapshot();

  process.stdout.write(JSON.stringify({
    parseResult,
    afterInit,
    afterSelect,
    afterSearch,
    afterLeaderFilter,
    afterSettings,
    afterSettingsModal,
    afterSidebarOpen,
    afterSidebarClose
  }, null, 2));
  process.exit(0);
}

if (input.mode === 'capabilityNotice') {
  const api = windowObject.__CHAEXTRACTOR_TEST__;
  const result = api.applyBrowserCapabilityStatus(input.status);
  process.stdout.write(JSON.stringify({
    result,
    snapshot: api.getCapabilitySnapshot()
  }, null, 2));
  process.exit(0);
}

if (input.mode === 'cachePrivacy') {
  const api = windowObject.__CHAEXTRACTOR_TEST__;
  api.setAttachmentFilesForTest({
    image: 'blob:test-image',
    file: 'blob:test-file',
    external: 'https://example.com/not-a-blob'
  });
  const beforeCleanup = api.getCachePrivacySnapshot();
  const revokedCount = api.resetRuntimeAttachmentState();
  const afterCleanup = api.getCachePrivacySnapshot();
  const clearCacheResult = await api.clearAllCache();

  process.stdout.write(JSON.stringify({
    beforeCleanup,
    revokedCount,
    revokedObjectUrls,
    afterCleanup,
    clearCacheResult
  }, null, 2));
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
  const result = api.parseChat(content, {
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

let result = windowObject.__CHAEXTRACTOR_TEST__.parseChat(input.content, {
  platform: input.platform,
  attachments: input.attachments || [],
  mapAttachments: true
});

if (input.renderDate) {
  result = {
    ...result,
    rendered: windowObject.__CHAEXTRACTOR_TEST__.renderChat(input.renderDate)
  };
}

process.stdout.write(JSON.stringify(result, null, 2));
