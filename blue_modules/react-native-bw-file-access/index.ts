// main index.js

import { NativeModules } from 'react-native';

const { BwFileAccess } = NativeModules;

export function readFile(filePath: string): Promise<string> {
  return BwFileAccess.readFileContent(filePath);
}

export default BwFileAccess;
