const DEFAULT_TIMEOUT = 20_000; // default timeout in ms

// protection against calling itself recursively
const nativeFetch = globalThis.fetch.bind(globalThis);

/**
 * Method and URL without query string or body: request bodies carry push
 * tokens and wallet addresses, and query strings can carry addresses too (H13).
 */
export function describeRequest(input: RequestInfo | URL, init: RequestInit = {}): string {
  const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const method = (init.method || 'GET').toUpperCase();
  try {
    const url = new URL(raw);
    return `${method} ${url.origin}${url.pathname}`;
  } catch {
    return `${method} ${raw.split('?')[0]}`;
  }
}

export function fetch(input: RequestInfo | URL, init: RequestInit & { timeout?: number } = {}): Promise<Response> {
  if (__DEV__) {
    console.log('fetch:', describeRequest(input, init));
  }
  const { timeout = DEFAULT_TIMEOUT, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  return nativeFetch(input, { ...rest, signal: controller.signal }).finally(() => clearTimeout(timer));
}
