declare module 'react-native-randombytes' {
  export function randomBytes(size: number, callback: (err: Error | null, data: Buffer) => void): void;
}
