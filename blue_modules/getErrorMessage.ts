/**
 * Normalize thrown values (Error, string, Electrum JSON-RPC `{ code, message }`) into a user-facing string.
 */
export function getErrorMessage(error: unknown, fallback = 'Unknown error'): string {
  if (error instanceof Error) {
    return error.message || fallback;
  }
  if (typeof error === 'string') {
    return error || fallback;
  }
  if (error && typeof error === 'object') {
    if ('message' in error) {
      const message = (error as { message: unknown }).message;
      if (typeof message === 'string' && message) {
        return message;
      }
    }
    try {
      const serialized = JSON.stringify(error);
      if (serialized && serialized !== '{}') {
        return serialized;
      }
    } catch (_) {}
  }
  return fallback;
}
