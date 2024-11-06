import { useAsyncStorage } from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import DefaultPreference from 'react-native-default-preference';
import BlueClipboard from '../../blue_modules/clipboard';
import { getPreferredCurrency, GROUP_IO_BLUEWALLET, initCurrencyDaemon, PREFERRED_CURRENCY_STORAGE_KEY } from '../../blue_modules/currency';
import { clearUseURv1, isURv1Enabled, setUseURv1 } from '../../blue_modules/ur';
import { BlueApp } from '../../class';
import { saveLanguage, STORAGE_KEY } from '../../loc';
import { FiatUnit, TFiatUnit } from '../../models/fiatUnit';
import { getIsHandOffUseEnabled, setIsHandOffUseEnabled } from '../HandOffComponent';
import { useStorage } from '../../hooks/context/useStorage';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { TotalWalletsBalanceKey, TotalWalletsBalancePreferredUnit } from '../TotalWalletsBalance';
import { BLOCK_EXPLORERS, getBlockExplorerUrl, saveBlockExplorer, BlockExplorer, normalizeUrl } from '../../models/blockExplorer';
import {
  getEnabled as getIsDeviceQuickActionsEnabled,
  setEnabled as setIsDeviceQuickActionsEnabled,
} from '../../hooks/useDeviceQuickActions';
import { isBalanceDisplayAllowed, setBalanceDisplayAllowed } from '../../hooks/useWidgetCommunication';
import useOnAppLaunch from '../../hooks/useOnAppLaunch';

const getDoNotTrackStorage = async (): Promise<boolean> => {
  try {
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    const doNotTrack = await DefaultPreference.get(BlueApp.DO_NOT_TRACK);
    return doNotTrack === '1';
  } catch {
    console.error('Error getting DoNotTrack');
    return false;
  }
};

export const setTotalBalanceViewEnabledStorage = async (value: boolean): Promise<void> => {
  try {
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    await DefaultPreference.set(TotalWalletsBalanceKey, value ? 'true' : 'false');
    console.debug('setTotalBalanceViewEnabledStorage value:', value);
  } catch (e) {
    console.error('Error setting TotalBalanceViewEnabled:', e);
  }
};

export const getIsTotalBalanceViewEnabled = async (): Promise<boolean> => {
  try {
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    const isEnabledValue = (await DefaultPreference.get(TotalWalletsBalanceKey)) ?? 'true';
    console.debug('getIsTotalBalanceViewEnabled', isEnabledValue);
    return isEnabledValue === 'true';
  } catch (e) {
    console.error('Error getting TotalBalanceViewEnabled:', e);
    return true;
  }
};

export const setTotalBalancePreferredUnitStorageFunc = async (unit: BitcoinUnit): Promise<void> => {
  try {
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    await DefaultPreference.set(TotalWalletsBalancePreferredUnit, unit);
  } catch (e) {
    console.error('Error setting TotalBalancePreferredUnit:', e);
  }
};

export const getTotalBalancePreferredUnit = async (): Promise<BitcoinUnit> => {
  try {
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    const unit = (await DefaultPreference.get(TotalWalletsBalancePreferredUnit)) as BitcoinUnit | null;
    return unit ?? BitcoinUnit.BTC;
  } catch (e) {
    console.error('Error getting TotalBalancePreferredUnit:', e);
    return BitcoinUnit.BTC;
  }
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
  isViewAllWalletsEnabled: boolean;
  selectedDefaultWallet: string | undefined;
  setViewAllWalletsEnabledStorage: (enabled: boolean) => Promise<void>;
  setSelectedDefaultWalletStorage: (walletID: string) => Promise<void>;
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
  setTotalBalancePreferredUnitStorage: async () => {},
  isDrawerShouldHide: false,
  setIsDrawerShouldHide: () => {},
  selectedBlockExplorer: BLOCK_EXPLORERS.default,
  setBlockExplorerStorage: async () => false,
  isViewAllWalletsEnabled: true,
  selectedDefaultWallet: undefined,
  setViewAllWalletsEnabledStorage: async () => {},
  setSelectedDefaultWalletStorage: async () => {},
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
  const {
    isViewAllWalletsEnabled,
    selectedDefaultWallet,
    setViewAllWalletsEnabledStorage,
    setSelectedDefaultWalletStorage,
  } = useOnAppLaunch();

  const languageStorage = useAsyncStorage(STORAGE_KEY);
  const { walletsInitialized } = useStorage();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
      } catch (e) {
        console.error('Error setting preference name:', e);
      }

      const promises: Promise<void>[] = [
        getIsHandOffUseEnabled().then(handOff => {
          setIsHandOffUseEnabledState(handOff);
        }),
        languageStorage.getItem().then(lang => {
          setLanguage(lang ?? 'en');
        }),
        isBalanceDisplayAllowed().then(balanceDisplayAllowed => {
          setIsWidgetBalanceDisplayAllowed(balanceDisplayAllowed);
        }),
        isURv1Enabled().then(urv1Enabled => {
          setIsLegacyURv1Enabled(urv1Enabled);
        }),
        BlueClipboard()
          .isReadClipboardAllowed()
          .then(clipboardEnabled => {
            setIsClipboardGetContentEnabled(clipboardEnabled);
          }),
        getIsDeviceQuickActionsEnabled().then(quickActionsEnabled => {
          setIsQuickActionsEnabled(quickActionsEnabled);
        }),
        getDoNotTrackStorage().then(doNotTrack => {
          setIsDoNotTrackEnabled(doNotTrack);
        }),
        getIsTotalBalanceViewEnabled().then(totalBalanceEnabled => {
          setIsTotalBalanceEnabled(totalBalanceEnabled);
        }),
        getTotalBalancePreferredUnit().then(preferredUnit => {
          setTotalBalancePreferredUnit(preferredUnit);
        }),
        getBlockExplorerUrl().then(url => {
          const predefinedExplorer = Object.values(BLOCK_EXPLORERS).find(explorer => normalizeUrl(explorer.url) === normalizeUrl(url));
          setSelectedBlockExplorer(predefinedExplorer ?? ({ key: 'custom', name: 'Custom', url } as BlockExplorer));
        }),
      ];

      const results = await Promise.allSettled(promises);

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Error loading setting ${index}:`, result.reason);
        }
      });
    };

    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (walletsInitialized) {
      initCurrencyDaemon()
        .then(getPreferredCurrency)
        .then(currency => {
          console.debug('SettingsContext currency:', currency);
          setPreferredFiatCurrency(currency as TFiatUnit);
        })
        .catch(e => {
          console.error('Error initializing currency daemon or getting preferred currency:', e);
        });
    }
  }, [walletsInitialized]);

  const setPreferredFiatCurrencyStorage = useCallback(async (currency: TFiatUnit): Promise<void> => {
    try {
      await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
      await DefaultPreference.set(PREFERRED_CURRENCY_STORAGE_KEY, currency.endPointKey);
      setPreferredFiatCurrency(currency);
    } catch (e) {
      console.error('Error setting preferredFiatCurrency:', e);
    }
  }, []);

  const setLanguageStorage = useCallback(async (newLanguage: string): Promise<void> => {
    try {
      await saveLanguage(newLanguage);
      setLanguage(newLanguage);
    } catch (e) {
      console.error('Error setting language:', e);
    }
  }, []);

  const setDoNotTrackStorage = useCallback(async (value: boolean): Promise<void> => {
    try {
      await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
      if (value) {
        await DefaultPreference.set(BlueApp.DO_NOT_TRACK, '1');
      } else {
        await DefaultPreference.clear(BlueApp.DO_NOT_TRACK);
      }
      setIsDoNotTrackEnabled(value);
    } catch (e) {
      console.error('Error setting DoNotTrack:', e);
    }
  }, []);

  const setIsHandOffUseEnabledAsyncStorage = useCallback(async (value: boolean): Promise<void> => {
    try {
      console.debug('setIsHandOffUseEnabledAsyncStorage', value);
      await setIsHandOffUseEnabled(value);
      setIsHandOffUseEnabledState(value);
    } catch (e) {
      console.error('Error setting isHandOffUseEnabled:', e);
    }
  }, []);

  const setIsWidgetBalanceDisplayAllowedStorage = useCallback(async (value: boolean): Promise<void> => {
    try {
      await setBalanceDisplayAllowed(value);
      setIsWidgetBalanceDisplayAllowed(value);
    } catch (e) {
      console.error('Error setting isWidgetBalanceDisplayAllowed:', e);
    }
  }, []);

  const setIsLegacyURv1EnabledStorage = useCallback(async (value: boolean): Promise<void> => {
    try {
      if (value) {
        await setUseURv1();
      } else {
        await clearUseURv1();
      }
      setIsLegacyURv1Enabled(value);
    } catch (e) {
      console.error('Error setting isLegacyURv1Enabled:', e);
    }
  }, []);

  const setIsClipboardGetContentEnabledStorage = useCallback(async (value: boolean): Promise<void> => {
    try {
      await BlueClipboard().setReadClipboardAllowed(value);
      setIsClipboardGetContentEnabled(value);
    } catch (e) {
      console.error('Error setting isClipboardGetContentEnabled:', e);
    }
  }, []);

  const setIsQuickActionsEnabledStorage = useCallback(async (value: boolean): Promise<void> => {
    try {
      await setIsDeviceQuickActionsEnabled(value);
      setIsQuickActionsEnabled(value);
    } catch (e) {
      console.error('Error setting isQuickActionsEnabled:', e);
    }
  }, []);

  const setIsPrivacyBlurEnabledState = useCallback((value: boolean): void => {
    try {
      setIsPrivacyBlurEnabled(value);
      console.debug(`Privacy blur: ${value}`);
    } catch (e) {
      console.error('Error setting isPrivacyBlurEnabled:', e);
    }
  }, []);

  const setIsTotalBalanceEnabledStorage = useCallback(async (value: boolean): Promise<void> => {
    try {
      await setTotalBalanceViewEnabledStorage(value);
      setIsTotalBalanceEnabled(value);
    } catch (e) {
      console.error('Error setting isTotalBalanceEnabled:', e);
    }
  }, []);

  const setTotalBalancePreferredUnitStorage = useCallback(async (unit: BitcoinUnit): Promise<void> => {
    try {
      await setTotalBalancePreferredUnitStorageFunc(unit);
      setTotalBalancePreferredUnit(unit);
    } catch (e) {
      console.error('Error setting totalBalancePreferredUnit:', e);
    }
  }, []);

  const setBlockExplorerStorage = useCallback(async (explorer: BlockExplorer): Promise<boolean> => {
    try {
      const success = await saveBlockExplorer(explorer.url);
      if (success) {
        setSelectedBlockExplorer(explorer);
      }
      return success;
    } catch (e) {
      console.error('Error setting BlockExplorer:', e);
      return false;
    }
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
      isViewAllWalletsEnabled,
      selectedDefaultWallet,
      setViewAllWalletsEnabledStorage,
      setSelectedDefaultWalletStorage,
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
      isViewAllWalletsEnabled,
      selectedDefaultWallet,
      setViewAllWalletsEnabledStorage,
      setSelectedDefaultWalletStorage,
    ],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
});
