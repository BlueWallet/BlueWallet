import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { useAsyncStorage } from '@react-native-async-storage/async-storage';
import { FiatUnit, TFiatUnit } from '../../models/fiatUnit';
import { getPreferredCurrency, initCurrencyDaemon } from '../../blue_modules/currency';
import { BlueApp } from '../../class';
import presentAlert from '../Alert';
import { STORAGE_KEY, saveLanguage } from '../../loc';
import { useStorage } from '../../blue_modules/storage-context';
import { isBalanceDisplayAllowed, setBalanceDisplayAllowed } from '../WidgetCommunication';
import { clearUseURv1, isURv1Enabled, setUseURv1 } from '../../blue_modules/ur';
import BlueClipboard from '../../blue_modules/clipboard';
import DeviceQuickActions from '../../class/quick-actions';

interface SettingsContextType {
  preferredFiatCurrency: TFiatUnit;
  setPreferredFiatCurrencyStorage: (currency: TFiatUnit) => Promise<void>;
  language: string | undefined;
  setLanguageStorage: (language: string) => Promise<void>;
  isHandOffUseEnabled: boolean;
  setIsHandOffUseEnabledAsyncStorage: (value: boolean) => Promise<void>;
  isPrivacyBlurEnabled: boolean;
  setIsPrivacyBlurEnabledState: (value: boolean) => void;
  isAdvancedModeEnabled: boolean;
  setIsAdvancedModeEnabledStorage: (value: boolean) => Promise<void>;
  isDoNotTrackEnabled: boolean;
  setDoNotTrackStorage: (value: boolean) => Promise<void>;
  isWidgetBalanceDisplayAllowed: boolean;
  setIsWidgetBalanceDisplayAllowedStorage: (value: boolean) => Promise<void>;
  isLegacyURv1Enabled: boolean;
  setIsLegacyURv1EnabledStorage: (value: boolean) => Promise<void>;
  isClipboardGetContentEnabled: boolean;
  setIsClipboardGetContentEnabledStorage: (value: boolean) => Promise<void>;
  isQuickActionsEnabled: boolean;
  setIsQuickActionsEnabledStorage: (value: boolean) => Promise<void>;
}

const defaultSettingsContext: SettingsContextType = {
  preferredFiatCurrency: FiatUnit.USD,
  setPreferredFiatCurrencyStorage: async () => {},
  language: 'en',
  setLanguageStorage: async () => {},
  isHandOffUseEnabled: false,
  setIsHandOffUseEnabledAsyncStorage: async () => {},
  isPrivacyBlurEnabled: true,
  setIsPrivacyBlurEnabledState: () => {},
  isAdvancedModeEnabled: false,
  setIsAdvancedModeEnabledStorage: async () => {},
  isDoNotTrackEnabled: false,
  setDoNotTrackStorage: async () => {},
  isWidgetBalanceDisplayAllowed: true,
  setIsWidgetBalanceDisplayAllowedStorage: async () => {},
  setIsLegacyURv1EnabledStorage: async () => {},
  isLegacyURv1Enabled: false,
  isClipboardGetContentEnabled: true,
  setIsClipboardGetContentEnabledStorage: async () => {},
  isQuickActionsEnabled: true,
  setIsQuickActionsEnabledStorage: async () => {},
};

export const SettingsContext = createContext<SettingsContextType>(defaultSettingsContext);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // FiatCurrency
  const [preferredFiatCurrency, setPreferredFiatCurrency] = useState<TFiatUnit>(FiatUnit.USD);
  // Language
  const [language, setLanguage] = useState<string>();
  // HandOff
  const [isHandOffUseEnabled, setIsHandOffUseEnabled] = useState<boolean>(false);
  // PrivacyBlur
  const [isPrivacyBlurEnabled, setIsPrivacyBlurEnabled] = useState<boolean>(true);
  // AdvancedMode
  const [isAdvancedModeEnabled, setIsAdvancedModeEnabled] = useState<boolean>(false);
  // DoNotTrack
  const [isDoNotTrackEnabled, setIsDoNotTrackEnabled] = useState<boolean>(false);
  // WidgetCommunication
  const [isWidgetBalanceDisplayAllowed, setIsWidgetBalanceDisplayAllowed] = useState<boolean>(true);
  // LegacyURv1
  const [isLegacyURv1Enabled, setIsLegacyURv1Enabled] = useState<boolean>(false);
  // Clipboard
  const [isClipboardGetContentEnabled, setIsClipboardGetContentEnabled] = useState<boolean>(false);
  // Quick Actions
  const [isQuickActionsEnabled, setIsQuickActionsEnabled] = useState<boolean>(true);

  const advancedModeStorage = useAsyncStorage(BlueApp.ADVANCED_MODE_ENABLED);
  const doNotTrackStorage = useAsyncStorage(BlueApp.DO_NOT_TRACK);
  const isHandOffUseEnabledStorage = useAsyncStorage(BlueApp.HANDOFF_STORAGE_KEY);
  const languageStorage = useAsyncStorage(STORAGE_KEY);

  const { walletsInitialized } = useStorage();

  useEffect(() => {
    const fetchSettings = async () => {
      const advMode = await advancedModeStorage.getItem();
      console.debug('SettingsContext advMode:', advMode);
      const handOff = await isHandOffUseEnabledStorage.getItem();
      console.debug('SettingsContext handOff:', handOff);
      const lang = (await languageStorage.getItem()) ?? 'en';
      console.debug('SettingsContext lang:', lang);
      setIsAdvancedModeEnabled(advMode ? JSON.parse(advMode) : false);
      setIsHandOffUseEnabled(handOff ? JSON.parse(handOff) : false);
      const isBalanceDisplayAllowedStorage = await isBalanceDisplayAllowed();
      console.debug('SettingsContext isBalanceDisplayAllowed:', isBalanceDisplayAllowedStorage);
      setIsWidgetBalanceDisplayAllowed(isBalanceDisplayAllowedStorage);
      setLanguage(lang);

      const isURv1EnabledStorage = await isURv1Enabled();
      console.debug('SettingsContext isURv1Enabled:', isURv1EnabledStorage);
      setIsLegacyURv1EnabledStorage(isURv1EnabledStorage);

      const isClipboardGetContentEnabledStorage = await BlueClipboard().isReadClipboardAllowed();
      console.debug('SettingsContext isClipboardGetContentEnabled:', isClipboardGetContentEnabledStorage);
      setIsClipboardGetContentEnabledStorage(isClipboardGetContentEnabledStorage);

      // @ts-ignore: Fix later
      const isQuickActionsEnabledStorage = await DeviceQuickActions.getEnabled();
      console.debug('SettingsContext isQuickActionsEnabled:', isQuickActionsEnabledStorage);
      setIsQuickActionsEnabledStorage(isQuickActionsEnabledStorage);
    };

    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (walletsInitialized) {
      initCurrencyDaemon().finally(() => {
        getPreferredCurrency().then(currency => {
          console.debug('SettingsContext currency:', currency);
          setPreferredFiatCurrency(FiatUnit[currency.endPointKey]);
        });
      });
    }
  }, [walletsInitialized]);

  const setPreferredFiatCurrencyStorage = useCallback(async (currency: TFiatUnit) => {
    await setPreferredFiatCurrency(currency);
    setPreferredFiatCurrency(currency);
  }, []);

  const setLanguageStorage = useCallback(async (newLanguage: string) => {
    await saveLanguage(newLanguage);
    setLanguage(newLanguage);
  }, []);

  const setIsAdvancedModeEnabledStorage = useCallback(
    async (value: boolean) => {
      await advancedModeStorage.setItem(JSON.stringify(value));
      setIsAdvancedModeEnabled(value);
    },
    [advancedModeStorage],
  );

  const setDoNotTrackStorage = useCallback(
    async (value: boolean) => {
      await doNotTrackStorage.setItem(JSON.stringify(value));
      setIsDoNotTrackEnabled(value);
    },
    [doNotTrackStorage],
  );

  const setIsHandOffUseEnabledAsyncStorage = useCallback(
    async (value: boolean) => {
      setIsHandOffUseEnabled(value);
      await isHandOffUseEnabledStorage.setItem;
    },
    [isHandOffUseEnabledStorage.setItem],
  );

  const setIsWidgetBalanceDisplayAllowedStorage = useCallback(async (value: boolean) => {
    await setBalanceDisplayAllowed(value);
    setIsWidgetBalanceDisplayAllowed(value);
  }, []);

  const setIsLegacyURv1EnabledStorage = useCallback(async (value: boolean) => {
    value ? await setUseURv1() : await clearUseURv1();
    await setIsLegacyURv1Enabled(value);
  }, []);

  const setIsClipboardGetContentEnabledStorage = useCallback(async (value: boolean) => {
    await BlueClipboard().setReadClipboardAllowed(value);
    setIsClipboardGetContentEnabled(value);
  }, []);

  const setIsQuickActionsEnabledStorage = useCallback(async (value: boolean) => {
    // @ts-ignore: Fix later
    await DeviceQuickActions.setEnabled(value);
    setIsQuickActionsEnabled(value);
  }, []);

  const setIsPrivacyBlurEnabledState = useCallback(
    (value: boolean) => {
      setIsPrivacyBlurEnabled(value);
      console.debug(`Privacy blur: ${isPrivacyBlurEnabled}`);
      if (!value) {
        presentAlert({ message: 'Privacy blur has been disabled.' });
      }
    },
    [isPrivacyBlurEnabled],
  );

  const value = useMemo(
    () => ({
      preferredFiatCurrency,
      setPreferredFiatCurrencyStorage,
      language,
      setLanguageStorage,
      isHandOffUseEnabled,
      setIsHandOffUseEnabledAsyncStorage,
      isPrivacyBlurEnabled,
      setIsPrivacyBlurEnabledState,
      isAdvancedModeEnabled,
      setIsAdvancedModeEnabledStorage,
      isDoNotTrackEnabled,
      setDoNotTrackStorage,
      isWidgetBalanceDisplayAllowed,
      setIsWidgetBalanceDisplayAllowedStorage,
      isLegacyURv1Enabled,
      setIsLegacyURv1EnabledStorage,
      isClipboardGetContentEnabled,
      setIsClipboardGetContentEnabledStorage,
      isQuickActionsEnabled,
      setIsQuickActionsEnabledStorage,
    }),
    [
      preferredFiatCurrency,
      setPreferredFiatCurrencyStorage,
      language,
      setLanguageStorage,
      isHandOffUseEnabled,
      setIsHandOffUseEnabledAsyncStorage,
      isPrivacyBlurEnabled,
      setIsPrivacyBlurEnabledState,
      isAdvancedModeEnabled,
      setIsAdvancedModeEnabledStorage,
      isDoNotTrackEnabled,
      setDoNotTrackStorage,
      isWidgetBalanceDisplayAllowed,
      setIsWidgetBalanceDisplayAllowedStorage,
      isLegacyURv1Enabled,
      setIsLegacyURv1EnabledStorage,
      isClipboardGetContentEnabled,
      setIsClipboardGetContentEnabledStorage,
      isQuickActionsEnabled,
      setIsQuickActionsEnabledStorage,
    ],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettings = () => useContext(SettingsContext);
