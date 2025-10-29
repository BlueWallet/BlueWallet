// BBQR (Better Bitcoin QR) Implementation
// Manual implementation based on https://bbqr.org specification

// Re-export all public APIs
export * from './constants';
export * from './encoder';
export * from './decoder';
export * from './settings';
export * from './utils';

// Convenience re-exports for common use cases
export { encodeBBQR, encodePSBT, encodeTransaction } from './encoder';
export { decodeBBQR, BBQRDecoder } from './decoder';
export { getPreferredProtocol, setPreferredProtocol, getProtocolForEncoding } from './settings';

/**
 * Check if a string looks like a BBQR code
 */
export function isBBQR(data: string): boolean {
  return data.startsWith('B$') && data.length >= 8;
}
