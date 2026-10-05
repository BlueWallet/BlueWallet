import assert from 'assert';

import {
  decideLaunchLanguage,
  DEVICE_LOCALE_FINGERPRINT_KEY,
  executeLanguageBootstrap,
  fingerprintFromLocales,
  LANG_USER_OVERRIDE_KEY,
  STORAGE_KEY,
} from '../../loc/languageSync';

const makeStorage = (initial = {}) => {
  const store = { ...initial };
  return {
    getItem: async key => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
    setItem: async (key, value) => {
      store[key] = value;
    },
    removeItem: async key => {
      delete store[key];
    },
    snapshot: () => ({ ...store }),
  };
};

describe('decideLaunchLanguage', () => {
  it('applies device language when persisted LangCode fingerprint differs (iOS Settings relaunch)', () => {
    assert.deepStrictEqual(
      decideLaunchLanguage({
        userOverride: true,
        storedLang: 'fr_fr',
        persistedFingerprint: 'en',
        currentFingerprint: 'de_de',
        legacyAutodetect: 'en',
      }),
      { action: 'apply_device', clearOverride: true },
    );
  });

  it('keeps in-app override when fingerprint is unchanged', () => {
    assert.deepStrictEqual(
      decideLaunchLanguage({
        userOverride: true,
        storedLang: 'fr_fr',
        persistedFingerprint: 'en',
        currentFingerprint: 'en',
        legacyAutodetect: 'en',
      }),
      { action: 'apply_stored', clearOverride: false },
    );
  });

  it('keeps override on first launch after upgrade and only records fingerprint', () => {
    assert.deepStrictEqual(
      decideLaunchLanguage({
        userOverride: true,
        storedLang: 'fr_fr',
        persistedFingerprint: null,
        currentFingerprint: 'en',
        legacyAutodetect: 'en',
      }),
      { action: 'apply_stored', clearOverride: false },
    );
  });

  it('keeps pre-upgrade in-app language when it differed from legacy autodetect', () => {
    assert.deepStrictEqual(
      decideLaunchLanguage({
        userOverride: false,
        storedLang: 'fr_fr',
        persistedFingerprint: null,
        currentFingerprint: 'en',
        legacyAutodetect: 'en',
      }),
      { action: 'apply_stored', clearOverride: false },
    );
  });

  it('applies mapped device language when stored en matches legacy autodetect on upgrade', () => {
    assert.deepStrictEqual(
      decideLaunchLanguage({
        userOverride: false,
        storedLang: 'en',
        persistedFingerprint: null,
        currentFingerprint: 'de_de',
        legacyAutodetect: 'en',
      }),
      { action: 'apply_device', clearOverride: false },
    );
  });
});

describe('executeLanguageBootstrap', () => {
  it('cold start after iOS language change clears override and applies device LangCode', async () => {
    const storage = makeStorage({
      [STORAGE_KEY]: 'fr_fr',
      [LANG_USER_OVERRIDE_KEY]: '1',
      [DEVICE_LOCALE_FINGERPRINT_KEY]: 'en',
    });
    let applied;
    const result = await executeLanguageBootstrap({
      getLocales: () => [{ languageCode: 'de', languageTag: 'de-DE' }],
      getItem: storage.getItem,
      setItem: storage.setItem,
      removeItem: storage.removeItem,
      applyLanguage: async lang => {
        applied = lang;
      },
    });

    assert.strictEqual(applied, 'de_de');
    assert.strictEqual(result.lang, 'de_de');
    assert.strictEqual(result.fingerprint, 'de_de');
    const snap = storage.snapshot();
    assert.strictEqual(snap[DEVICE_LOCALE_FINGERPRINT_KEY], 'de_de');
    assert.strictEqual(snap[LANG_USER_OVERRIDE_KEY], undefined);
  });

  it('cold start with unchanged fingerprint keeps override language', async () => {
    const storage = makeStorage({
      [STORAGE_KEY]: 'fr_fr',
      [LANG_USER_OVERRIDE_KEY]: '1',
      [DEVICE_LOCALE_FINGERPRINT_KEY]: 'en',
    });
    let applied;
    await executeLanguageBootstrap({
      getLocales: () => [{ languageCode: 'en', languageTag: 'en-US' }],
      getItem: storage.getItem,
      setItem: storage.setItem,
      removeItem: storage.removeItem,
      applyLanguage: async lang => {
        applied = lang;
      },
    });

    assert.strictEqual(applied, 'fr_fr');
    assert.strictEqual(storage.snapshot()[LANG_USER_OVERRIDE_KEY], '1');
  });

  it('retroactively sets langUserOverride on upgrade when stored language was an in-app choice', async () => {
    const storage = makeStorage({
      [STORAGE_KEY]: 'fr_fr',
    });
    await executeLanguageBootstrap({
      getLocales: () => [{ languageCode: 'en', languageTag: 'en-US' }],
      getItem: storage.getItem,
      setItem: storage.setItem,
      removeItem: storage.removeItem,
      applyLanguage: async () => {},
    });
    assert.strictEqual(storage.snapshot()[LANG_USER_OVERRIDE_KEY], '1');
    assert.strictEqual(storage.snapshot()[DEVICE_LOCALE_FINGERPRINT_KEY], 'en');
  });

  it('upgrade with stored en on a German device applies de_de without override', async () => {
    const storage = makeStorage({
      [STORAGE_KEY]: 'en',
    });
    let applied;
    await executeLanguageBootstrap({
      getLocales: () => [{ languageCode: 'de', languageTag: 'de-DE' }],
      getItem: storage.getItem,
      setItem: storage.setItem,
      removeItem: storage.removeItem,
      applyLanguage: async lang => {
        applied = lang;
      },
    });
    assert.strictEqual(applied, 'de_de');
    assert.strictEqual(storage.snapshot()[LANG_USER_OVERRIDE_KEY], undefined);
  });

  it('persists fingerprint only after applyLanguage succeeds', async () => {
    const storage = makeStorage();
    const order = [];
    await executeLanguageBootstrap({
      getLocales: () => [{ languageCode: 'de', languageTag: 'de-DE' }],
      getItem: storage.getItem,
      setItem: async (key, value) => {
        order.push(['set', key]);
        return storage.setItem(key, value);
      },
      removeItem: storage.removeItem,
      applyLanguage: async () => {
        order.push(['apply']);
      },
    });
    assert.deepStrictEqual(order, [['apply'], ['set', DEVICE_LOCALE_FINGERPRINT_KEY]]);
  });

  it('first launch after upgrade records fingerprint without clearing override', async () => {
    const storage = makeStorage({
      [STORAGE_KEY]: 'fr_fr',
      [LANG_USER_OVERRIDE_KEY]: '1',
    });
    let applied;
    await executeLanguageBootstrap({
      getLocales: () => [{ languageCode: 'en', languageTag: 'en-US' }],
      getItem: storage.getItem,
      setItem: storage.setItem,
      removeItem: storage.removeItem,
      applyLanguage: async lang => {
        applied = lang;
      },
    });

    assert.strictEqual(applied, 'fr_fr');
    const snap = storage.snapshot();
    assert.strictEqual(snap[LANG_USER_OVERRIDE_KEY], '1');
    assert.strictEqual(snap[DEVICE_LOCALE_FINGERPRINT_KEY], 'en');
  });
});

describe('fingerprintFromLocales', () => {
  it('stores resolved LangCode, not raw region tags', () => {
    assert.strictEqual(fingerprintFromLocales([{ languageCode: 'en', languageTag: 'en-US' }]), 'en');
    assert.strictEqual(fingerprintFromLocales([{ languageCode: 'de', languageTag: 'de-DE' }]), 'de_de');
    assert.strictEqual(
      fingerprintFromLocales([
        { languageCode: 'en', languageTag: 'en-US' },
        { languageCode: 'de', languageTag: 'de-DE' },
      ]),
      'en',
    );
  });
});
