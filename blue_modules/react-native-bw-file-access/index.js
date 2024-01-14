// main index.js

import { NativeModules } from 'react-native';

const { BwFileAccess } = NativeModules;

export function readFile(filePath) {
  return BwFileAccess.readFileContent(filePath);
}

export default BwFileAccess;
