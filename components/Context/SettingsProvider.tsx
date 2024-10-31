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
import { LayoutAnimation } from 'react-native';
import { BLOCK_EXPLORERS, getBlockExplorerUrl, saveBlockExplorer, BlockExplorer, normalizeUrl } from '../../models/blockExplorer';

const getDoNotTrackStorage = async () => {
  await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
  const doNotTrack = await DefaultPreference.get(BlueApp.DO_NOT_TRACK);
  return doNotTrack === '1';
};

export const setTotalBalanceViewEnabledStorage = async (value: boolean) => {
  try {
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    await DefaultPreference.set(TotalWalletsBalanceKey, value ? 'true' : 'false');
    console.debug('setTotalBalanceViewEnabledStorage value:', value);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
    await setTotalBalanceViewEnabledStorage(true);
    return true;
  }
};

export const setTotalBalancePreferredUnitStorageFunc = async (unit: BitcoinUnit) => {
  try {
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    await DefaultPreference.set(TotalWalletsBalancePreferredUnit, unit);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  } catch (e) {
    console.error('Error setting TotalBalancePreferredUnit:', e);
  }
};

export const getTotalBalancePreferredUnit = async (): Promise<BitcoinUnit> => {
  try {
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    const unit = (await DefaultPreference.get(TotalWalletsBalancePreferredUnit)) as BitcoinUnit;
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
      } catch (e) {
        console.error('Error setting preference name:', e);
      }

      try {
        const handOff = await getIsHandOffUseEnabled();
        setIsHandOffUseEnabledState(handOff);
      } catch (e) {
        console.error('Error loading isHandOffUseEnabled:', e);
        setIsHandOffUseEnabledState(true);
      }

      try {
        const lang = await languageStorage.getItem();
        setLanguage(lang ?? 'en');
      } catch (e) {
        console.error('Error loading language:', e);
        setLanguage('en');
      }

      try {
        const balanceDisplayAllowed = await isBalanceDisplayAllowed();
        setIsWidgetBalanceDisplayAllowed(balanceDisplayAllowed);
      } catch (e) {
        console.error('Error loading isBalanceDisplayAllowed:', e);
        setIsWidgetBalanceDisplayAllowed(true);
      }

      try {
        const urv1Enabled = await isURv1Enabled();
        setIsLegacyURv1Enabled(urv1Enabled);
      } catch (e) {
        console.error('Error loading isURv1Enabled:', e);
        setIsLegacyURv1Enabled(false);
      }

      try {
        const clipboardEnabled = await BlueClipboard().isReadClipboardAllowed();
        setIsClipboardGetContentEnabled(clipboardEnabled);
      } catch (e) {
        console.error('Error loading isClipboardGetContentEnabled:', e);
        setIsClipboardGetContentEnabled(true);
      }

      try {
        const quickActionsEnabledStorage = await getIsDeviceQuickActionsEnabled();
        setIsQuickActionsEnabled(quickActionsEnabledStorage);
      } catch (e) {
        console.error('Error loading isQuickActionsEnabled:', e);
        setIsQuickActionsEnabled(true);
      }

      try {
        const doNotTrack = await getDoNotTrackStorage();
        setIsDoNotTrackEnabled(doNotTrack);
      } catch (e) {
        console.error('Error loading isDoNotTrackEnabled:', e);
        setIsDoNotTrackEnabled(false);
      }

      try {
        const totalBalanceEnabled = await getIsTotalBalanceViewEnabled();
        setIsTotalBalanceEnabled(totalBalanceEnabled);
      } catch (e) {
        console.error('Error loading isTotalBalanceEnabled:', e);
        setIsTotalBalanceEnabled(true);
      }

      try {
        const preferredUnit = await getTotalBalancePreferredUnit();
        setTotalBalancePreferredUnit(preferredUnit);
      } catch (e) {
        console.error('Error loading totalBalancePreferredUnit:', e);
        setTotalBalancePreferredUnit(BitcoinUnit.BTC);
      }

      try {
        const blockExplorerUrl = await getBlockExplorerUrl();
        const predefinedExplorer = Object.values(BLOCK_EXPLORERS).find(
          explorer => normalizeUrl(explorer.url) === normalizeUrl(blockExplorerUrl),
        );
        if (predefinedExplorer) {
          setSelectedBlockExplorer(predefinedExplorer);
        } else {
          setSelectedBlockExplorer({ key: 'custom', name: 'Custom', url: blockExplorerUrl });
        }
      } catch (e) {
        console.error('Error loading selectedBlockExplorer:', e);
        setSelectedBlockExplorer(BLOCK_EXPLORERS.default);
      }
    };

    loadSettings();
  }, [languageStorage]);

  useEffect(() => {
    if (walletsInitialized) {
      initCurrencyDaemon()
        .then(() => getPreferredCurrency())
        .then(currency => {
          console.debug('SettingsContext currency:', currency);
          setPreferredFiatCurrency(currency as TFiatUnit);
        })
        .catch(e => {
          console.error('Error initializing currency daemon or getting preferred currency:', e);
        });
    }
  }, [walletsInitialized]);

  const setPreferredFiatCurrencyStorage = useCallback(async (currency: TFiatUnit) => {
    try {
      setPreferredFiatCurrency(currency);
      await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
      await DefaultPreference.set('preferredFiatCurrency', currency as unknown as string);
    } catch (e) {
      console.error('Error setting preferredFiatCurrency:', e);
    }
  }, []);

  const setLanguageStorage = useCallback(async (newLanguage: string) => {
    try {
      await saveLanguage(newLanguage);
      setLanguage(newLanguage);
    } catch (e) {
      console.error('Error setting language:', e);
    }
  }, []);

  const setDoNotTrackStorage = useCallback(async (value: boolean) => {
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

  const setIsHandOffUseEnabledAsyncStorage = useCallback(async (value: boolean) => {
    try {
      console.debug('setIsHandOffUseEnabledAsyncStorage', value);
      setIsHandOffUseEnabled(value);
      setIsHandOffUseEnabledState(value);
    } catch (e) {
      console.error('Error setting isHandOffUseEnabled:', e);
    }
  }, []);

  const setIsWidgetBalanceDisplayAllowedStorage = useCallback(async (value: boolean) => {
    try {
      await setBalanceDisplayAllowed(value);
      setIsWidgetBalanceDisplayAllowed(value);
    } catch (e) {
      console.error('Error setting isWidgetBalanceDisplayAllowed:', e);
    }
  }, []);

  const setIsLegacyURv1EnabledStorage = useCallback(async (value: boolean) => {
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

  const setIsClipboardGetContentEnabledStorage = useCallback(async (value: boolean) => {
    try {
      await BlueClipboard().setReadClipboardAllowed(value);
      setIsClipboardGetContentEnabled(value);
    } catch (e) {
      console.error('Error setting isClipboardGetContentEnabled:', e);
    }
  }, []);

  const setIsQuickActionsEnabledStorage = useCallback(async (value: boolean) => {
    try {
      await setIsDeviceQuickActionsEnabled(value);
      setIsQuickActionsEnabled(value);
    } catch (e) {
      console.error('Error setting isQuickActionsEnabled:', e);
    }
  }, []);

  const setIsPrivacyBlurEnabledState = useCallback((value: boolean) => {
    try {
      setIsPrivacyBlurEnabled(value);
      console.debug(`Privacy blur: ${value}`);
    } catch (e) {
      console.error('Error setting isPrivacyBlurEnabled:', e);
    }
  }, []);

  const setIsTotalBalanceEnabledStorage = useCallback(async (value: boolean) => {
    try {
      await setTotalBalanceViewEnabledStorage(value);
      setIsTotalBalanceEnabled(value);
    } catch (e) {
      console.error('Error setting isTotalBalanceEnabled:', e);
    }
  }, []);

  const setTotalBalancePreferredUnitStorage = useCallback(async (unit: BitcoinUnit) => {
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
