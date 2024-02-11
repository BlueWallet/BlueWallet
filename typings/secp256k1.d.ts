declare module 'secp256k1' {
  export function publicKeyCreate(
    privateKey: Uint8Array,
    compressed?: boolean,
    output?: Uint8Array | ((len: number) => Uint8Array),
  ): Uint8Array;
  export function signatureExport(signature: Buffer): Buffer;
}
