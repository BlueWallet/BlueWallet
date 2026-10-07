/* eslint-disable import/first -- jest.mock must run before SettingsProvider imports */
import assert from 'assert';
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { renderHook, act, waitFor } from '@testing-library/react-native';

jest.mock('../../hooks/context/useStorage', () => ({
  useStorage: () => ({ walletsInitialized: false }),
}));

import { LANGUAGE_CHANGED_EVENT, saveLanguage } from '../../loc';
import { SettingsProvider } from '../../components/Context/SettingsProvider';
import { useSettings } from '../../hooks/context/useSettings';

const wrapper = ({ children }: { children: React.ReactNode }) => <SettingsProvider>{children}</SettingsProvider>;

describe('SettingsProvider language sync', () => {
  beforeEach(() => {
    jest.spyOn(AsyncStorage, 'getItem').mockImplementation(() => Promise.resolve(null));
    jest.spyOn(AsyncStorage, 'setItem').mockImplementation(() => Promise.resolve());
    jest.spyOn(AsyncStorage, 'removeItem').mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('updates language state when loc emits on the automatic path', async () => {
    const { result } = renderHook(() => useSettings(), { wrapper });

    await waitFor(() => {
      assert.strictEqual(result.current.language, 'en');
    });

    await act(async () => {
      DeviceEventEmitter.emit(LANGUAGE_CHANGED_EVENT, 'de_de');
    });

    await waitFor(() => {
      assert.strictEqual(result.current.language, 'de_de');
    });
  });

  it('updates language state when saveLanguage runs without userSelected', async () => {
    const { result } = renderHook(() => useSettings(), { wrapper });

    await act(async () => {
      await saveLanguage('jp_jp');
    });

    await waitFor(() => {
      assert.strictEqual(result.current.language, 'jp_jp');
    });
  });
});
