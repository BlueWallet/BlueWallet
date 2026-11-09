import React from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '@react-navigation/native';
import * as bitcoin from 'bitcoinjs-lib';
import * as bip39 from 'bip39';
import { BIP32Factory } from 'bip32';
import ecc from '../../blue_modules/noble_ecc';
import { MultisigHDWallet } from '../../class/wallets/multisig-hd-wallet';
import { BlueDefaultTheme } from '../../components/themes';
import PsbtMultisig from '../../screen/send/psbtMultisig';
import SendDetails from '../../screen/send/SendDetails';
import Confirm from '../../screen/send/Confirm';
import SendCreate from '../../screen/send/create';
import { uint8ArrayToHex } from '../../blue_modules/uint8array-extras';
import { MenuActionHandlers } from '../../blue_modules/menuActions';

const seeds = [
  'certain cruise forum ladder reveal frame company book sausage flat wasp mouse',
  'sting tumble brave remember sadness embrace increase under year joke drum skate',
];
const derivation = "m/48'/0'/0'/2'";
const bip32 = BIP32Factory(ecc);
const recipient = 'bc1qsxz98xaa0t7dl9d6cluwcxvchr7yx3uhjajxez';
const secondRecipient = 'bc1q7x8r02rs3h09lngzqjspya4mx7szz6fh7y36wc';
const p2pk = bitcoin.payments.p2pk({ pubkey: bip32.fromSeed(bip39.mnemonicToSeedSync(seeds[1])).publicKey }).output!;
const publicKey = uint8ArrayToHex(p2pk.slice(1, -1));
const wrongPush = p2pk.slice();
wrongPush[0] = bitcoin.opcodes.OP_NOP;
const uncompressedP2pk = bitcoin.payments.p2pk({ pubkey: ecc.pointCompress(p2pk.slice(1, -1), false) }).output!;
let wallet: MultisigHDWallet;
let routeParams: Record<string, unknown>;
let menuActions: MenuActionHandlers;
let menuHandler: (id: string) => void;
const storage = { wallets: [] as MultisigHDWallet[], sleep: async () => {}, txMetadata: {}, saveToDisk: async () => {} };
const alertMock = jest.fn();
const navigation = {
  navigate: jest.fn(),
  setParams: jest.fn(),
  setOptions: jest.fn(),
  goBack: jest.fn(),
  dispatch: jest.fn(),
  addListener: () => () => {},
};

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const { useEffect } = require('react');
  return {
    ...actual,
    useNavigation: () => navigation,
    useRoute: () => ({ params: routeParams }),
    useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]),
    useLocale: () => ({ direction: 'ltr' }),
  };
});
jest.mock('../../hooks/context/useSettings', () => ({ useSettings: () => ({ isElectrumDisabled: false }) }));
jest.mock('../../hooks/useBiometrics', () => ({
  useBiometrics: () => ({ isBiometricUseCapableAndEnabled: async () => false }),
  unlockWithBiometrics: async () => true,
}));
jest.mock('../../hooks/context/useStorage', () => ({
  useStorage: () => storage,
}));
jest.mock('../../components/headerMenuOptions', () => ({
  createEllipsisHeaderMenuOptions: ({ onPressMenuItem }: { onPressMenuItem: (id: string) => void }) => {
    menuHandler = onPressMenuItem;
    return { headerRight: () => null };
  },
}));
jest.mock('../../hooks/useScreenMenuActions', () => ({
  __esModule: true,
  default: (actions: MenuActionHandlers) => {
    menuActions = actions;
  },
}));
jest.mock('../../blue_modules/BlueElectrum', () => ({
  isDisabled: async () => false,
  estimateFees: async () => ({ fast: 3, medium: 2, slow: 1 }),
  ensureConnected: async () => true,
  multiGetUtxoByAddress: async () => ({}),
  multiGetTransactionByTxid: async () => ({}),
}));
jest.mock('../../components/SafeArea', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('../../components/DismissKeyboardInputAccessory', () => ({
  DismissKeyboardInputAccessory: () => null,
  DismissKeyboardInputAccessoryViewID: 'DismissKeyboardInputAccessoryViewID',
}));
jest.mock('../../components/InputAccessoryAllFunds', () => ({
  __esModule: true,
  default: () => null,
  InputAccessoryAllFundsAccessoryViewID: 'InputAccessoryAllFundsAccessoryViewID',
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: async () => null, setItem: async () => {} },
}));
jest.mock(
  '../../components/Alert',
  () =>
    (...args: unknown[]) =>
      alertMock(...args),
);
jest.mock('../../screen/ActionSheet', () => ({
  __esModule: true,
  default: { showActionSheetWithOptions: (...args: unknown[]) => alertMock(...args) },
}));
jest.mock('../../blue_modules/hapticFeedback', () => ({
  __esModule: true,
  default: () => {},
  HapticFeedbackTypes: { NotificationError: 'NotificationError', NotificationSuccess: 'NotificationSuccess', Selection: 'Selection' },
}));

function makeWallet() {
  const w = new MultisigHDWallet();
  w.setM(2);
  w.setDerivationPath(derivation);
  w.setNativeSegwit();
  seeds.forEach((seed, index) =>
    w.addCosigner(
      index === 0 ? seed : MultisigHDWallet.seedToXpub(seed, derivation),
      MultisigHDWallet.mnemonicToFingerprint(seed),
      derivation,
    ),
  );
  return w;
}

type Output = { address: string; value: bigint } | { script: Uint8Array; value: bigint };
function makePsbt(outputs: Output[]) {
  const address = wallet._getExternalAddressByIndex(0);
  const prev = new bitcoin.Transaction();
  prev.addInput(new Uint8Array(32).fill(1), 0);
  prev.addOutput(bitcoin.address.toOutputScript(address), 100000000n);
  const psbt = new bitcoin.Psbt();
  wallet._addPsbtInput(psbt, { address, txid: prev.getId(), vout: 0, txhex: prev.toHex(), value: 100000000 }, 0xfffffffd);
  outputs.forEach(output => psbt.addOutput(output));
  // An actual remote cosigner signature, not a stubbed wallet or PSBT.
  psbt.signInputHD(0, bip32.fromSeed(bip39.mnemonicToSeedSync(seeds[1])));
  return psbt;
}

const tree = (screen: React.ReactNode) => <ThemeProvider value={BlueDefaultTheme}>{screen}</ThemeProvider>;
function review(psbt: bitcoin.Psbt, extra: Record<string, unknown> = {}) {
  routeParams = { walletID: wallet.getID(), psbtBase64: psbt.toBase64(), ...extra };
  return render(tree(<PsbtMultisig />));
}

beforeEach(() => {
  jest.clearAllMocks();
  // Native action sheets need an anchor; the test renderer has no native view tag.
  jest.spyOn(require('react-native'), 'findNodeHandle').mockReturnValue(1);
  wallet = makeWallet();
  storage.wallets = [wallet];
  routeParams = { walletID: wallet.getID(), isEditable: true };
});

function text(node: unknown): string {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(text).join('');
  return text((node as { children?: unknown }).children);
}
const visible = (screen: ReturnType<typeof render>) => text(screen.toJSON());
const fixtureOutputs = () => [
  { address: recipient, value: 10000n },
  { script: p2pk, value: 99980000n },
];

function renderConfirmFromNavigation() {
  const params = navigation.navigate.mock.calls.find(([name]) => name === 'Confirm')![1];
  routeParams = params;
  return render(tree(<Confirm />));
}

describe('multisig destination display', () => {
  it('shows both reported outputs and their total, key and actual fee in summary and Confirm', () => {
    const psbt = makePsbt(fixtureOutputs());
    wallet.cosignPsbt(psbt);
    const screen = review(psbt);
    expect(visible(screen)).toContain('Pay to public key');
    expect(visible(screen)).toContain(publicKey);
    expect(visible(screen)).toContain('0.9999');
    expect(visible(screen)).toContain('0.9998');
    expect(visible(screen)).toContain('0.0001');
    fireEvent.press(screen.getByTestId('PsbtMultisigConfirmButton'));
    const confirmed = renderConfirmFromNavigation();
    expect(confirmed.getAllByTestId('TransactionValue').map(text)).toEqual(['0.0001', '0.9998']);
    expect(visible(confirmed)).toContain('Pay to public key');
    expect(visible(confirmed)).toContain(publicKey);
    expect(text(confirmed.getByTestId('TransactionFee'))).toContain('0.0001 BTC');
  });

  it.each([
    ['P2PK only', [{ script: p2pk, value: 99990000n }], ['Pay to public key', publicKey, '0.9999']],
    [
      'uncompressed P2PK',
      [{ script: uncompressedP2pk, value: 99990000n }],
      ['Pay to public key', uint8ArrayToHex(uncompressedP2pk.slice(1, -1)), '0.9999'],
    ],
    [
      'zero-value OP_RETURN',
      [
        { address: recipient, value: 99990000n },
        { script: new Uint8Array([106, 1, 42]), value: 0n },
      ],
      ['OP_RETURN', '6a012a'],
    ],
    ['nonzero OP_RETURN', [{ script: new Uint8Array([106, 1, 42]), value: 99990000n }], ['OP_RETURN', '6a012a', '0.9999']],
    ['raw-script fallback', [{ script: new Uint8Array([81]), value: 99990000n }], ['Unknown output script', '51', '0.9999']],
    [
      'not P2PK despite a valid key and CHECKSIG',
      [{ script: wrongPush, value: 99990000n }],
      ['Unknown output script', uint8ArrayToHex(wrongPush)],
    ],
    [
      'three outputs',
      [
        { address: recipient, value: 10000n },
        { script: p2pk, value: 99980000n },
        { script: new Uint8Array([106]), value: 0n },
      ],
      ['Pay to public key', publicKey, 'OP_RETURN'],
    ],
  ] as [string, Output[], string[]][])('displays %s without losing amounts or destinations', (_name, outputs, expected) => {
    const psbt = makePsbt(outputs);
    wallet.cosignPsbt(psbt);
    const screen = review(psbt);
    for (const value of expected) expect(visible(screen)).toContain(value);
    expect(visible(screen)).toContain('0.9999');
    fireEvent.press(screen.getByTestId('PsbtMultisigConfirmButton'));
    const confirmed = renderConfirmFromNavigation();
    for (const value of expected) expect(visible(confirmed)).toContain(value);
    expect(confirmed.getAllByTestId('TransactionValue').map(text)).toEqual(outputs.map(output => String(Number(output.value) / 100000000)));
  });

  it('keeps a long single OP_RETURN fully readable in a scrolling confirmation without address actions', () => {
    const script = bitcoin.payments.embed({ data: [new Uint8Array(300).fill(42)] }).output!;
    const hex = uint8ArrayToHex(script);
    const psbt = makePsbt([{ script, value: 99990000n }]);
    wallet.cosignPsbt(psbt);
    const screen = review(psbt);
    const summaryText = screen.getByText(new RegExp(hex));
    expect(summaryText.props.numberOfLines).toBeUndefined();
    expect(summaryText.props.onPress).toBeUndefined();
    expect(StyleSheet.flatten(summaryText.props.style).flexShrink).toBe(1);
    fireEvent.press(screen.getByTestId('PsbtMultisigConfirmButton'));
    const confirmed = renderConfirmFromNavigation();
    const destination = confirmed.getByText(new RegExp(hex));
    expect(text(destination)).toBe(`OP_RETURN (data)\n${hex}`);
    expect(destination.props.numberOfLines).toBeUndefined();
    expect(destination.props.onPress).toBeUndefined();
    const list = confirmed.UNSAFE_getByType(FlatList);
    expect(list.props.scrollEnabled).not.toBe(false);
    expect(StyleSheet.flatten(list.props.style).width).toBe('100%');
    expect(confirmed.getAllByTestId('TransactionValue').map(text)).toEqual(['0.9999']);
  });

  it('preserves normal address recipients and existing owned-address change filtering', () => {
    const change = wallet._getInternalAddressByIndex(0);
    const psbt = makePsbt([
      { address: recipient, value: 10000n },
      { address: secondRecipient, value: 10000n },
      { address: change, value: 99970000n },
    ]);
    wallet.cosignPsbt(psbt);
    const screen = review(psbt);
    expect(visible(screen)).toContain(recipient);
    expect(visible(screen)).toContain(secondRecipient);
    expect(visible(screen)).not.toContain(change);
    for (const part of [recipient.slice(0, 6), recipient.slice(-6)]) {
      expect(StyleSheet.flatten(screen.getByText(part).props.style).color).toBe(BlueDefaultTheme.colors.alternativeTextColor2);
    }
    expect(visible(screen)).toContain('0.0002');
    fireEvent.press(screen.getByText('0.0002'));
    expect(visible(screen)).toContain(change);
    expect(visible(screen)).toContain('0.9999');
    fireEvent.press(screen.getByText('0.9999'));
    expect(visible(screen)).not.toContain(change);
    fireEvent.press(screen.getByTestId('PsbtMultisigConfirmButton'));
    const confirmed = renderConfirmFromNavigation();
    expect(confirmed.getAllByTestId('TransactionValue').map(text)).toEqual(['0.0001', '0.0001']);
    expect(visible(confirmed)).not.toContain(change);
    expect(text(confirmed.getByTestId('TransactionFee'))).toContain('0.0001 BTC');
  });

  it('retains the shown public key and amount in existing transaction Details', async () => {
    const psbt = makePsbt(fixtureOutputs());
    wallet.cosignPsbt(psbt);
    const screen = review(psbt);
    fireEvent.press(screen.getByTestId('PsbtMultisigConfirmButton'));
    const confirmed = renderConfirmFromNavigation();
    const options = navigation.setOptions.mock.calls.at(-1)![0];
    await act(async () => options.headerRight().props.onPress());
    const params = navigation.navigate.mock.calls.find(([name]) => name === 'CreateTransaction')![1];
    confirmed.unmount();
    routeParams = params;
    const details = render(tree(<SendCreate />));
    expect(visible(details)).toContain('Pay to public key');
    expect(visible(details)).toContain(publicKey);
    expect(visible(details)).toContain('0.9998 BTC');
  });
});

describe('existing import signing sequence is unchanged', () => {
  it.each(['co_sign_transaction', 'sign_psbt'] as const)('%s still signs before its existing destination screen', async action => {
    const psbt = makePsbt(fixtureOutputs());
    const signer = jest.spyOn(wallet, 'cosignPsbt');
    const screen = render(tree(<SendDetails />));
    await waitFor(() => expect(menuActions.co_sign_transaction).toBeDefined());
    act(() => menuHandler(action));
    navigation.navigate.mockClear();
    routeParams = { ...routeParams, onBarScanned: psbt.toBase64() };
    screen.rerender(tree(<SendDetails />));
    const destination = action === 'co_sign_transaction' ? 'PsbtMultisig' : 'CreateTransaction';
    await waitFor(() => expect(navigation.navigate).toHaveBeenCalledWith(destination, expect.anything()));
    expect(signer).toHaveBeenCalledTimes(1);
    expect(signer.mock.invocationCallOrder[0]).toBeLessThan(navigation.navigate.mock.invocationCallOrder[0]);
    const params = navigation.navigate.mock.calls.find(([name]) => name === destination)![1];
    const signed = action === 'co_sign_transaction' ? bitcoin.Psbt.fromBase64(params.psbtBase64) : params.psbt;
    expect(signed.extractTransaction().outs.map((output: { value: bigint }) => output.value)).toEqual([10000n, 99980000n]);
    screen.unmount();
    routeParams = params;
    const reviewed = render(tree(action === 'co_sign_transaction' ? <PsbtMultisig /> : <SendCreate />));
    expect(visible(reviewed)).toContain('Pay to public key');
    expect(visible(reviewed)).toContain(publicKey);
    expect(reviewed.queryByTestId('SignMultisigPsbt')).toBeNull();
  });
});
