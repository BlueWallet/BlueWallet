import assert from 'assert';

const { WsURL, installWsUrlSupport, isCapableURL } = require('../../util/ws-url-polyfill');
const { SimplePool } = require('nostr-tools');

/**
 * Faithful stand-in for React Native's `Libraries/Blob/URL` shim: stores any
 * string when no base is given, exposes https-only getters and, crucially,
 * defines NO setters — so `p.pathname = ...` throws in strict mode exactly
 * like on device.
 */
class RNLikeURL {
  _url: string = '';
  constructor(url: string, base?: string) {
    if (!base || /^(?:https?|ftp):\/\//.test(url)) {
      this._url = String(url);
    } else if (typeof base === 'string') {
      this._url = base + url;
    } else {
      (base as any).toString();
    }
  }

  get protocol(): string {
    const m = this._url.match(/^([A-Za-z][A-Za-z0-9+.-]*):/);
    return m ? `${m[1]}:` : '';
  }

  get pathname(): string {
    const m = this._url.match(/https?:\/\/[^/]+(\/[^?#]*)?/);
    return m ? m[1] || '/' : '/';
  }

  get port(): string {
    const m = this._url.match(/:(\d+)(?=[/?#]|$)/);
    return m ? m[1] : '';
  }

  get hash(): string {
    const m = this._url.match(/#([^/]*)/);
    return m ? `#${m[1]}` : '';
  }

  get searchParams(): URLSearchParams {
    return new URLSearchParams('');
  }

  toString(): string {
    return this._url;
  }
}

/** WebSocket that records its URL and never connects (no network, no timers). */
class FakeWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  static lastUrl: string | undefined;
  readonly url: string;
  readonly readyState = FakeWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(url: string) {
    this.url = url;
    FakeWebSocket.lastUrl = url;
  }

  send(): void {}
  close(): void {}
}

const RELAY_URLS = [
  'wss://nostr.arkade.sh',
  'wss://nostr.arkade.sh/',
  'wss://relay.example:443/a//b/?b=2&a=1#frag',
  'ws://localhost:8080/path',
  'WSS://NOSTR.ARKADE.SH:443',
  'wss://user:pass@relay.example:7777/x?b=2&a=1',
];

/** The exact normalization `nostr-tools` applies to every relay URL. */
const normalizeLikeNostrTools = (URLImpl: any, url: string): string => {
  const p = new URLImpl(url);
  if (p.protocol === 'http:') p.protocol = 'ws:';
  else if (p.protocol === 'https:') p.protocol = 'wss:';
  p.pathname = p.pathname.replace(/\/+/g, '/');
  if (p.pathname.endsWith('/')) p.pathname = p.pathname.slice(0, -1);
  if ((p.port === '80' && p.protocol === 'ws:') || (p.port === '443' && p.protocol === 'wss:')) p.port = '';
  p.searchParams.sort();
  p.hash = '';
  return p.toString();
};

describe('ws-url-polyfill', () => {
  it('detects capable (WHATWG) and incapable (React Native) URL implementations', () => {
    assert.strictEqual(isCapableURL(URL), true);
    assert.strictEqual(isCapableURL(RNLikeURL), false);
  });

  it('install is a no-op where URL is already WHATWG-grade (Node/Jest)', () => {
    const sandbox: any = { URL, URLSearchParams };
    assert.strictEqual(installWsUrlSupport(sandbox), false);
    assert.strictEqual(sandbox.URL, URL);
  });

  it('WsURL matches WHATWG output through the nostr-tools normalization', () => {
    for (const relay of RELAY_URLS) {
      const expected = normalizeLikeNostrTools(URL, relay);
      const actual = normalizeLikeNostrTools(WsURL, relay);
      assert.strictEqual(actual, expected, relay);
    }
  });

  it('WsURL parses components like WHATWG', () => {
    const u: any = new WsURL('wss://user:pass@relay.example:7777/a/b?b=2&a=1#frag');
    const ref: any = new URL('wss://user:pass@relay.example:7777/a/b?b=2&a=1#frag');
    for (const key of ['protocol', 'username', 'password', 'hostname', 'port', 'host', 'pathname', 'search', 'hash', 'origin', 'href']) {
      assert.strictEqual(u[key], ref[key], key);
    }
    assert.strictEqual(u.toString(), ref.toString());
    assert.strictEqual(u.toJSON(), ref.href);
  });

  it('WsURL rejects what WHATWG rejects (non-ws schemes, garbage)', () => {
    assert.throws(() => new WsURL('https://example.com/'), /Invalid URL/);
    assert.throws(() => new WsURL('not a url'), /Invalid URL/);
    assert.throws(() => new WsURL('wss://'), /Invalid URL/);
  });

  it('patched URL delegates non-ws URLs to the native implementation untouched', () => {
    const sandbox: any = { URL: RNLikeURL, URLSearchParams };
    assert.strictEqual(installWsUrlSupport(sandbox), true);
    assert.strictEqual(new sandbox.URL('https://example.com:443/a?b=2').toString(), 'https://example.com:443/a?b=2');
    assert.strictEqual(new sandbox.URL('/getinfo', 'https://host:8080/x').toString(), 'https://host:8080/x/getinfo');
    assert.strictEqual(normalizeLikeNostrTools(sandbox.URL, 'wss://nostr.arkade.sh'), 'wss://nostr.arkade.sh/');
  });

  it('patched URL preserves native statics (blob URLs)', () => {
    const createObjectURL = () => 'blob:fake';
    const sandbox: any = { URL: Object.assign(RNLikeURL, { createObjectURL }), URLSearchParams };
    installWsUrlSupport(sandbox);
    assert.strictEqual(sandbox.URL.createObjectURL(), 'blob:fake');
  });

  it('nostr-tools stops throwing Invalid URL once the sandbox is patched', async () => {
    const sandbox: any = { URL: RNLikeURL, URLSearchParams };
    // Never actually connect: the sync relay-URL normalization is what under test.
    const pool = new SimplePool({ websocketImplementation: FakeWebSocket, allowConnectingToRelay: () => false });

    // Unpatched (device behavior before the fix): the exact error from the bug report.
    const RealURL = global.URL;
    (global as any).URL = sandbox.URL;
    try {
      assert.throws(
        () => pool.subscribeMany(['wss://nostr.arkade.sh'], { kinds: [24859] }, { onevent() {} }),
        /Invalid URL: wss:\/\/nostr\.arkade\.sh/,
      );
    } finally {
      global.URL = RealURL;
    }

    // Patched: normalization succeeds, no socket is opened, close settles.
    installWsUrlSupport(sandbox);
    FakeWebSocket.lastUrl = undefined;
    (global as any).URL = sandbox.URL;
    try {
      const handle = pool.subscribeMany(['wss://nostr.arkade.sh'], { kinds: [24859] }, { onevent() {} });
      await handle.close();
      assert.strictEqual(FakeWebSocket.lastUrl, undefined);
    } finally {
      global.URL = RealURL;
    }
  });
});
