import { TAddressMetadata, TTXMetadata } from '../class/blue-app';
import { MultisigHDWallet } from '../class/wallets/multisig-hd-wallet';
import { TWallet } from '../class/wallets/types';
import { WatchOnlyWallet } from '../class/wallets/watch-only-wallet';
import { WalletDescriptor } from '../class/wallet-descriptor';
import { Bip329Record, encodeBip329Record, encodeBip329TransactionLabel } from './fs';
import { bitcoinValueToSats, getTransactionFee } from './wallet-history-export';

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

export function createBip329WalletHistoryBackup(wallet: TWallet, txMetadata: TTXMetadata, addressMetadata: TAddressMetadata): string {
  const transactions = wallet.getTransactions();
  const origin = getBip329Origin(wallet);
  const exportedAddresses = new Set<string>();
  const records: string[] = [];

  const exportAddress = (address: string) => {
    if (exportedAddresses.has(address) || !wallet.weOwnAddress(address)) return;
    exportedAddresses.add(address);

    const label = addressMetadata[address]?.label;
    const keypath = getBip329Keypath(wallet, address);
    records.push(
      encodeBip329Record({
        type: 'addr',
        ref: address,
        ...(label === undefined ? {} : { label }),
        ...(origin ? { origin } : {}),
        ...(keypath ? { keypath } : {}),
      }),
    );
  };

  for (const transaction of transactions) {
    const transactionId = transaction.hash || transaction.txid;
    if (!transactionId) continue;

    const fullyConfirmed = (transaction.confirmations ?? 0) >= 6;
    const blockTimestamp = transaction.blocktime ?? transaction.time;
    const time = fullyConfirmed && blockTimestamp ? new Date(blockTimestamp * 1000).toISOString() : undefined;
    const transactionDetails: Pick<Bip329Record, 'time'> = time ? { time } : {};
    const memo = txMetadata[transactionId]?.memo?.trim();
    const fee = getTransactionFee(transaction);
    const value = Number(transaction.value);

    records.push(
      encodeBip329TransactionLabel(transactionId, memo || undefined, {
        ...(origin ? { origin } : {}),
        ...transactionDetails,
        ...(fee === undefined ? {} : { fee }),
        ...(Number.isFinite(value) ? { value: Math.round(value) } : {}),
      }),
    );

    transaction.inputs.forEach((input, index) => {
      const address = input.address ?? input.addresses?.[0];
      if (address) exportAddress(address);
      const inputValue = bitcoinValueToSats(input.value);
      const keypath = address ? getBip329Keypath(wallet, address) : undefined;
      records.push(
        encodeBip329Record({
          type: 'input',
          ref: `${transactionId}:${index}`,
          ...(keypath && origin ? { origin } : {}),
          ...(keypath ? { keypath } : {}),
          ...(inputValue === undefined ? {} : { value: inputValue }),
          ...transactionDetails,
        }),
      );
    });

    transaction.outputs.forEach((output, index) => {
      const outputIndex = Number.isInteger(output.n) ? output.n : index;
      const address = output.scriptPubKey?.addresses?.[0];
      if (address) exportAddress(address);
      const keypath = address ? getBip329Keypath(wallet, address) : undefined;
      const outputMetadata = wallet.getUTXOMetadata(transactionId, outputIndex);
      const outputValue = bitcoinValueToSats(output.value);
      records.push(
        encodeBip329Record({
          type: 'output',
          ref: `${transactionId}:${outputIndex}`,
          ...(outputMetadata.memo === undefined ? {} : { label: outputMetadata.memo }),
          ...(keypath && origin ? { origin } : {}),
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
