import React from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';

import { StorageProvider } from '../../components/Context/StorageProvider';
import { useStorage } from '../../hooks/context/useStorage';
import { BlueApp } from '../../class/blue-app';

describe('StorageProvider session lifecycle', () => {
  it('keeps the unlocked session when the app moves to the background', () => {
    const appStateListeners: Array<(state: AppStateStatus) => void> = [];
    const appState = jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      appStateListeners.push(listener);
      return { remove: jest.fn() } as any;
    });
    const clearInMemoryWalletData = jest.spyOn(BlueApp.getInstance(), 'clearInMemoryWalletData');
    const wrapper = ({ children }: { children: React.ReactNode }) => <StorageProvider>{children}</StorageProvider>;
    const { result } = renderHook(() => useStorage(), { wrapper });

    act(() => result.current.setWalletsInitialized(true));
    expect(result.current.walletsInitialized).toBe(true);

    act(() => appStateListeners.forEach(listener => listener('background')));

    expect(result.current.walletsInitialized).toBe(true);
    expect(clearInMemoryWalletData).not.toHaveBeenCalled();
    appState.mockRestore();
    clearInMemoryWalletData.mockRestore();
  });
});
