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
      args[0].startsWith('fetch wrapper') ||
      args[0].startsWith('Preferred currency') ||
      args[0].startsWith('SelfTest - runSelfTest') ||
      args[0].startsWith('Wallet.create() took') ||
      args[0].startsWith('Cleared all cached currency formatters') ||
      args[0].startsWith('[UnitSwitch/Fiat]') ||
      args[0].startsWith('transactionDetail - useEffect') ||
      args[0].startsWith('[electrum]'))
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
//
// The mock supports in-memory CRUD so SDK repository operations (saveContract,
// getContracts, saveVtxos, getVtxos, etc.) round-trip correctly. Without this,
// `annotateVtxos` cannot find contracts that were just saved and throws
// "no contract matched vtxo.script" when the test wallet has live VTXOs.
jest.mock('realm', () => {
  const mockRealmStore = new Map();
  // Persisted-on-disk view: paths that have been opened at least once and not
  // yet deleted. Realm.exists / Realm.deleteFile read this rather than the
  // live (memory-cached, possibly-closed) instance map so deleteArkadeRealm
  // can realistically test the file-cleanup path.
  const mockRealmFiles = new Set();

  // Primary-key field per Realm object type. Used by create() to key the
  // in-memory store and by delete() to remove individual objects.
  const PK_FIELD = {
    ArkContract: 'script',
    ArkVtxo: 'pk',
    ArkUtxo: 'pk',
    ArkTransaction: 'pk',
    ArkWalletState: 'key',
    BoltzSwap: 'id',
    ArkSwapNotificationSuppression: 'id',
  };

  // Split a query string at a top-level separator (i.e. not inside parens/braces).
  const splitTop = (s, sep) => {
    const parts = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i <= s.length - sep.length; i++) {
      const c = s[i];
      if (c === '(' || c === '{') depth++;
      else if (c === ')' || c === '}') depth--;
      else if (depth === 0 && s.slice(i, i + sep.length) === sep) {
        parts.push(s.slice(start, i).trim());
        i += sep.length - 1;
        start = i + 1;
      }
    }
    parts.push(s.slice(start).trim());
    return parts.length > 1 ? parts : [s.trim()];
  };

  // Evaluate a Realm query expression against a plain object.
  // Handles: `field == $N`, `field IN {$0,$1,...}`, AND, OR, and parens.
  const evalExpr = (obj, expr, args) => {
    expr = expr.trim();
    // Strip matching outer parens — e.g. "(a == $0 OR a == $1)" → "a == $0 OR a == $1"
    while (expr.startsWith('(') && expr.endsWith(')')) {
      let depth = 0;
      let allWrapped = true;
      for (let i = 0; i < expr.length - 1; i++) {
        if (expr[i] === '(') depth++;
        else if (expr[i] === ')') {
          if (--depth === 0) {
            allWrapped = false;
            break;
          }
        }
      }
      if (allWrapped) expr = expr.slice(1, -1).trim();
      else break;
    }
    // AND: all sub-expressions must match
    const andParts = splitTop(expr, ' AND ');
    if (andParts.length > 1) return andParts.every(p => evalExpr(obj, p, args));
    // OR: any sub-expression must match
    const orParts = splitTop(expr, ' OR ');
    if (orParts.length > 1) return orParts.some(p => evalExpr(obj, p, args));
    // IN {$0, $1, ...} — used by BoltzSwap repository
    const inMatch = expr.match(/^(\w+)\s+IN\s+\{([^}]*)\}$/i);
    if (inMatch) {
      const field = inMatch[1];
      const values = inMatch[2].split(',').map(p => {
        const m = p.trim().match(/^\$(\d+)$/);
        return m ? args[+m[1]] : undefined;
      });
      return values.includes(obj[field]);
    }
    // field == $N
    const eqMatch = expr.match(/^(\w+)\s*==\s*\$(\d+)$/);
    if (eqMatch) return obj[eqMatch[1]] === args[+eqMatch[2]];
    return true; // unknown expression — pass through
  };

  // Build a chainable collection over an array of Realm objects.
  const makeCollection = (type, items) => {
    const arr = Array.isArray(items) ? items : [...items];
    return {
      filtered: (query, ...args) =>
        makeCollection(
          type,
          arr.filter(o => evalExpr(o, query, args)),
        ),
      sorted: (field, reverse) => {
        const sorted = [...arr].sort((a, b) => {
          if (a[field] < b[field]) return reverse ? 1 : -1;
          if (a[field] > b[field]) return reverse ? -1 : 1;
          return 0;
        });
        return makeCollection(type, sorted);
      },
      get length() {
        return arr.length;
      },
      [Symbol.iterator]: function* () {
        yield* arr;
      },
      // Internal: used by delete() to identify the backing type and items.
      _type: type,
      _items: arr,
    };
  };

  const makeRealmInstance = path => {
    let isClosed = false;
    // type → Map<primaryKey, object>
    const typeStore = new Map();

    const getStore = type => {
      if (!typeStore.has(type)) typeStore.set(type, new Map());
      return typeStore.get(type);
    };

    return {
      path,
      get isClosed() {
        return isClosed;
      },

      create(type, data) {
        const store = getStore(type);
        const pkField = PK_FIELD[type];
        const pk = pkField !== undefined ? data[pkField] : JSON.stringify(data);
        // Shallow-copy so later mutations to the caller's object don't affect
        // what the store holds. Attach a non-enumerable tag for delete().
        const stored = Object.defineProperty({ ...data }, '_realmMeta', {
          value: { type, pk },
          enumerable: false,
        });
        store.set(pk, stored);
      },

      delete(target) {
        if (!target) return;
        // Single object returned by objectForPrimaryKey (has _realmMeta)
        if (target._realmMeta) {
          const { type, pk } = target._realmMeta;
          getStore(type).delete(pk);
          return;
        }
        // Collection returned by objects() / filtered()
        if (target._type !== undefined && target._items !== undefined) {
          const store = getStore(target._type);
          const pkField = PK_FIELD[target._type];
          for (const item of target._items) {
            const pk = pkField !== undefined ? item[pkField] : undefined;
            if (pk !== undefined) store.delete(pk);
          }
        }
      },

      write(transactionFn) {
        if (typeof transactionFn === 'function') transactionFn();
      },

      objectForPrimaryKey(type, pk) {
        return getStore(type).get(pk) ?? null;
      },

      objects(type) {
        return makeCollection(type, getStore(type).values());
      },

      close() {
        isClosed = true;
      },

      addListener: jest.fn(),
      removeAllListeners: jest.fn(),

      // Exposed so __mockRealmHelpers.reset() can wipe data in open instances.
      _clearData: () => typeStore.clear(),
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
        // Clear data inside any open instances so tests don't leak state
        // through instances cached in the app module's realmInstances map.
        for (const inst of mockRealmStore.values()) {
          if (typeof inst._clearData === 'function') inst._clearData();
        }
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
