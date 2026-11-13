import { TAddressMetadata, TTXMetadata } from '../class/blue-app';
import { AbstractHDWallet } from '../class/wallets/abstract-hd-wallet';
import { AbstractHDElectrumWallet } from '../class/wallets/abstract-hd-electrum-wallet';
import { MultisigHDWallet } from '../class/wallets/multisig-hd-wallet';
import { TWallet } from '../class/wallets/types';
import { WatchOnlyWallet } from '../class/wallets/watch-only-wallet';
import { WalletDescriptor } from '../class/wallet-descriptor';
import { isValidBech32Address } from '../util/isValidBech32Address';
import { Bip329Record, encodeBip329Record, encodeBip329TransactionLabel } from './fs';
import { bitcoinValueToSats, finiteExportNumber, formatExportTimestamp, getTransactionFee } from './wallet-history-export';

export function getBip329Origin(wallet: TWallet): string | undefined {
  try {
    let descriptor = WalletDescriptor.fromWallet(wallet);
    if (!descriptor && wallet instanceof WatchOnlyWallet && wallet.isHd() && wallet.segwitType) {
      const path = wallet.getDerivationPath();
      if (path) descriptor = WalletDescriptor.getDescriptor(wallet.getMasterFingerprintHex(), path, wallet.getSecret(), wallet.segwitType);
    }
    if (!descriptor && wallet instanceof MultisigHDWallet) {
      const origins = Array.from({ length: wallet.getN() }, (_, index) => {
        const path = wallet.getCustomDerivationPathForCosigner(index + 1);
        const fingerprint = wallet.getFingerprint(index + 1);
        return path && fingerprint ? `[${fingerprint.toLowerCase()}/${path.replace('m/', '')}]` : undefined;
      });
      if (origins.every((origin): origin is string => Boolean(origin))) {
        const policy = `sortedmulti(${wallet.getM()},${origins.join(',')})`;
        if (wallet.isNativeSegwit()) descriptor = `wsh(${policy})`;
        else if (wallet.isWrappedSegwit()) descriptor = `sh(wsh(${policy}))`;
        else if (wallet.isLegacy()) descriptor = `sh(${policy})`;
      }
    }
    return descriptor?.replace(/(\[[^\]]+\])[^,)]+/, '$1');
  } catch {
    return undefined;
  }
}

const relativeKeypath = (fullPath: string | false, accountPath: string | false | undefined): string | undefined => {
  // BIP-329 paths extend the exported account origin. BIP-47 and other paths
  // outside that account cannot be described by appending a relative path.
  if (!fullPath || !accountPath || !fullPath.startsWith(`${accountPath}/`)) return undefined;
  return fullPath.slice(accountPath.length);
};

export function getBip329Keypath(wallet: TWallet, address: string): string | undefined {
  try {
    if (wallet instanceof MultisigHDWallet) {
      const accountPath = wallet.getCustomDerivationPathForCosigner(1);
      return relativeKeypath(wallet._getDerivationPathByAddressWithCustomPath(address, accountPath || undefined), accountPath);
    }

    const walletWithKeypaths = wallet as TWallet & {
      _getDerivationPathByAddress?: (candidate: string) => string | false;
      getDerivationPath?: () => string | false | undefined;
    };
    return relativeKeypath(walletWithKeypaths._getDerivationPathByAddress?.(address) ?? false, walletWithKeypaths.getDerivationPath?.());
  } catch {
    return undefined;
  }
}

type AddressDetails = { owned: boolean; keypath?: string };

const createAddressLookup = (wallet: TWallet): ((address: string) => AddressDetails) => {
  const hd = wallet instanceof WatchOnlyWallet && wallet.isHd() ? wallet._hdWalletInstance : wallet;
  const details = new Map<string, AddressDetails>();
  const indexed = hd instanceof AbstractHDWallet;

  if (indexed) {
    const accountPath = hd instanceof MultisigHDWallet ? hd.getCustomDerivationPathForCosigner(1) : hd.getDerivationPath();
    for (const branch of [0, 1] as const) {
      const count = (branch === 0 ? hd.next_free_address_index : hd.next_free_change_address_index) + hd.gap_limit;
      for (let index = 0; index < count; index++) {
        const address = branch === 0 ? hd._getExternalAddressByIndex(index) : hd._getInternalAddressByIndex(index);
        details.set(address, { owned: true, ...(accountPath ? { keypath: `/${branch}/${index}` } : {}) });
      }
    }
    // Match weOwnAddress's full BIP-47 range, including known payment codes
    // when the BIP-47 UI is disabled. Those paths do not extend this account.
    if (hd instanceof AbstractHDElectrumWallet) {
      for (const code of hd._receive_payment_codes) {
        const count = hd._getNextFreePaymentCodeIndexReceive(code) + hd.gap_limit;
        for (let index = 0; index < count; index++) {
          const address = hd._getBIP47AddressReceive(code, index);
          if (!details.has(address)) details.set(address, { owned: true });
        }
      }
    }
  }

  return address => {
    const normalized = isValidBech32Address(address) ? address.toLowerCase() : address;
    const cached = details.get(normalized);
    if (cached) return cached;
    // An indexed HD map is complete for the wallet's ownership search range.
    // Other wallet implementations cache both positive and negative answers.
    const owned = !indexed && wallet.weOwnAddress(address);
    const result = { owned, ...(owned ? { keypath: getBip329Keypath(wallet, address) } : {}) };
    details.set(normalized, result);
    return result;
  };
};

export function createBip329WalletHistoryBackup(wallet: TWallet, txMetadata: TTXMetadata, addressMetadata: TAddressMetadata): string {
  const transactions = wallet.getTransactions();
  const origin = getBip329Origin(wallet);
  let lookupAddress: ReturnType<typeof createAddressLookup> | undefined;
  const exportedAddresses = new Set<string>();
  const records: string[] = [];

  const exportAddress = (address: string): AddressDetails => {
    lookupAddress ??= createAddressLookup(wallet);
    const info = lookupAddress(address);
    if (!info.owned || exportedAddresses.has(address)) return info;
    exportedAddresses.add(address);

    const label = addressMetadata[address]?.label;
    const { keypath } = info;
    records.push(
      encodeBip329Record({
        type: 'addr',
        ref: address,
        ...(label === undefined ? {} : { label }),
        ...(origin ? { origin } : {}),
        ...(keypath ? { keypath } : {}),
      }),
    );
    return info;
  };

  for (const transaction of transactions) {
    if (!transaction || typeof transaction !== 'object') continue;
    const transactionId = transaction.hash || transaction.txid;
    if (!transactionId) continue;

    const fullyConfirmed = (finiteExportNumber(transaction.confirmations) ?? 0) >= 6;
    const time = fullyConfirmed ? (formatExportTimestamp(transaction.blocktime) ?? formatExportTimestamp(transaction.time)) : undefined;
    const transactionDetails: Pick<Bip329Record, 'time'> = time ? { time } : {};
    const memo = txMetadata[transactionId]?.memo?.trim();
    const fee = getTransactionFee(transaction);
    const value = finiteExportNumber(transaction.value);

    records.push(
      encodeBip329TransactionLabel(transactionId, memo || undefined, {
        ...(origin ? { origin } : {}),
        ...transactionDetails,
        ...(fee === undefined ? {} : { fee }),
        ...(value !== undefined && Number.isSafeInteger(Math.round(value)) ? { value: Math.round(value) } : {}),
      }),
    );

    const inputs = Array.isArray(transaction.inputs) ? transaction.inputs : [];
    inputs.forEach((input, index) => {
      if (!input || typeof input !== 'object') return;
      const candidate = input.address ?? (Array.isArray(input.addresses) ? input.addresses[0] : undefined);
      const address = typeof candidate === 'string' ? candidate : undefined;
      const info = address ? exportAddress(address) : undefined;
      const inputValue = bitcoinValueToSats(input.value);
      const keypath = info?.keypath;
      records.push(
        encodeBip329Record({
          type: 'input',
          ref: `${transactionId}:${index}`,
          ...(info?.owned && origin ? { origin } : {}),
          ...(keypath ? { keypath } : {}),
          ...(inputValue === undefined ? {} : { value: inputValue }),
          ...transactionDetails,
        }),
      );
    });

    const outputs = Array.isArray(transaction.outputs) ? transaction.outputs : [];
    outputs.forEach((output, index) => {
      if (!output || typeof output !== 'object') return;
      const outputIndex = Number.isSafeInteger(output.n) && output.n >= 0 ? output.n : index;
      const candidate = Array.isArray(output.scriptPubKey?.addresses) ? output.scriptPubKey.addresses[0] : undefined;
      const address = typeof candidate === 'string' ? candidate : undefined;
      const info = address ? exportAddress(address) : undefined;
      const keypath = info?.keypath;
      const outputMetadata = wallet.getUTXOMetadata(transactionId, outputIndex);
      const outputValue = bitcoinValueToSats(output.value);
      records.push(
        encodeBip329Record({
          type: 'output',
          ref: `${transactionId}:${outputIndex}`,
          ...(outputMetadata.memo === undefined ? {} : { label: outputMetadata.memo }),
          ...(info?.owned && origin ? { origin } : {}),
          ...(keypath ? { keypath } : {}),
          ...(outputMetadata.frozen === undefined ? {} : { spendable: !outputMetadata.frozen }),
          ...(outputValue === undefined ? {} : { value: outputValue }),
          ...transactionDetails,
        }),
      );
    });
  }

  for (const address of Object.keys(addressMetadata)) exportAddress(address);

  return records.join('\n');
}
