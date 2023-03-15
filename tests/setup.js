/* global jest */

import mockClipboard from '@react-native-clipboard/clipboard/jest/clipboard-mock.js';

const consoleWarnOrig = console.warn;
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0]?.startsWith('WARNING: Sending to a future segwit version address can lead to loss of funds') ||
      args[0]?.startsWith('only compressed public keys are good'))
  ) {
    return;
  }
  consoleWarnOrig.apply(consoleWarnOrig, args);
};

const consoleLogOrig = console.log;
console.log = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0]?.startsWith('updating exchange rate') ||
      args[0]?.startsWith('begin connection') ||
      args[0]?.startsWith('TLS Connected to') ||
      args[0]?.startsWith('connected to'))
  ) {
    return;
  }
  consoleLogOrig.apply(consoleLogOrig, args);
};

global.net = require('net'); // needed by Electrum client. For RN it is proviced in shim.js
global.tls = require('tls'); // needed by Electrum client. For RN it is proviced in shim.js
global.fetch = require('node-fetch');

jest.mock('@react-native-clipboard/clipboard', () => mockClipboard);

jest.mock('react-native-watch-connectivity', () => {
  return {
    getIsWatchAppInstalled: jest.fn(() => Promise.resolve(false)),
    subscribeToMessages: jest.fn(),
    updateApplicationContext: jest.fn(),
  };
});

jest.mock('react-native-secure-key-store', () => {
  return {};
});

jest.mock('@react-native-community/push-notification-ios', () => {
  return {};
});

jest.mock('react-native-device-info', () => {
  return {
    getUniqueId: jest.fn().mockReturnValue('uniqueId'),
    getSystemName: jest.fn(),
    getDeviceType: jest.fn().mockReturnValue(false),
    hasGmsSync: jest.fn().mockReturnValue(true),
    hasHmsSync: jest.fn().mockReturnValue(false),
  };
});

jest.mock('react-native-quick-actions', () => {
  return {
    clearShortcutItems: jest.fn(),
    setQuickActions: jest.fn(),
    isSupported: jest.fn(),
  };
});

jest.mock('react-native-default-preference', () => {
  return {
    setName: jest.fn(),
    set: jest.fn(),
  };
});

jest.mock('react-native-fs', () => {
  return {
    mkdir: jest.fn(),
    moveFile: jest.fn(),
    copyFile: jest.fn(),
    pathForBundle: jest.fn(),
    pathForGroup: jest.fn(),
    getFSInfo: jest.fn(),
    getAllExternalFilesDirs: jest.fn(),
    unlink: jest.fn(),
    exists: jest.fn(),
    stopDownload: jest.fn(),
    resumeDownload: jest.fn(),
    isResumable: jest.fn(),
    stopUpload: jest.fn(),
    completeHandlerIOS: jest.fn(),
    readDir: jest.fn(),
    readDirAssets: jest.fn(),
    existsAssets: jest.fn(),
    readdir: jest.fn(),
    setReadable: jest.fn(),
    stat: jest.fn(),
    readFile: jest.fn(),
    read: jest.fn(),
    readFileAssets: jest.fn(),
    hash: jest.fn(),
    copyFileAssets: jest.fn(),
    copyFileAssetsIOS: jest.fn(),
    copyAssetsVideoIOS: jest.fn(),
    writeFile: jest.fn(),
    appendFile: jest.fn(),
    write: jest.fn(),
    downloadFile: jest.fn(),
    uploadFiles: jest.fn(),
    touch: jest.fn(),
    MainBundlePath: jest.fn(),
    CachesDirectoryPath: jest.fn(),
    DocumentDirectoryPath: jest.fn(),
    ExternalDirectoryPath: jest.fn(),
    ExternalStorageDirectoryPath: jest.fn(),
    TemporaryDirectoryPath: jest.fn(),
    LibraryDirectoryPath: jest.fn(),
    PicturesDirectoryPath: jest.fn(),
  };
});

jest.mock('react-native-document-picker', () => ({}));

jest.mock('react-native-haptic-feedback', () => ({}));

jest.mock('rn-ldk/lib/module', () => ({}));
jest.mock('rn-ldk/src/index', () => ({}));

const realmInstanceMock = {
  close: function () {},
  write: function () {},
  objectForPrimaryKey: function () {
    return {};
  },
  objects: function () {
    const wallets = {
      filtered: function () {
        return [];
      },
    };
    return wallets;
  },
};
jest.mock('realm', () => {
  return {
    open: jest.fn(() => realmInstanceMock),
  };
});

jest.mock('react-native-idle-timer', () => {
  return {
    setIdleTimerDisabled: jest.fn(),
  };
});

jest.mock('react-native-haptic-feedback', () => {
  return {
    trigger: jest.fn(),
  };
});

jest.mock('../blue_modules/analytics', () => {
  const ret = jest.fn();
  ret.ENUM = { CREATED_WALLET: '' };
  return ret;
});

jest.mock('react-native-share', () => {
  return {
    open: jest.fn(),
  };
});

jest.mock('../blue_modules/WidgetCommunication', () => {
  return {
    reloadAllTimelines: jest.fn(),
  };
});

const keychainMock = {
  SECURITY_LEVEL_ANY: 'MOCK_SECURITY_LEVEL_ANY',
  SECURITY_LEVEL_SECURE_SOFTWARE: 'MOCK_SECURITY_LEVEL_SECURE_SOFTWARE',
  SECURITY_LEVEL_SECURE_HARDWARE: 'MOCK_SECURITY_LEVEL_SECURE_HARDWARE',
  setGenericPassword: jest.fn().mockResolvedValue(),
  getGenericPassword: jest.fn().mockResolvedValue(),
  resetGenericPassword: jest.fn().mockResolvedValue(),
};
jest.mock('react-native-keychain', () => keychainMock);

global.alert = () => {};
