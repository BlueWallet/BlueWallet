declare module 'slip39' {
  export function recoverSecret(secret: string[], passphrase?: string): Buffer;
  export function validateMnemonic(mnemonic: string): boolean;
}

declare module 'slip39/src/slip39_helper' {
  export const WORD_LIST: string[];
}
