import { DeviceEventEmitter } from 'react-native';

import { resolveLangCodeFromRnLocales, RnLocale } from './resolveDeviceLangCode';

export const DEVICE_LOCALE_FINGERPRINT_KEY = 'langDeviceLocaleFingerprint';
export const LANGUAGE_CHANGED_EVENT = 'locLanguageChanged';

export const LANG_USER_OVERRIDE_KEY = 'langUserOverride';
export const STORAGE_KEY = 'lang';

export const fingerprintFromLocales = (locales: readonly RnLocale[]): string =>
  locales.map(locale => locale.languageTag ?? locale.languageCode).join('|');

export type LaunchLanguageDecision = { action: 'apply_device'; clearOverride: boolean } | { action: 'apply_stored'; clearOverride: false };

export const decideLaunchLanguage = (params: {
  userOverride: boolean;
  storedLang: string | null;
  persistedFingerprint: string | null;
  currentFingerprint: string;
}): LaunchLanguageDecision => {
  const { userOverride, storedLang, persistedFingerprint, currentFingerprint } = params;

  if (persistedFingerprint !== null && persistedFingerprint !== currentFingerprint) {
    return { action: 'apply_device', clearOverride: true };
  }

  if (userOverride && storedLang) {
    return { action: 'apply_stored', clearOverride: false };
  }

  return { action: 'apply_device', clearOverride: false };
};

export const notifyLanguageChanged = (lang: string): void => {
  DeviceEventEmitter.emit(LANGUAGE_CHANGED_EVENT, lang);
};

export const executeLanguageBootstrap = async (deps: {
  getLocales: () => readonly RnLocale[];
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  applyLanguage: (lang: string) => Promise<void>;
}): Promise<{ lang: string; fingerprint: string }> => {
  const locales = deps.getLocales();
  const currentFingerprint = fingerprintFromLocales(locales);
  const persistedFingerprint = await deps.getItem(DEVICE_LOCALE_FINGERPRINT_KEY);
  const userOverride = (await deps.getItem(LANG_USER_OVERRIDE_KEY)) === '1';
  const stored = await deps.getItem(STORAGE_KEY);

  const decision = decideLaunchLanguage({
    userOverride,
    storedLang: stored,
    persistedFingerprint,
    currentFingerprint,
  });

  let lang: string;
  if (decision.action === 'apply_device') {
    lang = resolveLangCodeFromRnLocales(locales);
    if (decision.clearOverride) {
      await deps.removeItem(LANG_USER_OVERRIDE_KEY);
    }
  } else {
    lang = stored ?? 'en';
  }

  await deps.setItem(DEVICE_LOCALE_FINGERPRINT_KEY, currentFingerprint);
  await deps.applyLanguage(lang);

  return { lang, fingerprint: currentFingerprint };
};
