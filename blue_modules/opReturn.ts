import { hexToUint8Array, uint8ArrayToHex, uint8ArrayToString } from './uint8array-extras';

const OP_RETURN = 0x6a;
const OP_PUSHDATA1 = 0x4c;
const OP_PUSHDATA2 = 0x4d;
const OP_PUSHDATA4 = 0x4e;

/**
 * Returns true if the string is safe to display (printable UTF-8, no control chars).
 */
function isDisplayableText(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code < 0x20 && code !== 0x0a && code !== 0x0d && code !== 0x09) return false;
    if (code === 0x7f) return false;
  }
  return true;
}

/**
 * Parses an OP_RETURN scriptPubKey (hex) and extracts the data payload.
 * Tries to decode payload as UTF-8; if valid and displayable, returns text.
 *
 * @param scriptHex - Full script hex (e.g. "6a0b68656c6c6f20776f726c64")
 * @returns { text: decoded string or null, hex: payload hex or full script hex on parse failure }
 */
export function decodeOpReturnPayload(scriptHex: string): { text: string | null; hex: string } {
  if (!scriptHex || typeof scriptHex !== 'string') {
    return { text: null, hex: scriptHex || '' };
  }
  const hex = scriptHex.replace(/\s/g, '').toLowerCase();
  if (hex.length < 4 || hex.length % 2 !== 0) {
    return { text: null, hex: scriptHex };
  }
  let arr: Uint8Array;
  try {
    arr = hexToUint8Array(hex);
  } catch {
    return { text: null, hex: scriptHex };
  }
  if (arr.length < 2 || arr[0] !== OP_RETURN) {
    return { text: null, hex: scriptHex };
  }
  const pushOp = arr[1];
  let dataStart: number;
  let dataLength: number;
  if (pushOp >= 0x01 && pushOp <= 0x4b) {
    dataLength = pushOp;
    dataStart = 2;
  } else if (pushOp === OP_PUSHDATA1) {
    if (arr.length < 4) return { text: null, hex: scriptHex };
    dataLength = arr[2];
    dataStart = 3;
  } else if (pushOp === OP_PUSHDATA2) {
    if (arr.length < 5) return { text: null, hex: scriptHex };
    dataLength = arr[2] + arr[3] * 256;
    dataStart = 4;
  } else if (pushOp === OP_PUSHDATA4) {
    if (arr.length < 7) return { text: null, hex: scriptHex };
    dataLength = arr[2] + arr[3] * 256 + arr[4] * 65536 + arr[5] * 16777216;
    dataStart = 6;
  } else {
    return { text: null, hex: scriptHex };
  }
  if (dataStart + dataLength > arr.length) {
    return { text: null, hex: scriptHex };
  }
  const payload = arr.subarray(dataStart, dataStart + dataLength);
  const payloadHex = uint8ArrayToHex(payload);
  if (payload.length === 0) {
    return { text: null, hex: payloadHex };
  }
  try {
    const decoded = uint8ArrayToString(payload, 'utf8');
    if (decoded && isDisplayableText(decoded)) {
      return { text: decoded, hex: payloadHex };
    }
  } catch {
    // UTF-8 decode failed (e.g. invalid sequence)
  }
  return { text: null, hex: payloadHex };
}
