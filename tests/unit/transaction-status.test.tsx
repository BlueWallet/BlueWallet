/**
 * The transaction screen: what the wallet's history says at once, and the
 * fee, block and other side from the node's verbose transaction when it
 * arrives. The node answer below is a real testnet send (1 XNA back to the
 * funding address, change to the wallet).
 */
import React from 'react';
import { Linking } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { counterparties, isSelfTransfer, parseVerboseTransaction } from '../../blue_modules/neurai/transactionDetails';
import presentAlert, { AlertType } from '../../components/Alert';
import { BlueDefaultTheme } from '../../components/themes';
import loc from '../../loc';
import TransactionStatus from '../../screen/transactions/TransactionStatus';

const TXID = '013ab47ed4f7d56a442a714a0fb6014129987aa6915de34eade1584720d10dd5';
const OWN = ['tCEDTHevFvG9CF6SCw3c4E7yxi9Tmnvr2x', 't9YSTjLHdSpunmKbnzvxf9ySRHmwvpuMVZ'];
const FUNDER = 't9P7EdK8c5RB9Hqojh7JBFYRpdwxUuvLgA';
const NODE_TX = {
  txid: TXID,
  hash: TXID,
  size: 226,
  vin: [
    { txid: 'b99c2e41b325ebbd3ae15575012ae50ab77eb4db156152273e6a8673d8f22aa1', vout: 0, value: 2, valueSat: 200000000, address: OWN[0] },
  ],
  vout: [
    { value: 1, n: 0, scriptPubKey: { addresses: [FUNDER], type: 'pubkeyhash' }, valueSat: 100000000 },
    { value: 0.997276, n: 1, scriptPubKey: { addresses: [OWN[1]], type: 'pubkeyhash' }, valueSat: 99727600 },
  ],
  blockhash: '0000301432d9e6b4c88e0060117edf0384f8c1c82ad9967475061b957923fd56',
  height: 62525,
  confirmations: 122,
  time: 1795790851,
  blocktime: 1795790851,
};

describe('parseVerboseTransaction', () => {
  it('reads the fee, block and both sides of a real send', () => {
    const details = parseVerboseTransaction(NODE_TX)!;
    expect(details.feeSats).toBe(272400n);
    expect(details.blockHeight).toBe(62525);
    expect(details.confirmations).toBe(122);
    // The recipient first, then the change back to the wallet.
    expect(counterparties(details, true, a => OWN.includes(a))).toEqual([
      { address: FUNDER, valueSats: 100000000n, asset: undefined, own: false },
      { address: OWN[1], valueSats: 99727600n, asset: undefined, own: true },
    ]);
    expect(counterparties(details, false, a => OWN.includes(a))).toEqual([]);
    expect(isSelfTransfer(details, a => OWN.includes(a))).toBe(false);
  });

  it('a privacy pool deposit (real testnet tx 878e6555…): the pool shows what it gained, its state token is not a destination', () => {
    const POOL = 'tnc1pttnygklkznkm45ng9ns4ta42h7lmgxx6dnr2vxex49g3np5t8rvsugulnc';
    const STATE = 'tnc1pch4yh52sd44e2y6gyc73w8vjcjgyy9t44g7gk000phhusgl5ka3qpjj0jv';
    const MINE = 'tnq1rptvuhu7rxp298cupyaunfgm7qev2rux0eckjhdu364g5gfwumk5qr90zq0';
    const details = parseVerboseTransaction({
      vin: [
        { txid: 'a', vout: 0, valueSat: 0, address: STATE },
        { txid: 'b', vout: 1, valueSat: 919960000000, address: POOL },
        { txid: 'c', vout: 0, valueSat: 10010000000, address: MINE },
      ],
      vout: [
        { n: 0, valueSat: 0, scriptPubKey: { addresses: [STATE], type: 'transfer_asset', asset: { name: 'C7TEST1106A#POOL', amount: 1 } } },
        { n: 1, valueSat: 929960000000, scriptPubKey: { addresses: [POOL], type: 'witness_v1_authscript' } },
      ],
    })!;
    expect(details.feeSats).toBe(10000000n); // 0.1 XNA
    expect(counterparties(details, true, a => a === MINE)).toEqual([{ address: POOL, own: false, valueSats: 10000000000n }]);
  });

  it('a payment to oneself lists the wallet’s own addresses; an asset sent shows its amount', () => {
    const details = parseVerboseTransaction({
      ...NODE_TX,
      vout: [
        { n: 0, valueSat: 50000000, scriptPubKey: { addresses: [OWN[0]] } },
        { n: 1, valueSat: 149727600, scriptPubKey: { addresses: [OWN[1]] } },
      ],
    })!;
    expect(isSelfTransfer(details, a => OWN.includes(a))).toBe(true);
    expect(counterparties(details, true, a => OWN.includes(a)).map(party => party.own)).toEqual([true, true]);

    const asset = parseVerboseTransaction({
      ...NODE_TX,
      vout: [{ n: 0, valueSat: 0, scriptPubKey: { addresses: [FUNDER], asset: { name: 'LEMON', amount: 100 } } }],
    })!;
    expect(counterparties(asset, true, a => OWN.includes(a))).toEqual([
      { address: FUNDER, own: false, valueSats: null, asset: { name: 'LEMON', amount: '100' } },
    ]);
  });

  it('leaves out what it cannot know: no fee without input values, nothing for a malformed answer', () => {
    const noValues = { ...NODE_TX, vin: [{ txid: 'x', vout: 0 }] };
    expect(parseVerboseTransaction(noValues)!.feeSats).toBeNull();
    const mempool = { ...NODE_TX, height: undefined, blockhash: undefined, confirmations: undefined };
    expect(parseVerboseTransaction(mempool)).toMatchObject({ blockHeight: null, confirmations: null });
    expect(parseVerboseTransaction(null)).toBeNull();
    expect(parseVerboseTransaction({ vin: 'x' })).toBeNull();
  });
});

const rpc = jest.fn();
// Stable, as the wallet's cached history is between refreshes.
const HISTORY = [{ hash: TXID, txid: TXID, value: -100272400n, confirmations: 3, timestamp: 1795790851 }];
const wallet = {
  getID: () => 'wallet-1',
  getTransactions: () => HISTORY,
  getAllExternalAddresses: () => OWN,
  getBackend: () => ({ rpc }),
  network: 'xna-test',
};
const saveToDisk = jest.fn(async () => {});
const txMetadata: Record<string, { memo?: string }> = {};
const WALLETS = [wallet];
jest.mock('../../hooks/context/useStorage', () => ({ useStorage: () => ({ wallets: WALLETS, txMetadata, saveToDisk }) }));
jest.mock('../../hooks/context/useSettings', () => ({
  useSettings: () => ({
    selectedBlockExplorer: { url: 'https://explorer.neurai.org' },
    selectedTestnetBlockExplorer: { url: 'https://rebel-explorer-testnet.neurai.org' },
  }),
}));
jest.mock('../../hooks/useExtendedNavigation', () => ({ useExtendedNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }) }));
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const { useEffect } = jest.requireActual('react');
  return {
    ...actual,
    useRoute: () => ({ params: { hash: TXID, walletID: 'wallet-1' } }),
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});
jest.mock('../../blue_modules/neurai/privacy/txTags', () => ({ usePrivacyTxKind: () => undefined }));
jest.mock('../../components/Alert', () => ({ __esModule: true, default: jest.fn(), AlertType: { Alert: 0, Toast: 1 } }));
jest.mock('../../blue_modules/hapticFeedback', () => ({
  __esModule: true,
  default: jest.fn(),
  HapticFeedbackTypes: { Selection: 'selection' },
}));

const SAFE_AREA = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const show = () =>
  render(
    <SafeAreaProvider initialMetrics={SAFE_AREA}>
      <ThemeProvider value={BlueDefaultTheme as never}>
        <TransactionStatus />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
const settle = () => act(async () => new Promise(resolve => setTimeout(resolve, 0)));

describe('TransactionStatus screen', () => {
  afterEach(() => {
    cleanup();
    rpc.mockReset();
  });

  it('shows the history at once, then the node: live confirmations, fee, block and recipient', async () => {
    let answer: (value: unknown) => void = () => {};
    rpc.mockImplementation(() => new Promise(resolve => (answer = resolve)));
    show();
    await settle();
    expect(screen.getByTestId('TransactionAmount').props.children).toBe('−1.002724 XNA');
    expect(screen.getByText(String(loc.formatString(loc.transactions.status_confirmed, { count: '3' })))).toBeTruthy();
    expect(screen.getByText(loc.transactions.details_loading)).toBeTruthy();
    expect(rpc).toHaveBeenCalledWith('getrawtransaction', [TXID, true]);

    await act(async () => answer(NODE_TX));
    expect(screen.getByText(String(loc.formatString(loc.transactions.status_confirmed, { count: (122).toLocaleString() })))).toBeTruthy();
    expect(screen.getByText('0.002724 XNA')).toBeTruthy();
    expect(screen.getByText((62525).toLocaleString())).toBeTruthy();
    expect(screen.getByText(FUNDER)).toBeTruthy();
    expect(screen.getAllByTestId('TransactionCounterparty')).toHaveLength(2);
    expect(screen.getByText('1 XNA')).toBeTruthy(); // what the recipient got
    expect(screen.getByText(OWN[1])).toBeTruthy(); // the change, marked as the wallet's
    expect(screen.getByText(loc.transactions.details_own)).toBeTruthy();
    // A tap on an address copies it, with a short notice.
    fireEvent.press(screen.getAllByTestId('TransactionCounterparty')[0]);
    expect(Clipboard.setString).toHaveBeenCalledWith(FUNDER);
    expect(presentAlert).toHaveBeenLastCalledWith({ message: loc.home.copied, type: AlertType.Toast });
  });

  it('without the node, the rest still works: copy the ID, open the explorer, keep a note', async () => {
    rpc.mockRejectedValue(new Error('offline'));
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    show();
    await settle();
    expect(screen.getByText(loc.transactions.details_unavailable)).toBeTruthy();
    expect(screen.queryByTestId('TransactionFee')).toBeNull();

    fireEvent.press(screen.getByTestId('TransactionCopyID'));
    expect(Clipboard.setString).toHaveBeenCalledWith(TXID);
    expect(presentAlert).toHaveBeenLastCalledWith({ message: loc.transactions.txid_copied, type: AlertType.Toast });
    fireEvent.press(screen.getByTestId('TransactionOpenExplorer'));
    expect(open).toHaveBeenCalledWith(`https://rebel-explorer-testnet.neurai.org/tx/${TXID}`);
    expect(screen.getByText(loc.transactions.details_view_in_browser)).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('TransactionDetailsMemoInput'), 'Rent');
    fireEvent(screen.getByTestId('TransactionDetailsMemoInput'), 'blur');
    expect(txMetadata[TXID]).toEqual({ memo: 'Rent' });
    expect(saveToDisk).toHaveBeenCalled();
  });
});
