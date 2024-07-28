declare module '@remobile/react-native-qrcode-local-image' {
  export function decode(uri: string, callback: (error: any, result: string) => void): void;
}
