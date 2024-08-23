import { useAsyncStorage } from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import DefaultPreference from 'react-native-default-preference';
import BlueClipboard from '../../blue_modules/clipboard';
import { getPreferredCurrency, GROUP_IO_BLUEWALLET, initCurrencyDaemon } from '../../blue_modules/currency';
import { clearUseURv1, isURv1Enabled, setUseURv1 } from '../../blue_modules/ur';
import { BlueApp } from '../../class';
import { saveLanguage, STORAGE_KEY } from '../../loc';
import { FiatUnit, TFiatUnit } from '../../models/fiatUnit';
import { getEnabled as getIsDeviceQuickActionsEnabled, setEnabled as setIsDeviceQuickActionsEnabled } from '..//DeviceQuickActions';
import { getIsHandOffUseEnabled, setIsHandOffUseEnabled } from '../HandOffComponent';
import { isBalanceDisplayAllowed, setBalanceDisplayAllowed } from '../WidgetCommunication';
import { useStorage } from '../../hooks/context/useStorage';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { TotalWalletsBalanceKey, TotalWalletsBalancePreferredUnit } from '../TotalWalletsBalance';
import { LayoutAnimation } from 'react-native';

// DefaultPreference and AsyncStorage get/set

// TotalWalletsBalance

export const setTotalBalanceViewEnabled = async (value: boolean) => {
  await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
  await DefaultPreference.set(TotalWalletsBalanceKey, value ? 'true' : 'false');
  console.debug('setTotalBalanceViewEnabled value:', value);
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
};

export const getIsTotalBalanceViewEnabled = async (): Promise<boolean> => {
  try {
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);

    const isEnabledValue = (await DefaultPreference.get(TotalWalletsBalanceKey)) ?? 'true';
    console.debug('getIsTotalBalanceViewEnabled', isEnabledValue);
    return isEnabledValue === 'true';
  } catch (e) {
    console.debug('getIsTotalBalanceViewEnabled error', e);
    await setTotalBalanceViewEnabled(true);
  }
  await setTotalBalanceViewEnabled(true);
  return true;
};

export const setTotalBalancePreferredUnit = async (unit: BitcoinUnit) => {
  await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
  await DefaultPreference.set(TotalWalletsBalancePreferredUnit, unit);
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); // Add animation when changing unit
};

//

export const getTotalBalancePreferredUnit = async (): Promise<BitcoinUnit> => {
  try {
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    const unit = ((await DefaultPreference.get(TotalWalletsBalancePreferredUnit)) as BitcoinUnit) ?? BitcoinUnit.BTC;
    return unit;
  } catch (e) {
    console.debug('getPreferredUnit error', e);
  }
  return BitcoinUnit.BTC;
};

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
  isTotalBalanceEnabled: boolean;
  setIsTotalBalanceEnabledStorage: (value: boolean) => Promise<void>;
  totalBalancePreferredUnit: BitcoinUnit;
  setTotalBalancePreferredUnitStorage: (unit: BitcoinUnit) => Promise<void>;
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
  isTotalBalanceEnabled: true,
  setIsTotalBalanceEnabledStorage: async () => {},
  totalBalancePreferredUnit: BitcoinUnit.BTC,
  setTotalBalancePreferredUnitStorage: async (unit: BitcoinUnit) => {},
};

export const SettingsContext = createContext<SettingsContextType>(defaultSettingsContext);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // FiatCurrency
  const [preferredFiatCurrency, setPreferredFiatCurrency] = useState<TFiatUnit>(FiatUnit.USD);
  // Language
  const [language, setLanguage] = useState<string>();
  // HandOff
  const [isHandOffUseEnabled, setHandOffUseEnabled] = useState<boolean>(false);
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
  // Total Balance
  const [isTotalBalanceEnabled, setIsTotalBalanceEnabled] = useState<boolean>(true);
  const [totalBalancePreferredUnit, setTotalBalancePreferredUnitState] = useState<BitcoinUnit>(BitcoinUnit.BTC);

  const advancedModeStorage = useAsyncStorage(BlueApp.ADVANCED_MODE_ENABLED);
  const languageStorage = useAsyncStorage(STORAGE_KEY);
  const { walletsInitialized } = useStorage();

  useEffect(() => {
    advancedModeStorage
      .getItem()
      .then(advMode => {
        console.debug('SettingsContext advMode:', advMode);
        setIsAdvancedModeEnabled(advMode ? JSON.parse(advMode) : false);
      })
      .catch(error => console.error('Error fetching advanced mode settings:', error));

    getIsHandOffUseEnabled()
      .then(handOff => {
        console.debug('SettingsContext handOff:', handOff);
        setHandOffUseEnabled(handOff);
      })
      .catch(error => console.error('Error fetching hand-off usage:', error));

    languageStorage
      .getItem()
      .then(lang => {
        lang = lang ?? 'en';
        console.debug('SettingsContext lang:', lang);
        setLanguage(lang);
      })
      .catch(error => console.error('Error fetching language setting:', error));

    isBalanceDisplayAllowed()
      .then(isBalanceDisplayAllowedStorage => {
        console.debug('SettingsContext isBalanceDisplayAllowed:', isBalanceDisplayAllowedStorage);
        setIsWidgetBalanceDisplayAllowed(isBalanceDisplayAllowedStorage);
      })
      .catch(error => console.error('Error fetching balance display allowance:', error));

    isURv1Enabled()
      .then(isURv1EnabledStorage => {
        console.debug('SettingsContext isURv1Enabled:', isURv1EnabledStorage);
        setIsLegacyURv1EnabledStorage(isURv1EnabledStorage);
      })
      .catch(error => console.error('Error fetching UR v1 enabled status:', error));

    BlueClipboard()
      .isReadClipboardAllowed()
      .then(isClipboardGetContentEnabledStorage => {
        console.debug('SettingsContext isClipboardGetContentEnabled:', isClipboardGetContentEnabledStorage);
        setIsClipboardGetContentEnabledStorage(isClipboardGetContentEnabledStorage);
      })
      .catch(error => console.error('Error fetching clipboard content allowance:', error));

    getIsDeviceQuickActionsEnabled()
      .then(isQuickActionsEnabledStorage => {
        console.debug('SettingsContext isQuickActionsEnabled:', isQuickActionsEnabledStorage);
        setIsQuickActionsEnabledStorage(isQuickActionsEnabledStorage);
      })
      .catch(error => console.error('Error fetching device quick actions enabled status:', error));

    getDoNotTrackStorage()
      .then(value => {
        console.debug('SettingsContext doNotTrack:', value);
        setDoNotTrackStorage(value ?? false);
      })
      .catch(error => console.error('Error fetching do not track settings:', error));

    getIsTotalBalanceViewEnabled()
      .then(value => {
        console.debug('SettingsContext totalBalance:', value);
        setIsTotalBalanceEnabledStorage(value);
      })
      .catch(error => console.error('Error fetching total balance settings:', error));

    getTotalBalancePreferredUnit()
      .then(unit => {
        console.debug('SettingsContext totalBalancePreferredUnit:', unit);
        setTotalBalancePreferredUnit(unit);
      })
      .catch(error => console.error('Error fetching total balance preferred unit:', error));
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

  const setDoNotTrackStorage = useCallback(async (value: boolean) => {
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    if (value) {
      await DefaultPreference.set(BlueApp.DO_NOT_TRACK, '1');
    } else {
      await DefaultPreference.clear(BlueApp.DO_NOT_TRACK);
    }
    setIsDoNotTrackEnabled(value);
  }, []);

  const getDoNotTrackStorage = useCallback(async () => {
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    const doNotTrack = await DefaultPreference.get(BlueApp.DO_NOT_TRACK);
    return doNotTrack === '1';
  }, []);

  const setIsHandOffUseEnabledAsyncStorage = useCallback(async (value: boolean) => {
    console.debug('setIsHandOffUseEnabledAsyncStorage', value);
    await setIsHandOffUseEnabled(value);
    setHandOffUseEnabled(value);
  }, []);

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
    await setIsDeviceQuickActionsEnabled(value);
    setIsQuickActionsEnabled(value);
  }, []);

  const setIsPrivacyBlurEnabledState = useCallback(
    (value: boolean) => {
      setIsPrivacyBlurEnabled(value);
      console.debug(`Privacy blur: ${isPrivacyBlurEnabled}`);
    },
    [isPrivacyBlurEnabled],
  );

  const setIsTotalBalanceEnabledStorage = useCallback(async (value: boolean) => {
    setTotalBalanceViewEnabled(value);
    setIsTotalBalanceEnabled(value);
  }, []);

  const setTotalBalancePreferredUnitStorage = useCallback(async (unit: BitcoinUnit) => {
    await setTotalBalancePreferredUnit(unit);
    setTotalBalancePreferredUnitState(unit);
  }, []);

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
      isTotalBalanceEnabled,
      setIsTotalBalanceEnabledStorage,
      totalBalancePreferredUnit,
      setTotalBalancePreferredUnitStorage,
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
      isTotalBalanceEnabled,
      setIsTotalBalanceEnabledStorage,
      totalBalancePreferredUnit,
      setTotalBalancePreferredUnitStorage,
    ],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};
