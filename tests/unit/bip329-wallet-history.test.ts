import { MultisigHDWallet } from '../../class/wallets/multisig-hd-wallet';
import { HDSegwitBech32Wallet } from '../../class/wallets/hd-segwit-bech32-wallet';
import { TWallet, Transaction } from '../../class/wallets/types';
import { WalletDescriptor } from '../../class/wallet-descriptor';
import { createBip329WalletHistoryBackup, getBip329Keypath, getBip329Origin } from '../../blue_modules/bip329-wallet-history';

const createBip47Wallet = () => {
  const wallet = new HDSegwitBech32Wallet();
  // Public BIP-47 test-vector seed and counterparty payment code.
  wallet.setSecret('reward upper indicate eight swift arch injury crystal super wrestle already dentist');
  wallet._receive_payment_codes = [
    'PM8TJi1RuCrgSHTzGMoayUf8xUW6zYBGXBPSWwTiMhMMwqto7G6NA4z9pN5Kn8Pbhryo2eaHMFRRcidCGdB3VCDXJD4DdPD2ZyG3ScLMEvtStAetvPMo',
  ];
  return wallet;
};

describe('BIP-329 wallet history backup', () => {
  const exportRecords = (transactions: Transaction[]) => {
    const wallet = createBip47Wallet();
    jest.spyOn(wallet, 'getTransactions').mockReturnValue(transactions);
    return createBip329WalletHistoryBackup(wallet, { ['a'.repeat(64)]: { memo: 'Keep this label' } }, {})
      .split('\n')
      .map(line => JSON.parse(line));
  };
  const partialTransaction = (overrides: Record<string, unknown> = {}) =>
    ({
      txid: 'a'.repeat(64),
      hash: 'a'.repeat(64),
      confirmations: 6,
      inputs: [],
      outputs: [],
      value: 1_000,
      ...overrides,
    }) as unknown as Transaction;

  it.each([undefined, null, {}, 'not an array'])('keeps transaction labels when I/O arrays are unavailable: %s', arrays => {
    const records = exportRecords([partialTransaction({ inputs: arrays, outputs: arrays })]);
    expect(records).toContainEqual(expect.objectContaining({ type: 'tx', label: 'Keep this label', value: 1_000 }));
    expect(records).toHaveLength(1);
  });

  it.each([undefined, null, 'bad', '', Infinity, NaN, 1e20])(
    'omits invalid block times without losing the transaction or its I/O: %s',
    time => {
      const invalid = partialTransaction({ blocktime: time, time, inputs: [{ value: 0.001 }], outputs: [{ value: 0.0009, n: 0 }] });
      const valid = partialTransaction({ txid: 'b'.repeat(64), hash: 'b'.repeat(64), blocktime: 1_737_633_600 });
      const records = exportRecords([invalid, valid]);
      const firstRecords = records.filter(record => record.ref.startsWith(invalid.txid));
      expect(firstRecords.map(record => record.type)).toEqual(['tx', 'input', 'output']);
      expect(firstRecords.every(record => record.time === undefined)).toBe(true);
      expect(firstRecords[0].label).toBe('Keep this label');
      expect(records.find(record => record.ref === valid.txid).time).toBe('2025-01-23T12:00:00.000Z');
    },
  );

  it('skips malformed I/O elements without changing the indices of valid records or emitting unsafe amounts', () => {
    const records = exportRecords([
      partialTransaction({
        value: Infinity,
        blocktime: Infinity,
        time: '1737633600',
        inputs: [null, { value: 1e100 }],
        outputs: [null, { value: 1e100 }],
      }),
    ]);
    expect(records.map(record => record.ref)).toEqual(['a'.repeat(64), `${'a'.repeat(64)}:1`, `${'a'.repeat(64)}:1`]);
    expect(records.every(record => record.value === undefined && record.time === '2025-01-23T12:00:00.000Z')).toBe(true);
    expect(records[0].label).toBe('Keep this label');
  });

  it('does not export block times before six confirmations', () => {
    const records = exportRecords([partialTransaction({ confirmations: 5, blocktime: 1_737_633_600 })]);
    expect(records[0]).not.toHaveProperty('time');
  });
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
    const wallet = createBip47Wallet();
    const address = wallet._getBIP47AddressReceive(wallet._receive_payment_codes[0], 0);
    expect(wallet._getDerivationPathByAddress(address)).toBe("m/47'/0'/0'/0");
    expect(getBip329Keypath(wallet, wallet._getExternalAddressByIndex(0))).toBe('/0/0');
    expect(getBip329Keypath(wallet, wallet._getInternalAddressByIndex(1))).toBe('/1/1');

    const record = JSON.parse(createBip329WalletHistoryBackup(wallet, {}, { [address]: { label: 'BIP-47 payment' } }));
    expect(record).toMatchObject({ type: 'addr', ref: address, label: 'BIP-47 payment', origin: getBip329Origin(wallet) });
    expect(record).not.toHaveProperty('keypath');
  });

  it('keeps origin and coin-control metadata for owned BIP-47 inputs/outputs without tagging foreign or unknown addresses', () => {
    const wallet = createBip47Wallet();
    const bip47Address = wallet._getBIP47AddressReceive(wallet._receive_payment_codes[0], 0);
    const addresses = [bip47Address, 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu', wallet._getExternalAddressByIndex(0), undefined];
    const txid = 'a'.repeat(64);
    const transaction: Transaction = {
      txid,
      hash: txid,
      version: 2,
      size: 300,
      vsize: 200,
      weight: 800,
      locktime: 0,
      timestamp: 0,
      inputs: addresses.map((address, vout) => ({
        txid: 'b'.repeat(64),
        vout,
        address,
        value: 0.001,
        scriptSig: { asm: '', hex: '' },
        txinwitness: [],
        sequence: 0xffffffff,
      })),
      outputs: addresses.map((address, n) => ({
        n,
        value: 0.0009,
        scriptPubKey: { asm: '', hex: '', reqSigs: 1, type: 'witness_v0_keyhash', addresses: address ? [address] : [] },
      })),
    };
    jest.spyOn(wallet, 'getTransactions').mockReturnValue([transaction]);
    wallet.setUTXOMetadata(txid, 0, { memo: 'Reserved BIP-47 funds', frozen: true });
    const records = createBip329WalletHistoryBackup(wallet, {}, {})
      .split('\n')
      .map(line => JSON.parse(line));
    const origin = getBip329Origin(wallet);
    expect(origin).toMatch(/^wpkh\(/);

    for (const type of ['input', 'output']) {
      const bip47Record = records.find(record => record.type === type && record.ref === `${txid}:0`);
      expect(bip47Record).toMatchObject({ origin });
      expect(bip47Record).not.toHaveProperty('keypath');
      expect(records.find(record => record.type === type && record.ref === `${txid}:2`)).toMatchObject({ origin, keypath: '/0/0' });
      for (const index of [1, 3]) {
        const other = records.find(record => record.type === type && record.ref === `${txid}:${index}`);
        expect(other).not.toHaveProperty('origin');
        expect(other).not.toHaveProperty('keypath');
      }
    }
    expect(records.find(record => record.type === 'output' && record.ref === `${txid}:0`)).toMatchObject({
      label: 'Reserved BIP-47 funds',
      spendable: false,
      value: 90_000,
    });
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
