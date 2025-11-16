const DEFAULT_TIMEOUT = 20_000; // default timeout in ms

// protection against calling itself recursively
const nativeFetch = globalThis.fetch.bind(globalThis);

export function fetch(input: RequestInfo | URL, init: RequestInit & { timeout?: number } = {}): Promise<Response> {
  if (__DEV__) {
    console.log('fetch wrapper: ', input, init);
  }
  const { timeout = DEFAULT_TIMEOUT, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  return nativeFetch(input, { ...rest, signal: controller.signal }).finally(() => clearTimeout(timer));
}
