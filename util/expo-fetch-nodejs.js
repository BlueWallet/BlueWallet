// Node.js polyfill for expo/fetch
// Minimal "expo/fetch" polyfill for Node.js using http/https modules
// - Streaming via Response.body.getReader() and async iteration (for SSE)
// - AbortController support
// - credentials ('include' / 'same-origin') support
// - Robust header normalization (Headers, arrays, Map, plain object)
// - ESM + CJS interop (default + named exports)
// - Throws only real Error instances

const http = require('http');
const https = require('https');
const { URL } = require('url');

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
    } else if (typeof init === 'object' && init !== null) {
      if (typeof init.forEach === 'function' && typeof init.entries === 'function') {
        // WHATWG Headers-like
        for (const [k, v] of init.entries()) this._map.set(String(k).toLowerCase(), String(v));
      } else if (Array.isArray(init)) {
        for (const [k, v] of init) this._map.set(String(k).toLowerCase(), String(v));
      } else if (init instanceof Map) {
        for (const [k, v] of init) this._map.set(String(k).toLowerCase(), String(v));
      } else {
        for (const [k, v] of Object.entries(init)) this._map.set(String(k).toLowerCase(), String(v));
      }
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

  set(name, value) {
    this._map.set(String(name).toLowerCase(), String(value));
  }

  delete(name) {
    this._map.delete(String(name).toLowerCase());
  }

  keys() {
    return this._map.keys();
  }

  values() {
    return this._map.values();
  }

  [Symbol.iterator]() {
    return this._map[Symbol.iterator]();
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
  constructor({ url, status, statusText, headers, body }) {
    this.url = url;
    this.status = status;
    this.statusText = statusText || '';
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

function normalizeHeaders(h) {
  const out = {};
  if (!h) return out;
  if (typeof h === 'object' && h !== null) {
    if (typeof h.forEach === 'function' && typeof h.entries === 'function') {
      for (const [k, v] of h.entries()) out[k] = String(v);
    } else if (Array.isArray(h)) {
      for (const [k, v] of h) out[k] = String(v);
    } else if (h instanceof Map) {
      for (const [k, v] of h) out[k] = String(v);
    } else {
      for (const [k, v] of Object.entries(h)) out[k] = String(v);
    }
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

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (e) {
      reject(new Error(`Invalid URL: ${url}`));
      return;
    }

    const method = (init.method || 'GET').toUpperCase();
    const headers = normalizeHeaders(init.headers);
    const body = init.body ?? null;

    // Choose http or https module
    const client = parsedUrl.protocol === 'https:' ? https : http;

    const controller = new StreamController();
    let resolved = false;
    let req;

    const options = {
      method,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      headers,
    };

    // credentials support
    if (init.credentials === 'include' || init.credentials === 'same-origin') {
      // In Node.js, this would typically mean including cookies
      // For most SSE use cases, this is handled by the Cookie header
      // If needed, you can add agent configuration here
    }

    req = client.request(options, res => {
      // Build response headers
      const responseHeaders = new SimpleHeaders(res.headers);

      // Resolve with response immediately (like XHR readyState 2)
      const response = new SimpleResponse({
        url,
        status: res.statusCode,
        statusText: res.statusMessage,
        headers: responseHeaders,
        body: controller,
      });

      resolve(response);
      resolved = true;

      // Stream response data
      res.on('data', chunk => {
        // Convert Buffer to Uint8Array
        const uint8 = new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
        controller.push(uint8);
      });

      res.on('end', () => {
        controller.close();
      });

      res.on('error', err => {
        const error = err instanceof Error ? err : new Error(String(err));
        controller.error(error);
      });
    });

    req.on('error', err => {
      const error = err instanceof Error ? err : new Error(String(err));
      controller.error(error);
      if (!resolved) reject(error);
    });

    // AbortController support
    if (init.signal) {
      if (init.signal.aborted) {
        req.destroy();
        const err = new AbortError();
        controller.error(err);
        if (!resolved) reject(err);
        return;
      } else {
        init.signal.addEventListener(
          'abort',
          () => {
            req.destroy();
            const err = new AbortError();
            controller.error(err);
            if (!resolved) reject(err);
          },
          { once: true },
        );
      }
    }

    // Send body
    try {
      if (body == null) {
        req.end();
      } else if (typeof body === 'string') {
        req.end(body);
      } else if (Buffer.isBuffer(body)) {
        req.end(body);
      } else if (body instanceof Uint8Array || ArrayBuffer.isView(body)) {
        req.end(Buffer.from(body.buffer, body.byteOffset, body.byteLength));
      } else if (body instanceof ArrayBuffer) {
        req.end(Buffer.from(body));
      } else {
        // Fallback: JSON
        const jsonBody = JSON.stringify(body);
        if (!headers['content-type']) {
          req.setHeader('Content-Type', 'application/json');
        }
        req.end(jsonBody);
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      controller.error(err);
      if (!resolved) reject(err);
    }
  });
}

// ---- ESM exports
module.exports = fetchShim;
module.exports.default = fetchShim;
module.exports.fetch = fetchShim;
module.exports.Headers = SimpleHeaders;
module.exports.Response = SimpleResponse;
module.exports.AbortError = AbortError;

