import { useAsyncStorage } from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import DefaultPreference from 'react-native-default-preference';
import BlueClipboard from '../../blue_modules/clipboard';
import { getPreferredCurrency, GROUP_IO_BLUEWALLET, initCurrencyDaemon } from '../../blue_modules/currency';
import { clearUseURv1, isURv1Enabled, setUseURv1 } from '../../blue_modules/ur';
import { BlueApp } from '../../class';
import { saveLanguage, STORAGE_KEY } from '../../loc';
import { FiatUnit, TFiatUnit } from '../../models/fiatUnit';
import { getEnabled as getIsDeviceQuickActionsEnabled, setEnabled as setIsDeviceQuickActionsEnabled } from '../DeviceQuickActions';
import { getIsHandOffUseEnabled, setIsHandOffUseEnabled } from '../HandOffComponent';
import { isBalanceDisplayAllowed, setBalanceDisplayAllowed } from '../WidgetCommunication';
import { useStorage } from '../../hooks/context/useStorage';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { TotalWalletsBalanceKey, TotalWalletsBalancePreferredUnit } from '../TotalWalletsBalance';
import { BLOCK_EXPLORERS, getBlockExplorerUrl, saveBlockExplorer, BlockExplorer, normalizeUrl } from '../../models/blockExplorer';

const getDoNotTrackStorage = async () => {
  await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
  const doNotTrack = await DefaultPreference.get(BlueApp.DO_NOT_TRACK);
  return doNotTrack === '1';
};

export const setTotalBalanceViewEnabledStorage = async (value: boolean) => {
  await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
  await DefaultPreference.set(TotalWalletsBalanceKey, value ? 'true' : 'false');
  console.debug('setTotalBalanceViewEnabledStorage value:', value);
};

export const getIsTotalBalanceViewEnabled = async (): Promise<boolean> => {
  try {
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    const isEnabledValue = (await DefaultPreference.get(TotalWalletsBalanceKey)) ?? 'true';
    console.debug('getIsTotalBalanceViewEnabled', isEnabledValue);
    return isEnabledValue === 'true';
  } catch (e) {
    console.debug('getIsTotalBalanceViewEnabled error', e);
    await setTotalBalanceViewEnabledStorage(true);
  }
  await setTotalBalanceViewEnabledStorage(true);
  return true;
};

export const setTotalBalancePreferredUnitStorageFunc = async (unit: BitcoinUnit) => {
  await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
  await DefaultPreference.set(TotalWalletsBalancePreferredUnit, unit);
};

export const getTotalBalancePreferredUnit = async (): Promise<BitcoinUnit> => {
  try {
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    const unit = (await DefaultPreference.get(TotalWalletsBalancePreferredUnit)) as BitcoinUnit;
    return unit ?? BitcoinUnit.BTC;
  } catch (e) {
    console.debug('getTotalBalancePreferredUnit error', e);
  }
  return BitcoinUnit.BTC;
};

interface SettingsContextType {
  preferredFiatCurrency: TFiatUnit;
  setPreferredFiatCurrencyStorage: (currency: TFiatUnit) => Promise<void>;
  language: string;
  setLanguageStorage: (language: string) => Promise<void>;
  isHandOffUseEnabled: boolean;
  setIsHandOffUseEnabledAsyncStorage: (value: boolean) => Promise<void>;
  isPrivacyBlurEnabled: boolean;
  setIsPrivacyBlurEnabledState: (value: boolean) => void;
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
  isDrawerShouldHide: boolean;
  setIsDrawerShouldHide: (value: boolean) => void;
  selectedBlockExplorer: BlockExplorer;
  setBlockExplorerStorage: (explorer: BlockExplorer) => Promise<boolean>;
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
  isDoNotTrackEnabled: false,
  setDoNotTrackStorage: async () => {},
  isWidgetBalanceDisplayAllowed: true,
  setIsWidgetBalanceDisplayAllowedStorage: async () => {},
  isLegacyURv1Enabled: false,
  setIsLegacyURv1EnabledStorage: async () => {},
  isClipboardGetContentEnabled: true,
  setIsClipboardGetContentEnabledStorage: async () => {},
  isQuickActionsEnabled: true,
  setIsQuickActionsEnabledStorage: async () => {},
  isTotalBalanceEnabled: true,
  setIsTotalBalanceEnabledStorage: async () => {},
  totalBalancePreferredUnit: BitcoinUnit.BTC,
  setTotalBalancePreferredUnitStorage: async (unit: BitcoinUnit) => {},
  isDrawerShouldHide: false,
  setIsDrawerShouldHide: () => {},
  selectedBlockExplorer: BLOCK_EXPLORERS.default,
  setBlockExplorerStorage: async (explorer: BlockExplorer) => false,
};

export const SettingsContext = createContext<SettingsContextType>(defaultSettingsContext);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
  const [preferredFiatCurrency, setPreferredFiatCurrency] = useState<TFiatUnit>(FiatUnit.USD);
  const [language, setLanguage] = useState<string>('en');
  const [isHandOffUseEnabled, setIsHandOffUseEnabledState] = useState<boolean>(false);
  const [isPrivacyBlurEnabled, setIsPrivacyBlurEnabled] = useState<boolean>(true);
  const [isDoNotTrackEnabled, setIsDoNotTrackEnabled] = useState<boolean>(false);
  const [isWidgetBalanceDisplayAllowed, setIsWidgetBalanceDisplayAllowed] = useState<boolean>(true);
  const [isLegacyURv1Enabled, setIsLegacyURv1Enabled] = useState<boolean>(false);
  const [isClipboardGetContentEnabled, setIsClipboardGetContentEnabled] = useState<boolean>(true);
  const [isQuickActionsEnabled, setIsQuickActionsEnabled] = useState<boolean>(true);
  const [isTotalBalanceEnabled, setIsTotalBalanceEnabled] = useState<boolean>(true);
  const [totalBalancePreferredUnit, setTotalBalancePreferredUnit] = useState<BitcoinUnit>(BitcoinUnit.BTC);
  const [isDrawerShouldHide, setIsDrawerShouldHide] = useState<boolean>(false);
  const [selectedBlockExplorer, setSelectedBlockExplorer] = useState<BlockExplorer>(BLOCK_EXPLORERS.default);

  const languageStorage = useAsyncStorage(STORAGE_KEY);
  const { walletsInitialized } = useStorage();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        await DefaultPreference.setName(GROUP_IO_BLUEWALLET);

        const [
          handOff,
          lang,
          balanceDisplayAllowed,
          urv1Enabled,
          clipboardEnabled,
          quickActionsEnabledStorage,
          doNotTrack,
          totalBalanceEnabled,
          preferredUnit,
          blockExplorerUrl,
        ] = await Promise.all([
          getIsHandOffUseEnabled(),
          languageStorage.getItem(),
          isBalanceDisplayAllowed(),
          isURv1Enabled(),
          BlueClipboard().isReadClipboardAllowed(),
          getIsDeviceQuickActionsEnabled(),
          getDoNotTrackStorage(),
          getIsTotalBalanceViewEnabled(),
          getTotalBalancePreferredUnit(),
          getBlockExplorerUrl(),
        ]);

        setIsHandOffUseEnabledState(handOff);
        setLanguage(lang ?? 'en');
        setIsWidgetBalanceDisplayAllowed(balanceDisplayAllowed);
        setIsLegacyURv1Enabled(urv1Enabled);
        setIsClipboardGetContentEnabled(clipboardEnabled);
        setIsQuickActionsEnabled(quickActionsEnabledStorage);
        setIsDoNotTrackEnabled(doNotTrack ?? false);
        setIsTotalBalanceEnabled(totalBalanceEnabled);
        setTotalBalancePreferredUnit(preferredUnit);

        const predefinedExplorer = Object.values(BLOCK_EXPLORERS).find(
          explorer => normalizeUrl(explorer.url) === normalizeUrl(blockExplorerUrl),
        );
        if (predefinedExplorer) {
          setSelectedBlockExplorer(predefinedExplorer);
        } else {
          setSelectedBlockExplorer({ key: 'custom', name: 'Custom', url: blockExplorerUrl });
        }

        console.debug('All settings loaded successfully');
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    loadSettings();
  }, [languageStorage]);

  useEffect(() => {
    if (walletsInitialized) {
      initCurrencyDaemon().finally(() => {
        getPreferredCurrency().then(currency => {
          console.debug('SettingsContext currency:', currency);
          setPreferredFiatCurrency(currency as TFiatUnit);
        });
      });
    }
  }, [walletsInitialized]);

  const setPreferredFiatCurrencyStorage = useCallback(async (currency: TFiatUnit) => {
    setPreferredFiatCurrency(currency);
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    await DefaultPreference.set('preferredFiatCurrency', currency as unknown as string);
  }, []);

  const setLanguageStorage = useCallback(async (newLanguage: string) => {
    await saveLanguage(newLanguage);
    setLanguage(newLanguage);
  }, []);

  const setDoNotTrackStorage = useCallback(async (value: boolean) => {
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    if (value) {
      await DefaultPreference.set(BlueApp.DO_NOT_TRACK, '1');
    } else {
      await DefaultPreference.clear(BlueApp.DO_NOT_TRACK);
    }
    setIsDoNotTrackEnabled(value);
  }, []);

  const setIsHandOffUseEnabledAsyncStorage = useCallback(async (value: boolean) => {
    console.debug('setIsHandOffUseEnabledAsyncStorage', value);
    setIsHandOffUseEnabled(value);
    setIsHandOffUseEnabledState(value);
  }, []);

  const setIsWidgetBalanceDisplayAllowedStorage = useCallback(async (value: boolean) => {
    await setBalanceDisplayAllowed(value);
    setIsWidgetBalanceDisplayAllowed(value);
  }, []);

  const setIsLegacyURv1EnabledStorage = useCallback(async (value: boolean) => {
    if (value) {
      await setUseURv1();
    } else {
      await clearUseURv1();
    }
    setIsLegacyURv1Enabled(value);
  }, []);

  const setIsClipboardGetContentEnabledStorage = useCallback(async (value: boolean) => {
    await BlueClipboard().setReadClipboardAllowed(value);
    setIsClipboardGetContentEnabled(value);
  }, []);

  const setIsQuickActionsEnabledStorage = useCallback(async (value: boolean) => {
    await setIsDeviceQuickActionsEnabled(value);
    setIsQuickActionsEnabled(value);
  }, []);

  const setIsPrivacyBlurEnabledState = useCallback((value: boolean) => {
    setIsPrivacyBlurEnabled(value);
    console.debug(`Privacy blur: ${value}`);
  }, []);

  const setIsTotalBalanceEnabledStorage = useCallback(async (value: boolean) => {
    await setTotalBalanceViewEnabledStorage(value);
    setIsTotalBalanceEnabled(value);
  }, []);

  const setTotalBalancePreferredUnitStorage = useCallback(async (unit: BitcoinUnit) => {
    await setTotalBalancePreferredUnitStorageFunc(unit);
    setTotalBalancePreferredUnit(unit);
  }, []);

  const setBlockExplorerStorage = useCallback(async (explorer: BlockExplorer): Promise<boolean> => {
    const success = await saveBlockExplorer(explorer.url);
    if (success) {
      setSelectedBlockExplorer(explorer);
    }
    return success;
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
      isDrawerShouldHide,
      setIsDrawerShouldHide,
      selectedBlockExplorer,
      setBlockExplorerStorage,
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
      isDrawerShouldHide,
      setIsDrawerShouldHide,
      selectedBlockExplorer,
      setBlockExplorerStorage,
    ],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
});
