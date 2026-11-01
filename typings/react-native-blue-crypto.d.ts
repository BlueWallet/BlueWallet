declare module 'react-native-blue-crypto' {
  /** scrypt over hex-encoded password and salt; resolves to the hex-encoded key */
  export function scrypt(passwordHex: string, saltHex: string, N: number, r: number, p: number, dkLen: number): Promise<string>;
}
