declare module 'secp256k1' {
  export function publicKeyCreate(privateKey: Buffer, compressed?: boolean, output?: Buffer | ((len: number) => Buffer)): Buffer;
  export function signatureExport(signature: Buffer): Buffer;
  export function sign(message: Buffer, privateKey: Buffer): { signature: Buffer; recid: number };
}
