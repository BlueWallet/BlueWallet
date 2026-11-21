import * as bitcoin from 'bitcoinjs-lib';
import { CreateTransactionTarget } from '../class/wallets/types';
import { hexToUint8Array, uint8ArrayToHex } from '../blue_modules/uint8array-extras';
import loc from '../loc';

export function formatTransactionOutput(output: CreateTransactionTarget): string {
  if (output.address) return output.address;
  const hex = output.script instanceof Uint8Array ? uint8ArrayToHex(output.script) : output.script?.hex || '';
  const script = hexToUint8Array(hex);
  if (script[0] === bitcoin.opcodes.OP_RETURN) return `${loc.send.output_data}\n${hex}`;
  try {
    const pubkey = bitcoin.payments.p2pk({ output: script }).pubkey;
    // bitcoinjs checks the key and CHECKSIG, but not the key's push opcode.
    if (pubkey && script[0] === pubkey.length) return `${loc.send.output_public_key}\n${uint8ArrayToHex(pubkey)}`;
  } catch {} // Other non-address outputs still show their actual script.
  return `${loc.send.output_script}\n${hex || loc.send.output_empty}`;
}
