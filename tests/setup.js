/* global jest */

import mockClipboard from '@react-native-clipboard/clipboard/jest/clipboard-mock.js';

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

jest.mock('@sentry/react-native', () => {
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

jest.mock('react-native-gesture-handler', () => jest.requireActual('react-native-gesture-handler/__mocks__/RNGestureHandlerModule.js'));

jest.mock('react-native-document-picker', () => ({}));

jest.mock('react-native-haptic-feedback', () => ({}));

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

jest.mock('react-native-widget-center', () => {
  return {
    reloadAllTimelines: jest.fn(),
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
