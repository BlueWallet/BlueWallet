import { useAsyncStorage } from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import DefaultPreference from 'react-native-default-preference';
import BlueClipboard from '../../blue_modules/clipboard';
import { getPreferredCurrency, GROUP_IO_BLUEWALLET, initCurrencyDaemon } from '../../blue_modules/currency';
import { clearUseURv1, isURv1Enabled, setUseURv1 } from '../../blue_modules/ur';
import { BlueApp } from '../../class';
import { saveLanguage, STORAGE_KEY } from '../../loc';
import { FiatUnit, TFiatUnit } from '../../models/fiatUnit';
import { BitcoinUnit } from '../../models/bitcoinUnits';
import { BLOCK_EXPLORERS, getBlockExplorerUrl, saveBlockExplorer, BlockExplorer, normalizeUrl } from '../../models/blockExplorer';
import { useStorage } from '../../hooks/context/useStorage';

export const SettingsContext = createContext<SettingsContextType>(defaultSettingsContext);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferredFiatCurrency, setPreferredFiatCurrency] = useState(FiatUnit.USD);
  const [language, setLanguage] = useState('en');
  const [isHandOffUseEnabled, setHandOffUseEnabled] = useState(false);
  const [isPrivacyBlurEnabled, setIsPrivacyBlurEnabled] = useState(true);
  const [isDoNotTrackEnabled, setDoNotTrackEnabled] = useState(false);
  const [isWidgetBalanceDisplayAllowed, setIsWidgetBalanceDisplayAllowed] = useState(true);
  const [isLegacyURv1Enabled, setIsLegacyURv1Enabled] = useState(false);
  const [isClipboardGetContentEnabled, setClipboardGetContentEnabled] = useState(false);
  const [isQuickActionsEnabled, setQuickActionsEnabled] = useState(true);
  const [isTotalBalanceEnabled, setTotalBalanceEnabled] = useState(true);
  const [totalBalancePreferredUnit, setTotalBalancePreferredUnit] = useState(BitcoinUnit.BTC);
  const [isDrawerShouldHide, setDrawerShouldHide] = useState(false);
  const [selectedBlockExplorer, setSelectedBlockExplorer] = useState(BLOCK_EXPLORERS.default);
  const { walletsInitialized } = useStorage();
  const languageStorage = useAsyncStorage(STORAGE_KEY);

  const fetchSettings = useCallback(async () => {
    try {
      const [handOff, lang, balanceAllowed, urv1, clipboardAllowed, quickActions, doNotTrack, totalBalance, balanceUnit, explorerUrl] = await Promise.all([
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

      setHandOffUseEnabled(handOff);
      setLanguage(lang ?? 'en');
      setIsWidgetBalanceDisplayAllowed(balanceAllowed);
      setIsLegacyURv1Enabled(urv1);
      setClipboardGetContentEnabled(clipboardAllowed);
      setQuickActionsEnabled(quickActions);
      setDoNotTrackEnabled(doNotTrack ?? false);
      setTotalBalanceEnabled(totalBalance);
      setTotalBalancePreferredUnit(balanceUnit);

      const predefinedExplorer = Object.values(BLOCK_EXPLORERS).find(explorer => normalizeUrl(explorer.url) === normalizeUrl(explorerUrl));
      setSelectedBlockExplorer(predefinedExplorer || { key: 'custom', name: 'Custom', url: explorerUrl });
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  }, [languageStorage]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (walletsInitialized) {
      initCurrencyDaemon().finally(() => {
        getPreferredCurrency().then(currency => setPreferredFiatCurrency(FiatUnit[currency.endPointKey]));
      });
    }
  }, [walletsInitialized]);

  const setPreference = useCallback(async (key: string, value: boolean | string) => {
    await DefaultPreference.setName(GROUP_IO_BLUEWALLET);
    if (typeof value === 'boolean') {
      await DefaultPreference.set(key, value ? 'true' : 'false');
    } else {
      await DefaultPreference.set(key, value);
    }
  }, []);

  const value = useMemo(
    () => ({
      preferredFiatCurrency,
      setPreferredFiatCurrencyStorage: async (currency: TFiatUnit) => setPreferredFiatCurrency(currency),
      language,
      setLanguageStorage: async (newLanguage: string) => {
        await saveLanguage(newLanguage);
        setLanguage(newLanguage);
      },
      isHandOffUseEnabled,
      setIsHandOffUseEnabledAsyncStorage: async (value: boolean) => {
        await setPreference('isHandOffUseEnabled', value);
        setHandOffUseEnabled(value);
      },
      isPrivacyBlurEnabled,
      setIsPrivacyBlurEnabledState: (value: boolean) => setIsPrivacyBlurEnabled(value),
      isDoNotTrackEnabled,
      setDoNotTrackStorage: async (value: boolean) => {
        await setPreference(BlueApp.DO_NOT_TRACK, value ? '1' : '');
        setDoNotTrackEnabled(value);
      },
      isWidgetBalanceDisplayAllowed,
      setIsWidgetBalanceDisplayAllowedStorage: async (value: boolean) => {
        await setBalanceDisplayAllowed(value);
        setIsWidgetBalanceDisplayAllowed(value);
      },
      isLegacyURv1Enabled,
      setIsLegacyURv1EnabledStorage: async (value: boolean) => {
        value ? await setUseURv1() : await clearUseURv1();
        setIsLegacyURv1Enabled(value);
      },
      isClipboardGetContentEnabled,
      setIsClipboardGetContentEnabledStorage: async (value: boolean) => {
        await BlueClipboard().setReadClipboardAllowed(value);
        setClipboardGetContentEnabled(value);
      },
      isQuickActionsEnabled,
      setIsQuickActionsEnabledStorage: async (value: boolean) => {
        await setIsDeviceQuickActionsEnabled(value);
        setQuickActionsEnabled(value);
      },
      isTotalBalanceEnabled,
      setIsTotalBalanceEnabledStorage: async (value: boolean) => {
        await setTotalBalanceViewEnabled(value);
        setTotalBalanceEnabled(value);
      },
      totalBalancePreferredUnit,
      setTotalBalancePreferredUnitStorage: async (unit: BitcoinUnit) => {
        await setTotalBalancePreferredUnit(unit);
        setTotalBalancePreferredUnit(unit);
      },
      isDrawerShouldHide,
      setIsDrawerShouldHide: setDrawerShouldHide,
      selectedBlockExplorer,
      setBlockExplorerStorage: async (explorer: BlockExplorer): Promise<boolean> => {
        const success = await saveBlockExplorer(explorer.url);
        if (success) setSelectedBlockExplorer(explorer);
        return success;
      },
    }),
    [
      preferredFiatCurrency,
      language,
      isHandOffUseEnabled,
      isPrivacyBlurEnabled,
      isDoNotTrackEnabled,
      isWidgetBalanceDisplayAllowed,
      isLegacyURv1Enabled,
      isClipboardGetContentEnabled,
      isQuickActionsEnabled,
      isTotalBalanceEnabled,
      totalBalancePreferredUnit,
      isDrawerShouldHide,
      selectedBlockExplorer,
    ]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};