/* global jest */

import mockClipboard from '@react-native-clipboard/clipboard/jest/clipboard-mock.js';

const consoleWarnOrig = console.warn;
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].startsWith('WARNING: Sending to a future segwit version address can lead to loss of funds') ||
      args[0].startsWith('only compressed public keys are good'))
  ) {
    return;
  }
  consoleWarnOrig.apply(consoleWarnOrig, args);
};

const consoleLogOrig = console.log;
console.debug = console.log = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].startsWith('updating exchange rate') ||
      args[0].startsWith('Created new currency formatter for') ||
      args[0].startsWith('begin connection') ||
      args[0].startsWith('TLS Connected to') ||
      args[0].startsWith('connected to'))
  ) {
    return;
  }
  consoleLogOrig.apply(consoleLogOrig, args);
};

global.net = require('net'); // needed by Electrum client. For RN it is proviced in shim.js
global.tls = require('tls'); // needed by Electrum client. For RN it is proviced in shim.js
global.fetch = require('node-fetch');

jest.mock('@react-native-clipboard/clipboard', () => mockClipboard);

// Workaround for software-mansion/react-native-reanimated#8806.
// Fixed upstream in reanimated 4.3.0; remove once we upgrade.
// Path is held in a variable so tsc does not statically resolve into worklets'
// src/*.ts (which has its own type errors) under allowJs.
const workletsMockPath = 'react-native-worklets/src/mock';
jest.mock('react-native-worklets', () => require(workletsMockPath));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('react-native-capture-protection', () => ({
  CaptureProtection: {
    prevent: jest.fn(),
    allow: jest.fn(),
    isScreenRecording: jest.fn(() => Promise.resolve(false)),
  },
}));

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

jest.mock('react-native-notifications', () => {
  return {};
});

jest.mock('react-native-background-fetch', () => {
  // The real module instantiates `new NativeEventEmitter(...)` at module
  // load, which throws under jest because the underlying native module is
  // null. Test files that don't drive scheduler behavior (i.e. anything
  // that transitively imports `blue_modules/arkade-background`) just need a
  // safe default. Tests that exercise registration/run paths jest.mock this
  // module locally with their own factory.
  const noop = jest.fn();
  const noopAsync = jest.fn().mockResolvedValue(undefined);
  const stub = {
    configure: noopAsync,
    start: noopAsync,
    stop: jest.fn().mockResolvedValue(true),
    finish: noop,
    scheduleTask: noopAsync,
    registerHeadlessTask: noop,
    STATUS_RESTRICTED: 0,
    STATUS_DENIED: 1,
    STATUS_AVAILABLE: 2,
    NETWORK_TYPE_NONE: 0,
    NETWORK_TYPE_ANY: 1,
    NETWORK_TYPE_CELLULAR: 2,
    NETWORK_TYPE_UNMETERED: 3,
    NETWORK_TYPE_NOT_ROAMING: 4,
  };
  return { __esModule: true, default: stub, ...stub };
});

jest.mock('react-native-permissions', () => require('react-native-permissions/mock'));

jest.mock('react-native-device-info', () => {
  return {
    getUniqueId: jest.fn().mockReturnValue('uniqueId'),
    getSystemName: jest.fn(),
    getDeviceType: jest.fn().mockReturnValue(false),
    hasGmsSync: jest.fn().mockReturnValue(true),
    hasHmsSync: jest.fn().mockReturnValue(false),
    isTablet: jest.fn().mockReturnValue(false),
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
  let mockPreferences = {};
  let currentSuiteName = 'default';

  const getSuite = name => {
    if (!mockPreferences[name]) {
      mockPreferences[name] = {};
    }
    return mockPreferences[name];
  };

  return {
    setName: jest.fn(name => {
      currentSuiteName = name;
      if (!mockPreferences[name]) {
        mockPreferences[name] = {};
      }
      return Promise.resolve();
    }),

    getName: jest.fn(() => {
      return Promise.resolve(currentSuiteName);
    }),

    get: jest.fn(key => {
      const suite = getSuite(currentSuiteName);
      return Promise.resolve(Object.prototype.hasOwnProperty.call(suite, key) ? suite[key] : null);
    }),

    set: jest.fn((key, value) => {
      const suite = getSuite(currentSuiteName);
      suite[key] = value;
      return Promise.resolve();
    }),

    clear: jest.fn(key => {
      const suite = getSuite(currentSuiteName);
      delete suite[key];
      return Promise.resolve();
    }),

    getMultiple: jest.fn(keys => {
      const suite = getSuite(currentSuiteName);
      const values = keys.map(key => (Object.prototype.hasOwnProperty.call(suite, key) ? suite[key] : null));
      return Promise.resolve(values);
    }),

    setMultiple: jest.fn(keyValuePairs => {
      const suite = getSuite(currentSuiteName);
      Object.entries(keyValuePairs).forEach(([key, value]) => {
        suite[key] = value;
      });
      return Promise.resolve();
    }),

    clearMultiple: jest.fn(keys => {
      const suite = getSuite(currentSuiteName);
      keys.forEach(key => delete suite[key]);
      return Promise.resolve();
    }),

    getAll: jest.fn(() => {
      const suite = getSuite(currentSuiteName);
      return Promise.resolve({ ...suite });
    }),

    clearAll: jest.fn(() => {
      mockPreferences[currentSuiteName] = {};
      return Promise.resolve();
    }),

    reset: jest.fn(() => {
      mockPreferences = {};
      currentSuiteName = 'default'; // Reset the current suite name
      return Promise.resolve();
    }),
  };
});

jest.mock('react-native-fs', () => {
  // Track existence per absolute path so the Arkade Realm adapter's
  // ensureArkadeDir() / unlink() round trips behave coherently in tests.
  const mockFsExisting = new Set();
  const setExists = p => mockFsExisting.add(p);
  const clearExists = p => mockFsExisting.delete(p);

  return {
    mkdir: jest.fn(async p => {
      setExists(p);
    }),
    moveFile: jest.fn(),
    copyFile: jest.fn(),
    pathForBundle: jest.fn(),
    pathForGroup: jest.fn(),
    getFSInfo: jest.fn(),
    getAllExternalFilesDirs: jest.fn(),
    unlink: jest.fn(async p => {
      clearExists(p);
    }),
    exists: jest.fn(async p => mockFsExisting.has(p)),
    stopDownload: jest.fn(),
    resumeDownload: jest.fn(),
    isResumable: jest.fn(),
    stopUpload: jest.fn(),
    completeHandlerIOS: jest.fn(),
    readDir: jest.fn(async () => []),
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
    MainBundlePath: '/mock/MainBundle',
    CachesDirectoryPath: '/mock/Caches',
    DocumentDirectoryPath: '/mock/Documents',
    ExternalDirectoryPath: '/mock/External',
    ExternalStorageDirectoryPath: '/mock/ExternalStorage',
    TemporaryDirectoryPath: '/mock/Temporary',
    LibraryDirectoryPath: '/mock/Library',
    PicturesDirectoryPath: '/mock/Pictures',
    __mockFsHelpers: { setExists, clearExists, reset: () => mockFsExisting.clear() },
  };
});

jest.mock('@react-native-documents/picker', () => ({}));

jest.mock('react-native-haptic-feedback', () => ({}));

// Per-path Realm mock so the Arkade Realm adapter (one encrypted file per Ark wallet)
// can be exercised in unit tests. Each `Realm.open({ path })` returns a stable
// instance for that path until it is closed or deleted; concurrent opens for the
// same path observe the same instance.
jest.mock('realm', () => {
  const mockRealmStore = new Map();
  // Persisted-on-disk view: paths that have been opened at least once and not
  // yet deleted. Realm.exists / Realm.deleteFile read this rather than the
  // live (memory-cached, possibly-closed) instance map so deleteArkadeRealm
  // can realistically test the file-cleanup path.
  const mockRealmFiles = new Set();
  const makeRealmInstance = path => {
    let isClosed = false;
    return {
      path,
      get isClosed() {
        return isClosed;
      },
      create: function () {},
      delete: function () {},
      write: function (transactionFn) {
        if (typeof transactionFn === 'function') {
          transactionFn();
        }
      },
      objectForPrimaryKey: function () {
        return {};
      },
      objects: function () {
        return {
          filtered: function () {
            return [];
          },
          length: 0,
          [Symbol.iterator]: function* () {},
        };
      },
      close: function () {
        isClosed = true;
      },
      addListener: jest.fn(),
      removeAllListeners: jest.fn(),
    };
  };
  return {
    UpdateMode: { Modified: 1 },
    open: jest.fn(async config => {
      const path = (config && config.path) || '__default__';
      const existing = mockRealmStore.get(path);
      if (existing && !existing.isClosed) return existing;
      const inst = makeRealmInstance(path);
      mockRealmStore.set(path, inst);
      mockRealmFiles.add(path);
      return inst;
    }),
    // Real Realm.exists / Realm.deleteFile are synchronous in this version.
    exists: jest.fn(arg => {
      const path = typeof arg === 'string' ? arg : (arg && arg.path) || '__default__';
      return mockRealmFiles.has(path);
    }),
    deleteFile: jest.fn(config => {
      const path = (config && config.path) || '__default__';
      mockRealmStore.delete(path);
      mockRealmFiles.delete(path);
    }),
    __mockRealmHelpers: {
      reset: () => {
        mockRealmStore.clear();
        mockRealmFiles.clear();
      },
      store: mockRealmStore,
      files: mockRealmFiles,
    },
  };
});

jest.mock('react-native-camera-kit-no-google', () => ({
  detectQRCodeInImage: jest.fn(base64 => {
    if (base64 === 'invalid-image') {
      return Promise.reject(new Error('Invalid image data'));
    }
    return Promise.resolve('mocked-qr-code');
  }),
}));

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

// Service-keyed Keychain mock so Arkade adapter tests can exercise the per-wallet
// encryption-key lifecycle (load-or-create, then read on subsequent open). Defined
// inside the factory because Jest hoists `jest.mock` above module scope and refuses
// out-of-scope captures (only names matching /mock/i are allowed through).
jest.mock('react-native-keychain', () => {
  const mockKeychainCreds = new Map();
  return {
    SECURITY_LEVEL_ANY: 'MOCK_SECURITY_LEVEL_ANY',
    SECURITY_LEVEL_SECURE_SOFTWARE: 'MOCK_SECURITY_LEVEL_SECURE_SOFTWARE',
    SECURITY_LEVEL_SECURE_HARDWARE: 'MOCK_SECURITY_LEVEL_SECURE_HARDWARE',
    ACCESSIBLE: {
      WHEN_UNLOCKED: 'AccessibleWhenUnlocked',
      AFTER_FIRST_UNLOCK: 'AccessibleAfterFirstUnlock',
      ALWAYS: 'AccessibleAlways',
      WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: 'AccessibleWhenPasscodeSetThisDeviceOnly',
      WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'AccessibleWhenUnlockedThisDeviceOnly',
      AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AccessibleAfterFirstUnlockThisDeviceOnly',
    },
    SECURITY_LEVEL: {
      SECURE_SOFTWARE: 'SECURE_SOFTWARE',
      SECURE_HARDWARE: 'SECURE_HARDWARE',
      ANY: 'ANY',
    },
    setGenericPassword: jest.fn(async (username, password, options) => {
      const svc = (options && options.service) || '__default__';
      mockKeychainCreds.set(svc, { username, password, service: svc });
      return true;
    }),
    getGenericPassword: jest.fn(async options => {
      const svc = (options && options.service) || '__default__';
      return mockKeychainCreds.get(svc) || false;
    }),
    resetGenericPassword: jest.fn(async options => {
      const svc = (options && options.service) || '__default__';
      return mockKeychainCreds.delete(svc);
    }),
    // Default to the strongest level so the adapter's preflight selects
    // SECURE_HARDWARE in the happy path. Tests override per-case via
    // mockResolvedValueOnce when they need a downgrade scenario.
    getSecurityLevel: jest.fn(async () => 'SECURE_HARDWARE'),
    __mockKeychainHelpers: { reset: () => mockKeychainCreds.clear(), store: mockKeychainCreds },
  };
});

// Historic copy-paste: react-native-tcp-socket pulled the Keychain mock. Keep the
// same surface so existing tests continue to mount, just with a fresh map.
jest.mock('react-native-tcp-socket', () => {
  return {
    SECURITY_LEVEL_ANY: 'MOCK_SECURITY_LEVEL_ANY',
    SECURITY_LEVEL_SECURE_SOFTWARE: 'MOCK_SECURITY_LEVEL_SECURE_SOFTWARE',
    SECURITY_LEVEL_SECURE_HARDWARE: 'MOCK_SECURITY_LEVEL_SECURE_HARDWARE',
    setGenericPassword: jest.fn().mockResolvedValue(true),
    getGenericPassword: jest.fn().mockResolvedValue(false),
    resetGenericPassword: jest.fn().mockResolvedValue(true),
  };
});

global.alert = () => {};
