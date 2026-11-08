import { MultisigHDWallet } from '../../class/wallets/multisig-hd-wallet';
import { HDSegwitBech32Wallet } from '../../class/wallets/hd-segwit-bech32-wallet';
import { TWallet, Transaction } from '../../class/wallets/types';
import { WalletDescriptor } from '../../class/wallet-descriptor';
import { createBip329WalletHistoryBackup, getBip329Keypath, getBip329Origin } from '../../blue_modules/bip329-wallet-history';

describe('BIP-329 wallet history backup', () => {
  it('exports owned address labels from a wallet without any transactions', () => {
    jest.spyOn(WalletDescriptor, 'fromWallet').mockReturnValue(undefined);
    const wallet = {
      getTransactions: () => [],
      weOwnAddress: (address: string) => address === 'bc1qunused',
    } as unknown as TWallet;
    const records = createBip329WalletHistoryBackup(
      wallet,
      {},
      {
        bc1qunused: { label: 'Future payment' },
        bc1qforeign: { label: 'Other wallet' },
      },
    )
      .split('\n')
      .map(line => JSON.parse(line));
    expect(records).toEqual([{ type: 'addr', ref: 'bc1qunused', label: 'Future payment' }]);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('derives single-sig and multisig origins', () => {
    const singleSig = {} as TWallet;
    jest
      .spyOn(WalletDescriptor, 'fromWallet')
      .mockReturnValueOnce("wpkh([D34DB33F/84'/0'/0']xpub-example/0/*)")
      .mockReturnValueOnce(undefined);

    expect(getBip329Origin(singleSig)).toBe("wpkh([D34DB33F/84'/0'/0'])");

    const multisig = new MultisigHDWallet();
    jest.spyOn(multisig, 'getN').mockReturnValue(2);
    jest.spyOn(multisig, 'getM').mockReturnValue(2);
    jest.spyOn(multisig, 'getCustomDerivationPathForCosigner').mockReturnValueOnce("m/48'/0'/0'/2'").mockReturnValueOnce("m/48'/0'/0'/2'");
    jest.spyOn(multisig, 'getFingerprint').mockReturnValueOnce('A1B2C3D4').mockReturnValueOnce('E5F60718');
    jest.spyOn(multisig, 'isNativeSegwit').mockReturnValue(true);

    expect(getBip329Origin(multisig)).toBe("wsh(sortedmulti(2,[a1b2c3d4/48'/0'/0'/2'],[e5f60718/48'/0'/0'/2']))");
  });

  it('uses the multisig custom derivation path without exception-driven fallback', () => {
    const multisig = new MultisigHDWallet();
    jest.spyOn(multisig, 'getCustomDerivationPathForCosigner').mockReturnValue("m/48'/0'/0'/2'");
    const derive = jest.spyOn(multisig, '_getDerivationPathByAddressWithCustomPath').mockReturnValue("m/48'/0'/0'/2'/1/7");
    const legacyDerive = jest.spyOn(multisig, '_getDerivationPathByAddress');

    expect(getBip329Keypath(multisig, 'bc1qused')).toBe('/1/7');
    expect(derive).toHaveBeenCalledWith('bc1qused', "m/48'/0'/0'/2'");
    expect(legacyDerive).not.toHaveBeenCalled();
  });

  it('omits BIP-47 keypaths that cannot extend the exported BIP-84 origin', () => {
    const wallet = new HDSegwitBech32Wallet();
    // Public BIP-47 test-vector seed and counterparty payment code.
    wallet.setSecret('reward upper indicate eight swift arch injury crystal super wrestle already dentist');
    wallet._receive_payment_codes = [
      'PM8TJi1RuCrgSHTzGMoayUf8xUW6zYBGXBPSWwTiMhMMwqto7G6NA4z9pN5Kn8Pbhryo2eaHMFRRcidCGdB3VCDXJD4DdPD2ZyG3ScLMEvtStAetvPMo',
    ];
    const address = wallet._getBIP47AddressReceive(wallet._receive_payment_codes[0], 0);
    expect(wallet._getDerivationPathByAddress(address)).toBe("m/47'/0'/0'/0");
    expect(getBip329Keypath(wallet, wallet._getExternalAddressByIndex(0))).toBe('/0/0');
    expect(getBip329Keypath(wallet, wallet._getInternalAddressByIndex(1))).toBe('/1/1');

    const record = JSON.parse(createBip329WalletHistoryBackup(wallet, {}, { [address]: { label: 'BIP-47 payment' } }));
    expect(record).toMatchObject({ type: 'addr', ref: address, label: 'BIP-47 payment', origin: getBip329Origin(wallet) });
    expect(record).not.toHaveProperty('keypath');
  });

  it.each([
    ["m/84'/0'/0'/0/7", "m/84'/0'/0'", '/0/7'],
    ["m/84'/0'/0'/0/7", "m/84'/0'/0", undefined],
    ["m/84'/0'/0'", "m/84'/0'/0'", undefined],
    ["m/84'/0'/0'/0/7", undefined, undefined],
    [false, "m/84'/0'/0'", undefined],
  ] as const)('only exports paths within the account at a component boundary: %s, %s', (fullPath, accountPath, expected) => {
    const wallet = {
      _getDerivationPathByAddress: () => fullPath,
      getDerivationPath: () => accountPath,
    } as unknown as TWallet;
    expect(getBip329Keypath(wallet, 'address')).toBe(expected);
  });

  it('exports unused owned address labels and tolerates outputs without script details', () => {
    jest.spyOn(WalletDescriptor, 'fromWallet').mockReturnValue(undefined);
    const transaction = {
      txid: 'a'.repeat(64),
      hash: 'a'.repeat(64),
      version: 2,
      size: 100,
      vsize: 80,
      weight: 320,
      locktime: 0,
      inputs: [],
      outputs: [{ value: 0.001, n: 0 }],
      timestamp: 0,
      confirmations: 0,
      value: 100_000,
      fee: 0.0001,
    } as unknown as Transaction;
    const wallet = {
      getTransactions: () => [transaction],
      weOwnAddress: (address: string) => address !== 'bc1qforeign',
      _getDerivationPathByAddress: (address: string) => (address === 'bc1qunused' ? "m/84'/0'/0'/0/9" : false),
      getDerivationPath: () => "m/84'/0'/0'",
      getUTXOMetadata: () => ({}),
    } as unknown as TWallet;

    const records = createBip329WalletHistoryBackup(
      wallet,
      { [transaction.txid]: { memo: 'Transaction note' } },
      {
        bc1qunused: { label: 'Unused receive address' },
        bc1qforeign: { label: 'Different wallet' },
      },
    )
      .split('\n')
      .map(line => JSON.parse(line));

    expect(records).toContainEqual(
      expect.objectContaining({ type: 'addr', ref: 'bc1qunused', label: 'Unused receive address', keypath: '/0/9' }),
    );
    expect(records).not.toContainEqual(expect.objectContaining({ ref: 'bc1qforeign' }));
    expect(records).toContainEqual(expect.objectContaining({ type: 'tx', ref: transaction.txid, label: 'Transaction note' }));
    expect(records.find(record => record.type === 'tx').fee).toBe(10_000);
    expect(records).toContainEqual(expect.objectContaining({ type: 'output', ref: `${transaction.txid}:0` }));
  });
});
