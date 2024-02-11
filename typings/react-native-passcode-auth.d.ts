declare module 'react-native-passcode-auth' {
  declare function isSupported(): Promise<boolean>;
  declare function authenticate(): Promise<boolean>;
}
