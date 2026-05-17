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

const windowObject = {
  __CHAEXTRACTOR_ENABLE_TEST_API__: true,
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
    querySelector(selector) {
      if (selector === '.sidebar') return getElementById('sidebar');
      return createElement('div');
    },
    querySelectorAll() {
      return [];
    }
  },
  window: windowObject,
  localStorage,
  performance: { now: () => 0 },
  URL: { createObjectURL: () => 'blob:test' },
  setTimeout,
  clearTimeout,
  requestAnimationFrame(callback) {
    callback();
  }
};

context.globalThis = context;
windowObject.document = context.document;
windowObject.localStorage = localStorage;

vm.createContext(context);
vm.runInContext(appScript, context, { filename: 'index.html' });

if (!windowObject.__CHAEXTRACTOR_TEST__) {
  throw new Error('index.html did not expose __CHAEXTRACTOR_TEST__');
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
