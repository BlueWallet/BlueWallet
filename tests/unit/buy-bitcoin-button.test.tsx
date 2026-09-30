import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Linking, StyleSheet } from 'react-native';

import { BuyBitcoinButton, MOONPAY_API_KEY, buyBitcoinButtonVariant, buyBitcoinUrl } from '../../components/BuyBitcoinButton';
import { Chain } from '../../models/bitcoinUnits';

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

describe('BuyBitcoinButton', () => {
  beforeEach(() => {
    jest.spyOn(Linking, 'openURL').mockClear().mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('matches the empty-wallet Figma button', () => {
    const { getByTestId, getByText } = render(<BuyBitcoinButton variant="empty" getReceiveAddress={async () => RECEIVE_ADDRESS} />);
    expect(getByText('Buy Bitcoin')).toBeTruthy();
    const style = StyleSheet.flatten(getByTestId('BuyBitcoinButton').props.style);
    expect(style).toEqual(
      expect.objectContaining({
        backgroundColor: '#3478F6',
        borderRadius: 9,
        height: 44,
        minWidth: 260,
      }),
    );
    const label = StyleSheet.flatten(getByText('Buy Bitcoin').props.style);
    expect(label).toEqual(expect.objectContaining({ color: '#FFFFFF' }));
  });

  it('matches the transaction-list Figma button', () => {
    const { getByTestId, getByText } = render(<BuyBitcoinButton variant="list" getReceiveAddress={async () => RECEIVE_ADDRESS} />);
    expect(getByText('Buy Bitcoin')).toBeTruthy();
    const style = StyleSheet.flatten(getByTestId('BuyBitcoinButton').props.style);
    expect(style).toEqual(
      expect.objectContaining({
        backgroundColor: '#F2F2F2',
        borderRadius: 9,
        height: 49,
      }),
    );
    const label = StyleSheet.flatten(getByText('Buy Bitcoin').props.style);
    expect(label).toEqual(expect.objectContaining({ color: '#13244D' }));
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
});
