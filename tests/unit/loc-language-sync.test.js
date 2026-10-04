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
  it('applies device language when persisted fingerprint differs (iOS Settings relaunch)', () => {
    assert.deepStrictEqual(
      decideLaunchLanguage({
        userOverride: true,
        storedLang: 'fr_fr',
        persistedFingerprint: 'en-US',
        currentFingerprint: 'de-DE',
      }),
      { action: 'apply_device', clearOverride: true },
    );
  });

  it('keeps in-app override when fingerprint is unchanged', () => {
    assert.deepStrictEqual(
      decideLaunchLanguage({
        userOverride: true,
        storedLang: 'fr_fr',
        persistedFingerprint: 'en-US',
        currentFingerprint: 'en-US',
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
        currentFingerprint: 'en-US',
      }),
      { action: 'apply_stored', clearOverride: false },
    );
  });
});

describe('executeLanguageBootstrap', () => {
  it('cold start after iOS language change clears override and applies device LangCode', async () => {
    const storage = makeStorage({
      [STORAGE_KEY]: 'fr_fr',
      [LANG_USER_OVERRIDE_KEY]: '1',
      [DEVICE_LOCALE_FINGERPRINT_KEY]: 'en-US',
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
    assert.strictEqual(result.fingerprint, 'de-DE');
    const snap = storage.snapshot();
    assert.strictEqual(snap[STORAGE_KEY], 'fr_fr');
    assert.strictEqual(snap[DEVICE_LOCALE_FINGERPRINT_KEY], 'de-DE');
    assert.strictEqual(snap[LANG_USER_OVERRIDE_KEY], undefined);
  });

  it('cold start with unchanged fingerprint keeps override language', async () => {
    const storage = makeStorage({
      [STORAGE_KEY]: 'fr_fr',
      [LANG_USER_OVERRIDE_KEY]: '1',
      [DEVICE_LOCALE_FINGERPRINT_KEY]: 'en-US',
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
    assert.strictEqual(snap[DEVICE_LOCALE_FINGERPRINT_KEY], 'en-US');
  });
});

describe('fingerprintFromLocales', () => {
  it('joins language tags in order', () => {
    assert.strictEqual(
      fingerprintFromLocales([
        { languageCode: 'en', languageTag: 'en-US' },
        { languageCode: 'de', languageTag: 'de-DE' },
      ]),
      'en-US|de-DE',
    );
  });
});
