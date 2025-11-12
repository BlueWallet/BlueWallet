// shim for expo-fetch
// vibe-coded with ChatGPT-5
//
// Minimal "expo/fetch" polyfill for bare React Native using XMLHttpRequest.
// - Streaming via Response.body.getReader() and async iteration
// - AbortController support
// - credentials ('include' / 'same-origin') via xhr.withCredentials
// - Robust header normalization (Headers, arrays, Map, plain object)
// - ESM + CJS interop (default + named exports)
// - Throws only real Error instances (Hermes-safe)

class AbortError extends Error {
  constructor(message = 'Aborted') {
    super(message);
    this.name = 'AbortError';
  }
}

class SimpleHeaders {
  constructor(init) {
    this._map = new Map();
    if (!init) return;
    if (typeof init === 'string') {
      init.split(/\r?\n/).forEach(line => {
        const i = line.indexOf(':');
        if (i > 0) {
          const k = line.slice(0, i).trim();
          const v = line.slice(i + 1).trim();
          if (k) this._map.set(k.toLowerCase(), v);
        }
      });
    } else if (typeof init.forEach === 'function' && typeof init.entries === 'function') {
      // WHATWG Headers-like
      for (const [k, v] of init.entries()) this._map.set(String(k).toLowerCase(), String(v));
    } else if (Array.isArray(init)) {
      for (const [k, v] of init) this._map.set(String(k).toLowerCase(), String(v));
    } else if (init instanceof Map) {
      for (const [k, v] of init) this._map.set(String(k).toLowerCase(), String(v));
    } else if (typeof init === 'object') {
      for (const [k, v] of Object.entries(init)) this._map.set(String(k).toLowerCase(), String(v));
    }
  }

  get(name) {
    return this._map.get(String(name).toLowerCase()) ?? null;
  }

  has(name) {
    return this._map.has(String(name).toLowerCase());
  }

  forEach(cb) {
    for (const [k, v] of this._map) cb(v, k);
  }

  entries() {
    return this._map.entries();
  }
}

class StreamController {
  constructor() {
    this._q = [];
    this._pending = null;
    this._closed = false;
    this._err = null;
  }

  push(bytes) {
    if (this._closed || this._err) return;
    if (this._pending) {
      const r = this._pending;
      this._pending = null;
      r({ value: bytes, done: false });
    } else this._q.push(bytes);
  }

  close() {
    if (this._closed || this._err) return;
    this._closed = true;
    if (this._pending) {
      const r = this._pending;
      this._pending = null;
      r({ done: true });
    }
  }

  error(e) {
    if (this._closed || this._err) return;
    this._err = e instanceof Error ? e : new Error(String(e));
    if (this._pending) {
      const r = this._pending;
      this._pending = null;
      r({ done: true });
    }
  }

  getReader() {
    return {
      read: () => {
        if (this._err) return Promise.reject(this._err);
        if (this._q.length) return Promise.resolve({ value: this._q.shift(), done: false });
        if (this._closed) return Promise.resolve({ done: true });
        return new Promise(resolve => {
          this._pending = resolve;
        });
      },
      cancel: () => {
        this._q.length = 0;
        this.close();
        return Promise.resolve();
      },
    };
  }

  [Symbol.asyncIterator]() {
    const reader = this.getReader();
    return {
      next: () => reader.read(),
      return: () => reader.cancel().then(() => ({ done: true, value: undefined })),
      throw: e => {
        this.error(e);
        return Promise.resolve({ done: true, value: undefined });
      },
    };
  }
}

class SimpleResponse {
  constructor({ url, status, headers, body }) {
    this.url = url;
    this.status = status;
    this.ok = status >= 200 && status < 300;
    this.headers = headers;
    this.body = body;
    this._text = null;
    this._buf = null;
  }

  async arrayBuffer() {
    if (this._buf) return this._buf.buffer;
    const chunks = [];
    for await (const c of this.body) chunks.push(c);
    const total = chunks.reduce((s, c) => s + c.byteLength, 0);
    const out = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) {
      out.set(c, off);
      off += c.byteLength;
    }
    this._buf = out;
    return out.buffer;
  }

  async text() {
    if (this._text != null) return this._text;
    const dec = new TextDecoder();
    let t = '';
    for await (const c of this.body) t += dec.decode(c, { stream: true });
    t += dec.decode();
    this._text = t;
    return t;
  }

  json() {
    return this.text().then(JSON.parse);
  }
}

const _enc = new TextEncoder();

function normalizeHeaders(h) {
  const out = {};
  if (!h) return out;
  if (typeof h.forEach === 'function' && typeof h.entries === 'function') {
    for (const [k, v] of h.entries()) out[k] = String(v);
  } else if (Array.isArray(h)) {
    for (const [k, v] of h) out[k] = String(v);
  } else if (h instanceof Map) {
    for (const [k, v] of h) out[k] = String(v);
  } else if (typeof h === 'object') {
    for (const [k, v] of Object.entries(h)) out[k] = String(v);
  }
  return out;
}

function fetchShim(input, init = {}) {
  return new Promise((resolve, reject) => {
    const url = typeof input === 'string' ? input : input?.toString?.();
    if (!url) {
      reject(new Error('Invalid request URL'));
      return;
    }
    const method = (init.method || 'GET').toUpperCase();
    const headers = normalizeHeaders(init.headers);
    const body = init.body ?? null;

    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.responseType = 'text';

    // credentials support
    if (init.credentials === 'include' || init.credentials === 'same-origin') {
      try {
        xhr.withCredentials = true;
      } catch {}
    }

    for (const [k, v] of Object.entries(headers)) {
      try {
        xhr.setRequestHeader(k, v);
      } catch {}
    }

    let lastLen = 0;
    const controller = new StreamController();
    let resolved = false;

    const finalize = () => {
      if (resolved) return;
      const raw = xhr.getAllResponseHeaders?.() || '';
      const h = new SimpleHeaders(raw);
      resolve(new SimpleResponse({ url, status: xhr.status || 0, headers: h, body: controller }));
      resolved = true;
    };

    const pump = () => {
      const text = xhr.responseText ?? '';
      if (text.length > lastLen) {
        const chunk = text.slice(lastLen);
        lastLen = text.length;
        controller.push(_enc.encode(chunk));
      }
    };

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 2) finalize();
      if (xhr.readyState === 3) pump();
      if (xhr.readyState === 4) {
        pump();
        controller.close();
      }
    };
    xhr.onprogress = pump;

    xhr.onerror = () => {
      const err = new Error(`Network error (${xhr.status || 0})`);
      controller.error(err);
      if (!resolved) reject(err);
    };

    xhr.onabort = () => {
      const err = new AbortError();
      controller.error(err);
      if (!resolved) reject(err);
    };

    if (init.signal) {
      if (init.signal.aborted) {
        try {
          xhr.abort();
        } catch {}
      } else
        init.signal.addEventListener(
          'abort',
          () => {
            try {
              xhr.abort();
            } catch {}
          },
          { once: true },
        );
    }

    try {
      if (body == null) {
        xhr.send();
      } else if (typeof body === 'string') {
        xhr.send(body);
      } else if (typeof body === 'object' && ('byteLength' in body || ArrayBuffer.isView(body))) {
        // ArrayBuffer or TypedArray
        xhr.send(body);
      } else {
        // Fallback: JSON
        try {
          xhr.setRequestHeader('Content-Type', 'application/json');
        } catch {}
        xhr.send(JSON.stringify(body));
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      controller.error(err);
      if (!resolved) reject(err);
    }
  });
}

// ---- ESM exports
export default fetchShim;
export { fetchShim as fetch, SimpleHeaders as Headers, SimpleResponse as Response };

// ---- CJS interop (some deps use require('expo/fetch'), others expect .default or named)
try {
  Object.defineProperty(exports, '__esModule', { value: true });
  module.exports = fetchShim;
  module.exports.default = fetchShim;
  module.exports.fetch = fetchShim;
  module.exports.Headers = SimpleHeaders;
  module.exports.Response = SimpleResponse;
} catch {}
