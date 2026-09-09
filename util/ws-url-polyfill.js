'use strict';

/**
 * `ws:`/`wss:`-capable `URL` fallback for React Native.
 *
 * `@arkade-os/swap` talks to solvers over Nostr (`wss://` relays such as
 * `wss://nostr.arkade.sh`, see `blue_modules/arkade-solver.card.json`) via
 * `nostr-tools` `SimplePool`, which normalizes every relay URL with
 * `new URL()` plus the `protocol`/`pathname`/`port`/`hash` setters and a live
 * `searchParams.sort()`. On device `global.URL` is React Native's
 * `Libraries/Blob/URL` shim: it has no such setters and its getters only
 * understand `http(s)`, so the first Nostr contact (quoting a Lightning
 * invoice for an Arkade send) throws, which `nostr-tools` rethrows as
 * `Invalid URL: wss://...`. Node/Jest ship a WHATWG `URL`, which is why the
 * unit tests never caught it.
 *
 * This module wraps (never replaces the behavior of) the built-in `URL`:
 * absolute `ws:`/`wss:` URLs are handled by the small mutable `WsURL` class
 * below, everything else delegates to the original implementation, so
 * `http(s)` parsing is byte-for-byte unchanged. `installWsUrlSupport()`
 * feature-probes first and is a no-op wherever the native `URL` is already
 * capable (Node, Jest, future Hermes builds), and it is idempotent.
 *
 * Plain CommonJS with no dependencies so it loads from `shim.js` (before any
 * app code) and directly under Jest.
 */

const WS_DEFAULT_PORTS = { ws: '80', wss: '443', http: '80', https: '443', ftp: '21' };

const SCHEME_TOKEN_RE = /^[A-Za-z][A-Za-z0-9+.-]*$/;

const invalidUrl = raw => {
  throw new TypeError(`Invalid URL: ${raw}`);
};

/**
 * Split an `authority` (`[userinfo@]host[:port]`) into components.
 * Hostnames are lowercased; the default port for `scheme` is dropped, mirroring WHATWG.
 */
const parseAuthority = (authority, scheme, raw) => {
  let username = '';
  let password = '';
  let hostport = authority;
  const at = authority.lastIndexOf('@');
  if (at !== -1) {
    const userinfo = authority.slice(0, at);
    hostport = authority.slice(at + 1);
    const colon = userinfo.indexOf(':');
    if (colon === -1) {
      username = userinfo;
    } else {
      username = userinfo.slice(0, colon);
      password = userinfo.slice(colon + 1);
    }
  }

  let hostname = '';
  let port = '';
  if (hostport.startsWith('[')) {
    const close = hostport.indexOf(']');
    if (close === -1) invalidUrl(raw);
    hostname = hostport.slice(0, close + 1).toLowerCase();
    const rest = hostport.slice(close + 1);
    if (rest !== '') {
      if (!rest.startsWith(':')) invalidUrl(raw);
      port = rest.slice(1);
    }
  } else {
    const colon = hostport.lastIndexOf(':');
    if (colon !== -1 && /^[0-9]*$/.test(hostport.slice(colon + 1))) {
      hostname = hostport.slice(0, colon).toLowerCase();
      port = hostport.slice(colon + 1);
    } else {
      hostname = hostport.toLowerCase();
    }
  }
  if (!hostname) invalidUrl(raw);
  if (port !== '' && !/^[0-9]+$/.test(port)) invalidUrl(raw);
  if (port !== '' && WS_DEFAULT_PORTS[scheme] === port) port = '';
  return { username, password, hostname, port };
};

/** Minimal mutable URL model for absolute `ws:`/`wss:` URLs (only what callers use). */
class WsURL {
  constructor(input, ParamsImpl) {
    const raw = String(input);
    const m = /^\s*([A-Za-z][A-Za-z0-9+.-]*):\/\/([^\/?#]*)([^?#]*)(?:\?([^#]*))?(?:#(.*))?\s*$/.exec(raw);
    if (!m) invalidUrl(raw);
    const scheme = m[1].toLowerCase();
    if (scheme !== 'ws' && scheme !== 'wss') invalidUrl(raw);
    const { username, password, hostname, port } = parseAuthority(m[2], scheme, raw);
    this._scheme = scheme;
    this._username = username;
    this._password = password;
    this._hostname = hostname;
    this._port = port;
    this._path = m[3] || '';
    this._query = m[4] ?? '';
    this._fragment = m[5] ?? '';
    this._params = null;
    this._ParamsImpl = ParamsImpl || globalThis.URLSearchParams;
  }

  get protocol() {
    return `${this._scheme}:`;
  }

  set protocol(value) {
    const token = String(value).toLowerCase().replace(/:$/, '');
    if (!SCHEME_TOKEN_RE.test(token)) return; // invalid values are ignored, like WHATWG
    this._scheme = token;
    if (this._port !== '' && WS_DEFAULT_PORTS[this._scheme] === this._port) this._port = '';
  }

  get username() {
    return this._username;
  }

  set username(value) {
    this._username = String(value);
  }

  get password() {
    return this._password;
  }

  set password(value) {
    this._password = String(value);
  }

  get hostname() {
    return this._hostname;
  }

  set hostname(value) {
    const hostname = String(value).toLowerCase();
    if (!hostname) return;
    this._hostname = hostname;
  }

  get port() {
    return this._port;
  }

  set port(value) {
    const port = String(value);
    if (port !== '' && !/^[0-9]+$/.test(port)) return;
    this._port = port !== '' && WS_DEFAULT_PORTS[this._scheme] === port ? '' : port;
  }

  get host() {
    return this._port === '' ? this._hostname : `${this._hostname}:${this._port}`;
  }

  set host(value) {
    try {
      const { username, hostname, port } = parseAuthority(String(value), this._scheme, value);
      void username;
      this._hostname = hostname;
      this._port = port;
    } catch {
      // invalid values are ignored, like WHATWG
    }
  }

  get pathname() {
    return this._path || '/';
  }

  set pathname(value) {
    const path = String(value);
    this._path = path === '' ? '/' : path.startsWith('/') ? path : `/${path}`;
  }

  get search() {
    const query = this._params ? this._params.toString() : this._query;
    return query === '' ? '' : `?${query}`;
  }

  set search(value) {
    const query = String(value);
    this._query = query.startsWith('?') ? query.slice(1) : query;
    this._params = null;
  }

  get searchParams() {
    if (!this._params) this._params = new this._ParamsImpl(this._query);
    return this._params;
  }

  get hash() {
    return this._fragment === '' ? '' : `#${this._fragment}`;
  }

  set hash(value) {
    const fragment = String(value);
    this._fragment = fragment.startsWith('#') ? fragment.slice(1) : fragment;
  }

  get origin() {
    return `${this._scheme}://${this.host}`;
  }

  get href() {
    return this.toString();
  }

  set href(value) {
    const next = new WsURL(value, this._ParamsImpl);
    this._scheme = next._scheme;
    this._username = next._username;
    this._password = next._password;
    this._hostname = next._hostname;
    this._port = next._port;
    this._path = next._path;
    this._query = next._query;
    this._fragment = next._fragment;
    this._params = null;
  }

  toString() {
    const userinfo = this._username === '' ? '' : this._password === '' ? `${this._username}@` : `${this._username}:${this._password}@`;
    const query = this._params ? this._params.toString() : this._query;
    return `${this._scheme}://${userinfo}${this.host}${this._path || '/'}${query === '' ? '' : `?${query}`}${
      this._fragment === '' ? '' : `#${this._fragment}`
    }`;
  }

  toJSON() {
    return this.toString();
  }

  get [Symbol.toStringTag]() {
    return 'URL';
  }
}

/** True when `URLImpl` already survives the exact `nostr-tools` relay normalization. */
const isCapableURL = URLImpl => {
  try {
    const probe = new URLImpl('wss://nostr.arkade.sh');
    if (probe.protocol !== 'wss:') return false;
    probe.pathname = String(probe.pathname).replace(/\/+/g, '/');
    if (String(probe.pathname).endsWith('/')) probe.pathname = String(probe.pathname).slice(0, -1);
    probe.port = '';
    probe.hash = '';
    if (typeof probe.searchParams?.sort !== 'function') return false;
    return probe.toString() === 'wss://nostr.arkade.sh/';
  } catch {
    return false;
  }
};

/**
 * Build the drop-in `URL` replacement: absolute `ws:`/`wss:` URLs go to
 * `WsURL`, everything else (including relative URLs with a base) keeps the
 * exact behavior of `NativeURL`.
 */
const createPatchedURL = (NativeURL, NativeParams) => {
  function PatchedURL(url, base) {
    const raw = url instanceof PatchedURL || (typeof NativeURL === 'function' && url instanceof NativeURL) ? url.toString() : String(url);
    const scheme = (/^\s*([A-Za-z][A-Za-z0-9+.-]*):/.exec(raw) || [])[1]?.toLowerCase();
    if ((scheme === 'ws' || scheme === 'wss') && raw.includes('://')) return new WsURL(raw, NativeParams);
    return new NativeURL(url, base);
  }
  for (const key of ['createObjectURL', 'revokeObjectURL']) {
    if (typeof NativeURL[key] === 'function') PatchedURL[key] = NativeURL[key].bind(NativeURL);
  }
  return PatchedURL;
};

/**
 * Install the wrapper on `target` (defaults to `globalThis`) when its `URL`
 * cannot handle `wss:` relay URLs. Returns true when it installed.
 */
const installWsUrlSupport = (target = globalThis) => {
  const NativeURL = target?.URL;
  if (typeof NativeURL !== 'function') return false;
  if (isCapableURL(NativeURL)) return false; // already WHATWG-grade: leave it alone
  target.URL = createPatchedURL(NativeURL, target?.URLSearchParams);
  return true;
};

module.exports = { WsURL, createPatchedURL, installWsUrlSupport, isCapableURL };
