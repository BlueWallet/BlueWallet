import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Linking, StyleSheet } from 'react-native';

import {
  BuyBitcoinButton,
  MOONPAY_API_KEY,
  buyBitcoinButtonVariant,
  buyBitcoinUrl,
  resolveBuyBitcoinReceiveAddress,
} from '../../components/BuyBitcoinButton';
import { Chain } from '../../models/bitcoinUnits';
import { BlueDefaultTheme } from '../../components/themes';

jest.mock('../../components/themes', () => {
  const actual = jest.requireActual('../../components/themes');
  return {
    ...actual,
    useTheme: () => actual.BlueDefaultTheme,
  };
});

jest.mock('../../loc', () => ({
  __esModule: true,
  default: {
    errors: { error: 'Error' },
    receive: { address_not_found: 'Unable to generate receiving address.' },
    transactions: { open_url_error: 'Unable to open the link.' },
    wallets: {
      buy_bitcoin: 'Buy Bitcoin',
    },
  },
}));

const RECEIVE_ADDRESS = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';

describe('buyBitcoinButtonVariant', () => {
  it('places a filled button under the empty text for a new on-chain wallet', () => {
    expect(buyBitcoinButtonVariant(Chain.ONCHAIN, 0, 'DE')).toBe('empty');
  });

  it('places a quiet button above the transaction list once an on-chain wallet has transactions', () => {
    expect(buyBitcoinButtonVariant(Chain.ONCHAIN, 2, 'DE')).toBe('list');
  });

  it('hides the button on lightning wallets', () => {
    expect(buyBitcoinButtonVariant(Chain.OFFCHAIN, 0, 'GB')).toBeNull();
    expect(buyBitcoinButtonVariant(Chain.OFFCHAIN, 4, 'US')).toBeNull();
  });

  it('hides the button in the UK', () => {
    expect(buyBitcoinButtonVariant(Chain.ONCHAIN, 3, 'GB')).toBeNull();
    expect(buyBitcoinButtonVariant(Chain.ONCHAIN, 0, 'gb')).toBeNull();
  });
});

describe('buyBitcoinUrl', () => {
  it('builds the moonpay redirect with the receive address and the api key', () => {
    const url = new URL(buyBitcoinUrl(RECEIVE_ADDRESS));

    expect(url.origin).toBe('https://moonpay-redirect.herokuapp.com');
    expect(url.pathname).toBe('/');
    expect(url.searchParams.get('apiKey')).toBe(MOONPAY_API_KEY);
    expect(url.searchParams.get('walletAddress')).toBe(RECEIVE_ADDRESS);
  });
});

const flattenPressableStyle = (style: unknown) => {
  const resolved = typeof style === 'function' ? style({ pressed: false }) : style;
  return StyleSheet.flatten(resolved);
};

describe('resolveBuyBitcoinReceiveAddress', () => {
  const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

  it('uses the scanned address and persists it when electrum answers in time', async () => {
    const saveToDisk = jest.fn(async () => undefined);
    const getAddress = jest.fn(() => 'bc1qunused');
    const address = await resolveBuyBitcoinReceiveAddress(
      {
        getAddressAsync: async () => RECEIVE_ADDRESS,
        getAddress,
      },
      { isElectrumDisabled: false, sleep: () => new Promise(() => undefined), saveToDisk },
    );

    expect(address).toBe(RECEIVE_ADDRESS);
    expect(saveToDisk).toHaveBeenCalledTimes(1);
    expect(getAddress).not.toHaveBeenCalled();
  });

  it('derives a local address when electrum does not answer before the timeout', async () => {
    const saveToDisk = jest.fn(async () => undefined);
    const address = await resolveBuyBitcoinReceiveAddress(
      {
        getAddressAsync: () => new Promise(() => undefined),
        _getExternalAddressByIndex: index => `bc1q-index-${index}`,
        getNextFreeAddressIndex: () => 4,
        getAddress: () => 'bc1qcached',
      },
      { isElectrumDisabled: false, sleep, saveToDisk, timeoutMs: 20 },
    );

    expect(address).toBe('bc1q-index-4');
    expect(saveToDisk).not.toHaveBeenCalled();
  });

  it('skips electrum when it is disabled and reads the cached address', async () => {
    const getAddressAsync = jest.fn(async () => RECEIVE_ADDRESS);
    const address = await resolveBuyBitcoinReceiveAddress(
      {
        getAddressAsync,
        getAddress: () => 'bc1qcached',
      },
      { isElectrumDisabled: true, sleep, saveToDisk: jest.fn(), timeoutMs: 20 },
    );

    expect(address).toBe('bc1qcached');
    expect(getAddressAsync).not.toHaveBeenCalled();
  });
});

describe('BuyBitcoinButton', () => {
  beforeEach(() => {
    jest.spyOn(Linking, 'openURL').mockClear().mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses theme colors for the empty-wallet button and grows with its label', () => {
    const { getByTestId, getByText } = render(<BuyBitcoinButton variant="empty" getReceiveAddress={async () => RECEIVE_ADDRESS} />);
    expect(getByText('Buy Bitcoin')).toBeTruthy();
    const style = flattenPressableStyle(getByTestId('BuyBitcoinButton').props.style);
    expect(style).toEqual(
      expect.objectContaining({
        alignSelf: 'stretch',
        backgroundColor: BlueDefaultTheme.colors.mainColor,
        borderRadius: 9,
        minHeight: 44,
        paddingVertical: 12,
      }),
    );
    expect(style.height).toBeUndefined();
    expect(style.width).toBeUndefined();
    expect(style.minWidth).toBeUndefined();
    const label = StyleSheet.flatten(getByText('Buy Bitcoin').props.style);
    expect(label).toEqual(
      expect.objectContaining({ alignSelf: 'stretch', color: BlueDefaultTheme.colors.buttonTextColor, textAlign: 'center' }),
    );
  });

  it('uses theme colors for the transaction-list button and grows with its label', () => {
    const { getByTestId, getByText } = render(<BuyBitcoinButton variant="list" getReceiveAddress={async () => RECEIVE_ADDRESS} />);
    expect(getByText('Buy Bitcoin')).toBeTruthy();
    const style = flattenPressableStyle(getByTestId('BuyBitcoinButton').props.style);
    expect(style).toEqual(
      expect.objectContaining({
        backgroundColor: BlueDefaultTheme.colors.lightButton,
        borderRadius: 9,
        minHeight: 49,
        paddingVertical: 12,
      }),
    );
    expect(style.height).toBeUndefined();
    const label = StyleSheet.flatten(getByText('Buy Bitcoin').props.style);
    expect(label).toEqual(
      expect.objectContaining({ alignSelf: 'stretch', color: BlueDefaultTheme.colors.buttonTextColor, textAlign: 'center' }),
    );
  });

  it('opens moonpay in the external browser with the receive address', async () => {
    const { getByTestId } = render(<BuyBitcoinButton variant="empty" getReceiveAddress={async () => RECEIVE_ADDRESS} />);
    fireEvent.press(getByTestId('BuyBitcoinButton'));
    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledTimes(1);
    });
    const opened = new URL((Linking.openURL as jest.Mock).mock.calls[0][0]);
    expect(opened.origin).toBe('https://moonpay-redirect.herokuapp.com');
    expect(opened.searchParams.get('apiKey')).toBe(MOONPAY_API_KEY);
    expect(opened.searchParams.get('walletAddress')).toBe(RECEIVE_ADDRESS);
  });

  it('does not open the browser when no receive address is available', async () => {
    const { getByTestId } = render(<BuyBitcoinButton variant="list" getReceiveAddress={async () => undefined} />);
    fireEvent.press(getByTestId('BuyBitcoinButton'));
    await waitFor(() => {
      expect(Linking.openURL).not.toHaveBeenCalled();
    });
  });

  it('ignores extra taps and shows a spinner while the address is loading', async () => {
    let resolveAddress: (address: string) => void = () => undefined;
    const getReceiveAddress = jest.fn(
      () =>
        new Promise<string>(resolve => {
          resolveAddress = resolve;
        }),
    );
    const { getByTestId, queryByText, findByText } = render(<BuyBitcoinButton variant="empty" getReceiveAddress={getReceiveAddress} />);

    fireEvent.press(getByTestId('BuyBitcoinButton'));
    fireEvent.press(getByTestId('BuyBitcoinButton'));

    expect(getReceiveAddress).toHaveBeenCalledTimes(1);
    expect(getByTestId('BuyBitcoinButtonActivity')).toBeTruthy();
    expect(queryByText('Buy Bitcoin')).toBeNull();
    expect(getByTestId('BuyBitcoinButton').props.accessibilityState).toEqual({ disabled: true, busy: true });

    resolveAddress(RECEIVE_ADDRESS);
    await waitFor(() => {
      expect(Linking.openURL).toHaveBeenCalledTimes(1);
    });
    expect(await findByText('Buy Bitcoin')).toBeTruthy();
    expect(getByTestId('BuyBitcoinButton').props.accessibilityState).toEqual({ disabled: false, busy: false });
  });
});
