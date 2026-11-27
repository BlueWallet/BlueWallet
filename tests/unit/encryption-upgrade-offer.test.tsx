/**
 * H08 · The upgrade window opens by itself once per start, a moment after the
 * home appears, and only when the unlocked bucket is in the old format.
 */
import React from 'react';
import { act, render } from '@testing-library/react-native';

import { OFFER_DELAY_MS, useEncryptionUpgradeOffer } from '../../hooks/useEncryptionUpgradeOffer';

const navigate = jest.fn();
const storage = { walletsInitialized: true, canUpgradeEncryption: jest.fn(() => true) };
jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return { useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]) };
});
jest.mock('../../hooks/context/useStorage', () => ({ useStorage: () => storage }));
jest.mock('../../hooks/useExtendedNavigation', () => ({ useExtendedNavigation: () => ({ navigate }) }));

const Home = () => {
  useEncryptionUpgradeOffer();
  return null;
};

describe('useEncryptionUpgradeOffer (H08)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('opens the window once per start, a moment after the home appears, only for an old-format store', () => {
    storage.canUpgradeEncryption.mockReturnValue(false);
    const plain = render(<Home />);
    act(() => jest.advanceTimersByTime(OFFER_DELAY_MS * 2));
    expect(navigate).not.toHaveBeenCalled();
    plain.unmount();

    // Leaving the home before the delay cancels it.
    storage.canUpgradeEncryption.mockReturnValue(true);
    const left = render(<Home />);
    act(() => jest.advanceTimersByTime(OFFER_DELAY_MS - 1));
    left.unmount();
    act(() => jest.advanceTimersByTime(OFFER_DELAY_MS));
    expect(navigate).not.toHaveBeenCalled();

    const first = render(<Home />);
    act(() => jest.advanceTimersByTime(OFFER_DELAY_MS));
    expect(navigate).toHaveBeenCalledWith('EncryptionUpgradeSheet');
    first.unmount();

    // "Later", then back on the home: not again until the next start.
    const again = render(<Home />);
    act(() => jest.advanceTimersByTime(OFFER_DELAY_MS * 2));
    expect(navigate).toHaveBeenCalledTimes(1);
    again.unmount();
  });
});
