import { gcm } from '@noble/ciphers/aes';
import { base64ToUint8Array, stringToUint8Array, uint8ArrayToBase64, uint8ArrayToString } from './uint8array-extras';

export const WALLET_DATA_ENVELOPE_VERSION = 2;
export const WALLET_DATA_KEY_LENGTH = 32;
const NONCE_LENGTH = 12;
const AAD = stringToUint8Array('BlueWallet.wallet-data.v2');

type WalletDataEnvelope = {
  version: typeof WALLET_DATA_ENVELOPE_VERSION;
  algorithm: 'AES-256-GCM';
  nonce: string;
  ciphertext: string;
};

export const isWalletDataEnvelope = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  try {
    const envelope = JSON.parse(value) as Partial<WalletDataEnvelope>;
    return (
      envelope.version === WALLET_DATA_ENVELOPE_VERSION &&
      envelope.algorithm === 'AES-256-GCM' &&
      typeof envelope.nonce === 'string' &&
      typeof envelope.ciphertext === 'string'
    );
  } catch (_) {
    return false;
  }
};

export const encryptWalletData = (plaintext: string, key: Uint8Array, nonce: Uint8Array): string => {
  if (key.length !== WALLET_DATA_KEY_LENGTH) throw new Error('Wallet data-encryption key must be 32 bytes');
  if (nonce.length !== NONCE_LENGTH) throw new Error('Wallet data nonce must be 12 bytes');

  const envelope: WalletDataEnvelope = {
    version: WALLET_DATA_ENVELOPE_VERSION,
    algorithm: 'AES-256-GCM',
    nonce: uint8ArrayToBase64(nonce),
    ciphertext: uint8ArrayToBase64(gcm(key, nonce, AAD).encrypt(stringToUint8Array(plaintext))),
  };
  return JSON.stringify(envelope);
};

export const decryptWalletData = (serializedEnvelope: string, key: Uint8Array): string => {
  if (key.length !== WALLET_DATA_KEY_LENGTH) throw new Error('Wallet data-encryption key must be 32 bytes');
  if (!isWalletDataEnvelope(serializedEnvelope)) throw new Error('Unsupported wallet-data envelope');
  const envelope = JSON.parse(serializedEnvelope) as WalletDataEnvelope;

  const nonce = base64ToUint8Array(envelope.nonce);
  if (nonce.length !== NONCE_LENGTH) throw new Error('Invalid wallet-data nonce');
  return uint8ArrayToString(gcm(key, nonce, AAD).decrypt(base64ToUint8Array(envelope.ciphertext)));
};
