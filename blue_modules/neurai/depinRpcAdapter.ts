/**
 * RPC adapter for `@neuraiproject/neurai-depin-msg` RPC 6.
 *
 * The library takes an object with `call(method, params)` and never touches
 * transport details, so this is the seam where the app's backend meets it.
 *
 * Kept deliberately thin: every RPC-6 rule — verifying `poolsig` before
 * decoding, challenge chaining, recipient binding — lives in the library, which
 * is validated against the node's own test vectors. Re-implementing any of it
 * here would create a second source of truth for the same rules.
 */

/** What the library expects: an object with `call(method, params)`. */
export interface DepinRpc {
  call<T = unknown>(method: string, params?: unknown[]): Promise<T>;
}

/** The underlying caller, e.g. `backend.rpc` bound to a Neurai node. */
export type RawRpcCall = (method: string, params: unknown[]) => Promise<unknown>;

/**
 * Wraps a plain RPC function into the shape the library expects.
 *
 * @param call - Function issuing a JSON-RPC call against the node
 * @returns An adapter usable as `{ rpc }` in every depin-msg RPC-6 call
 */
export function createDepinRpc(call: RawRpcCall): DepinRpc {
  if (typeof call !== 'function') {
    throw new Error('createDepinRpc needs a call(method, params) function');
  }
  return {
    call: <T>(method: string, params: unknown[] = []) => call(method, params) as Promise<T>,
  };
}

/**
 * The endpoint's identity for trust decisions.
 *
 * A pin is only meaningful against a stable name for "where this answer came
 * from". Credentials are deliberately excluded: they can rotate without the
 * endpoint changing, and they must never reach persisted state.
 *
 * @param network - Chain the wallet is on
 * @param url - RPC endpoint URL
 * @returns A stable identifier for `serviceId`
 */
export function depinServiceId(network: string, url: string): string {
  // Normalised by hand rather than through `URL`: React Native's polyfill is
  // incomplete and its properties are read-only, so mutating a parsed URL is
  // neither portable nor type-safe here.
  let normalized = String(url).trim();

  // Drop credentials: they rotate without the endpoint changing, and they must
  // never reach persisted state.
  normalized = normalized.replace(/^([a-z][a-z0-9+.-]*:\/\/)[^/@]*@/i, '$1');

  // A fragment is never part of an endpoint's identity.
  normalized = normalized.replace(/#.*$/, '');

  // Neither are trailing slashes.
  normalized = normalized.replace(/\/+$/, '');

  return `${network}|${normalized}`;
}
