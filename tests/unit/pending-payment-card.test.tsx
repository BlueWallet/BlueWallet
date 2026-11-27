/**
 * H17 · The home card for a two-step payment that did not finish: it sends
 * only what the network does not have yet, and before dropping the notice it
 * says whether the coins already left.
 */
import React from 'react';
import { Alert } from 'react-native';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@react-navigation/native';

import type { ChainedSend, ChainedSendState } from '../../blue_modules/neurai/chainedSends';
import PendingPaymentCard from '../../components/home/PendingPaymentCard';
import { BlueDefaultTheme } from '../../components/themes';
import loc from '../../loc';

jest.mock('../../components/Alert', () => ({ __esModule: true, default: jest.fn(), AlertType: { Alert: 0, Toast: 1 } }));
// eslint-disable-next-line import/first
import presentAlert from '../../components/Alert';

const SEND: ChainedSend = {
  firstTxid: 'a'.repeat(64),
  first: '01aa',
  secondTxid: 'b'.repeat(64),
  second: '02bb',
  bridge: 'NbridgeAddress',
  to: 'sp1qexamplepaymentcodewithalotofcharacters',
  amountSats: '150000000',
  createdAt: 1_795_000_000,
};

function fakeWallet(state: ChainedSendState) {
  let sends: ChainedSend[] = [SEND];
  const broadcast: string[] = [];
  return {
    broadcast,
    getChainedSends: () => sends,
    recordChainedSend: (send: ChainedSend) => {
      sends = [...sends, send];
    },
    forgetChainedSend: (id: string) => {
      sends = sends.filter(s => s.firstTxid !== id);
    },
    reconcileChainedSends: jest.fn(async () => false),
    chainedSendStates: async () => new Map([[SEND.firstTxid, state]]),
    broadcastTx: async (hex: string) => {
      broadcast.push(hex);
      return hex;
    },
    addPendingTx: () => {},
    fetchTransactions: async () => {},
    fetchBalance: async () => {},
  };
}

const settle = () => act(async () => new Promise(resolve => setTimeout(resolve, 0)));
const show = (wallet: ReturnType<typeof fakeWallet>, save = jest.fn(async () => {})) =>
  render(
    <ThemeProvider value={BlueDefaultTheme as never}>
      <PendingPaymentCard wallet={wallet} saveToDisk={save} />
    </ThemeProvider>,
  );

describe('PendingPaymentCard (H17)', () => {
  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
    (presentAlert as jest.Mock).mockClear();
  });

  it('shows the amount and a short form of the code', async () => {
    show(fakeWallet('not-seen'));
    await settle();
    expect(screen.getByText(loc.home.pending_payment_title)).toBeTruthy();
    expect(screen.getByText(/1\.5 XNA/)).toBeTruthy();
    expect(screen.getByText(/sp1qexamplep…aracters/)).toBeTruthy();
  });

  it('finishing a payment whose first step the network has sends only the second', async () => {
    const wallet = fakeWallet('first-seen');
    const save = jest.fn(async () => {});
    show(wallet, save);
    await settle();
    fireEvent.press(screen.getByTestId('PendingPaymentFinish'));
    await settle();
    await settle();
    expect(wallet.broadcast).toEqual([SEND.second]);
    expect(wallet.getChainedSends()).toEqual([]);
    expect(save).toHaveBeenCalled();
    expect(presentAlert).toHaveBeenCalledWith({ tone: 'success', message: loc.home.pending_payment_done });
  });

  it('finishing a payment nothing of which was seen sends both, in order', async () => {
    const wallet = fakeWallet('not-seen');
    show(wallet);
    await settle();
    fireEvent.press(screen.getByTestId('PendingPaymentFinish'));
    await settle();
    await settle();
    expect(wallet.broadcast).toEqual([SEND.first, SEND.second]);
  });

  it.each([
    ['not-seen', () => loc.home.pending_payment_discard_unsent],
    ['first-seen', () => String(loc.formatString(loc.home.pending_payment_discard_sent, { bridge: SEND.bridge }))],
  ] as const)('discarding (%s) says whether the coins left, and forgets only after confirming', async (state, message) => {
    const wallet = fakeWallet(state);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    show(wallet);
    await settle();
    fireEvent.press(screen.getByTestId('PendingPaymentDiscard'));
    await settle();
    expect(alert).toHaveBeenCalledTimes(1);
    expect(alert.mock.calls[0][1]).toBe(message());
    expect(wallet.getChainedSends()).toHaveLength(1); // nothing dropped yet
    const confirm = alert.mock.calls[0][2]!.find(button => button.style === 'destructive')!;
    act(() => confirm.onPress!());
    expect(wallet.getChainedSends()).toEqual([]);
    expect(wallet.broadcast).toEqual([]);
  });
});
