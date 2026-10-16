import { LogBox } from 'react-native';

let isConfigured = false;

export const configureLogBoxForDetox = isDetox => {
  if (!isDetox || isConfigured) return;

  isConfigured = true;
  LogBox.ignoreAllLogs(true);
  LogBox.clearAllLogs();
  LogBox.uninstall();
};
