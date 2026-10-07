import { DeviceEventEmitter } from 'react-native';

import { AvailableLanguages } from './languages';
import { resolveLangCodeFromRnLocales, RnLocale } from './resolveDeviceLangCode';

export const DEVICE_LOCALE_FINGERPRINT_KEY = 'langDeviceLocaleFingerprint';
export const LANGUAGE_CHANGED_EVENT = 'locLanguageChanged';

export const LANG_USER_OVERRIDE_KEY = 'langUserOverride';
export const STORAGE_KEY = 'lang';

/** Resolved LangCode for the device preferred locale (stable across region tag churn). */
export const fingerprintFromLocales = (locales: readonly RnLocale[]): string => resolveLangCodeFromRnLocales(locales);

/** Pre–locale-mapping cold-start autodetect (exact `languageCode` === LangCode, else `en`). */
export const legacyAutodetectLangCode = (locales: readonly RnLocale[]): string => {
  const detected = locales[0]?.languageCode;
  if (detected && AvailableLanguages.some(language => language.value === detected)) {
    return detected;
  }
  return 'en';
};

export const LANGUAGE_RTL_RESTART_EVENT = 'locLanguageRtlRestartNeeded';

export const notifyRtlRestartNeeded = (): void => {
  DeviceEventEmitter.emit(LANGUAGE_RTL_RESTART_EVENT);
};

const catalogIsRtl = (lang: string): boolean => AvailableLanguages.find(language => language.value === lang)?.isRTL ?? false;

/** `I18nManager.isRTL` is a boolean; the native bridge has also surfaced 0/1. */
export const layoutDirectionIsRtl = (value: unknown): boolean => value === true || value === 1;

/**
 * Alert when this process's layout direction does not match the catalog (automatic
 * and manual applies), or when a manual pick crosses the RTL/LTR catalog boundary.
 */
export const shouldNotifyRtlLanguageRestart = (params: {
  previousLang: string | null;
  newLang: string;
  userSelected?: boolean;
  currentLayoutRtl?: boolean;
}): boolean => {
  const newRtl = catalogIsRtl(params.newLang);
  if (params.currentLayoutRtl !== undefined && params.currentLayoutRtl !== newRtl) {
    return true;
  }
  if (!params.userSelected || params.previousLang === null) {
    return false;
  }
  return catalogIsRtl(params.previousLang) !== newRtl;
};

export type LaunchLanguageDecision = { action: 'apply_device'; clearOverride: boolean } | { action: 'apply_stored'; clearOverride: false };

export const decideLaunchLanguage = (params: {
  userOverride: boolean;
  storedLang: string | null;
  persistedFingerprint: string | null;
  currentFingerprint: string;
  legacyAutodetect: string;
}): LaunchLanguageDecision => {
  const { userOverride, storedLang, persistedFingerprint, currentFingerprint, legacyAutodetect } = params;

  if (persistedFingerprint !== null && persistedFingerprint !== currentFingerprint) {
    return { action: 'apply_device', clearOverride: true };
  }

  if (userOverride && storedLang) {
    return { action: 'apply_stored', clearOverride: false };
  }

  if (persistedFingerprint === null && storedLang && storedLang !== legacyAutodetect) {
    return { action: 'apply_stored', clearOverride: false };
  }

  return { action: 'apply_device', clearOverride: false };
};

/** Resume should re-run bootstrap when the cold-start decision would change language or fingerprint. */
export const resumeShouldReapplyLanguage = (params: {
  userOverride: boolean;
  storedLang: string | null;
  persistedFingerprint: string | null;
  currentFingerprint: string;
  legacyAutodetect: string;
}): boolean => {
  const decision = decideLaunchLanguage(params);
  const desiredLang = decision.action === 'apply_device' ? params.currentFingerprint : (params.storedLang ?? 'en');
  return !(params.persistedFingerprint === params.currentFingerprint && params.storedLang === desiredLang && !decision.clearOverride);
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

  const legacyAutodetect = legacyAutodetectLangCode(locales);
  const decision = decideLaunchLanguage({
    userOverride,
    storedLang: stored,
    persistedFingerprint,
    currentFingerprint,
    legacyAutodetect,
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

  await deps.applyLanguage(lang);

  if (persistedFingerprint === null && stored && !userOverride && stored !== legacyAutodetect) {
    await deps.setItem(LANG_USER_OVERRIDE_KEY, '1');
  }

  await deps.setItem(DEVICE_LOCALE_FINGERPRINT_KEY, currentFingerprint);

  return { lang, fingerprint: currentFingerprint };
};
