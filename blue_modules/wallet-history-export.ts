import { TTXMetadata } from '../class/blue-app';
import { LightningTransaction, Transaction } from '../class/wallets/types';
import { Action } from '../components/types';
import { Chain } from '../models/bitcoinUnits';
import { CommonToolTipActions } from '../typings/CommonToolTipActions';
import { isDesktop } from './environment';
import { encodeCsvRow } from './fs';
import { uint8ArrayToHex } from './uint8array-extras';

export const IMPORT_NOTES_ACTION_ID = 'import_notes';
export const SHARE_ACCOUNTING_ACTION_ID = 'share_accounting_history';
export const SHARE_BACKUP_ACTION_ID = 'share_bip329_backup';
export const SAVE_ACCOUNTING_ACTION_ID = 'save_accounting_history';
export const SAVE_BACKUP_ACTION_ID = 'save_bip329_backup';

const SATOSHIS_PER_BITCOIN = 100_000_000;

export function bitcoinValueToSats(value: unknown): number | undefined {
  const bitcoin = Number(value);
  if (!Number.isFinite(bitcoin)) return undefined;
  return Math.round(bitcoin * SATOSHIS_PER_BITCOIN);
}

export function satoshisToBitcoin(value: number): string {
  return (value / SATOSHIS_PER_BITCOIN).toFixed(8);
}

export function getTransactionFee(transaction: Transaction): number | undefined {
  const reportedFee = Number(transaction.fee);
  if (transaction.fee !== undefined && Number.isFinite(reportedFee) && reportedFee >= 0) return Math.round(reportedFee);
  if (!transaction.inputs.length || !transaction.outputs.length || transaction.inputs.some(input => input.value === undefined))
    return undefined;

  const inputValues = transaction.inputs.map(input => bitcoinValueToSats(input.value));
  const outputValues = transaction.outputs.map(output => bitcoinValueToSats(output.value));
  if (inputValues.some(value => value === undefined) || outputValues.some(value => value === undefined)) return undefined;

  const fee =
    (inputValues as number[]).reduce((total, value) => total + value, 0) -
    (outputValues as number[]).reduce((total, value) => total + value, 0);
  return fee >= 0 ? fee : undefined;
}

export type AccountingHistoryCell = string | number;

export const ACCOUNTING_HISTORY_HEADERS = [
  'Date',
  'Transaction ID',
  'Type',
  'Amount (BTC)',
  'Amount (sats)',
  'Fee (BTC)',
  'Fee (sats)',
  'Memo',
  'Status',
  'Confirmations',
  'Block Hash',
  'Version',
  'Size (bytes)',
  'Virtual Size (vB)',
  'Weight (WU)',
  'Locktime',
  'Input Count',
  'Output Count',
  'Input Addresses',
  'Output Addresses',
  'Counterparty',
  'Payment Hash',
  'Payment Request',
  'Description',
  'Category',
  'Record Type',
  'Expires At',
] as const;

export function createAccountingHistoryRows(
  transactions: Array<Transaction & LightningTransaction>,
  chain: Chain,
  txMetadata: TTXMetadata,
  now = Date.now(),
): AccountingHistoryCell[][] {
  const rows: AccountingHistoryCell[][] = [Array.from(ACCOUNTING_HISTORY_HEADERS)];

  for (const transaction of transactions) {
    const value = Number(transaction.value ?? transaction.amt ?? 0);
    const metadataKey = transaction.hash || transaction.txid;
    let transactionId = metadataKey || '';
    const memo = (metadataKey && txMetadata[metadataKey]?.memo?.trim()) || transaction.memo || '';
    let status: string;
    let confirmations = '';
    let fee = '';
    let feeSats: number | '' = '';
    let paymentHash = '';

    if (chain === Chain.OFFCHAIN) {
      const rawPaymentHash = transaction.payment_hash;
      transactionId =
        typeof rawPaymentHash === 'string'
          ? rawPaymentHash
          : rawPaymentHash
            ? uint8ArrayToHex(new Uint8Array(rawPaymentHash.data))
            : transactionId;
      paymentHash = transactionId;
      const expired = transaction.expire_time !== undefined && transaction.expire_time <= now / 1000;
      status = transaction.ispaid ? 'Complete' : transaction.failed ? 'Failed' : expired ? 'Expired' : 'Pending';
      const lightningFee = Number(transaction.fee);
      if (Number.isFinite(lightningFee)) {
        feeSats = Math.round(Math.abs(lightningFee));
        fee = satoshisToBitcoin(feeSats);
      }
    } else {
      const confirmationCount = transaction.confirmations ?? 0;
      confirmations = String(confirmationCount);
      status = confirmationCount > 0 ? 'Confirmed' : 'Pending';
      const transactionFee = getTransactionFee(transaction);
      if (transactionFee !== undefined) {
        feeSats = transactionFee;
        fee = satoshisToBitcoin(transactionFee);
      }
    }

    const timestamp = transaction.blocktime ?? transaction.time ?? transaction.timestamp;
    const date = timestamp ? new Date(timestamp * 1000).toISOString() : '';
    const type = value < 0 ? 'Send' : value > 0 ? 'Receive' : 'Self transfer';
    const inputs = Array.isArray(transaction.inputs) ? transaction.inputs : [];
    const outputs = Array.isArray(transaction.outputs) ? transaction.outputs : [];
    const inputAddresses = inputs.flatMap(input => input.addresses ?? (input.address ? [input.address] : []));
    const outputAddresses = outputs.flatMap(output => output.scriptPubKey.addresses ?? []);
    const numberOrEmpty = (candidate: unknown): number | '' => {
      if (candidate === undefined || candidate === null) return '';
      const parsed = Number(candidate);
      return Number.isFinite(parsed) ? parsed : '';
    };
    const expiresAt = transaction.expire_time ? new Date(transaction.expire_time * 1000).toISOString() : '';
    rows.push([
      date,
      transactionId,
      type,
      satoshisToBitcoin(value),
      Math.round(value),
      fee,
      feeSats,
      memo,
      status,
      confirmations,
      transaction.blockhash ?? '',
      numberOrEmpty(transaction.version),
      numberOrEmpty(transaction.size),
      numberOrEmpty(transaction.vsize),
      numberOrEmpty(transaction.weight),
      numberOrEmpty(transaction.locktime),
      inputs.length || '',
      outputs.length || '',
      inputAddresses.join(';'),
      outputAddresses.join(';'),
      transaction.counterparty ?? '',
      paymentHash,
      transaction.payment_request ?? '',
      transaction.description ?? '',
      transaction.category ?? '',
      transaction.type ?? '',
      expiresAt,
    ]);
  }

  return rows;
}

export function sanitizeAccountingCsvCell(value: AccountingHistoryCell): AccountingHistoryCell {
  if (typeof value !== 'string' || value.length === 0) return value;
  const isPlainNumber = /^-?\d+(?:\.\d+)?$/.test(value);
  const hasFormulaPrefix = /^[\t\r\n]/.test(value) || /^\s*[=+@]/.test(value) || (!isPlainNumber && /^\s*-/.test(value));
  return hasFormulaPrefix ? `'${value}` : value;
}

export function createAccountingHistoryCsv(
  transactions: Array<Transaction & LightningTransaction>,
  chain: Chain,
  txMetadata: TTXMetadata,
  now = Date.now(),
): string {
  return createAccountingHistoryRows(transactions, chain, txMetadata, now)
    .map(row => encodeCsvRow(row.map(sanitizeAccountingCsvCell)))
    .join('\r\n');
}

export function createHistoryExportFileNames(walletLabel: string): {
  accounting: string;
  backup: string;
} {
  const label = walletLabel.trim().replace(/\s+/g, '-');
  return {
    accounting: `${label}-accounting.csv`,
    backup: `${label}-bip329-backup.jsonl`,
  };
}

const removeTrailingEllipsis = (text: string): string => text.replace(/(?:\.{3}|…)+\s*$/, '').trimEnd();

export function createHistoryExportMenuActions(
  chain: Chain,
  walletTransactionsLength: number,
  exportText: string,
  importText: string,
  desktop = isDesktop,
): Action[] {
  const isOnchain = chain === Chain.ONCHAIN;
  const shareActions: Action[] = [
    {
      id: 'share_accounting',
      text: 'Accounting',
      subtitle: 'Transaction records for bookkeeping',
      icon: { iconValue: 'chart.bar.doc.horizontal' },
      subactions: [
        {
          id: SHARE_ACCOUNTING_ACTION_ID,
          text: 'CSV',
          icon: { iconValue: 'tablecells' },
        },
      ],
    },
    {
      id: 'share_backup',
      text: 'Backup',
      subtitle: 'Portable Bitcoin wallet labels and notes',
      icon: { iconValue: 'archivebox' },
      hidden: !isOnchain,
      subactions: [
        {
          id: SHARE_BACKUP_ACTION_ID,
          text: 'BIP-329 JSONL',
          subtitle: 'Bitcoin Wallet Labels Export Format (.jsonl)',
          icon: { iconValue: 'bitcoinsign' },
        },
      ],
    },
  ];
  return [
    {
      id: exportText,
      text: exportText,
      displayInline: true,
      hidden: walletTransactionsLength === 0,
      subactions: desktop
        ? [
            {
              ...CommonToolTipActions.Share,
              text: removeTrailingEllipsis(CommonToolTipActions.Share.text),
              subactions: shareActions,
            },
            {
              ...CommonToolTipActions.SaveFile,
              text: removeTrailingEllipsis(CommonToolTipActions.SaveFile.text),
              subactions: [
                {
                  id: 'save_accounting',
                  text: 'Accounting',
                  subtitle: 'Transaction records for bookkeeping',
                  icon: { iconValue: 'chart.bar.doc.horizontal' },
                  subactions: [
                    {
                      id: SAVE_ACCOUNTING_ACTION_ID,
                      text: 'CSV',
                      icon: { iconValue: 'tablecells' },
                    },
                  ],
                },
                {
                  id: 'save_backup',
                  text: 'Backup',
                  subtitle: 'Portable Bitcoin wallet labels and notes',
                  icon: { iconValue: 'archivebox' },
                  hidden: !isOnchain,
                  subactions: [
                    {
                      id: SAVE_BACKUP_ACTION_ID,
                      text: 'BIP-329 JSONL',
                      subtitle: 'Bitcoin Wallet Labels Export Format (.jsonl)',
                      icon: { iconValue: 'bitcoinsign' },
                    },
                  ],
                },
              ],
            },
          ]
        : shareActions,
    },
    {
      id: IMPORT_NOTES_ACTION_ID,
      text: removeTrailingEllipsis(importText),
      icon: CommonToolTipActions.ImportFile.icon,
      hidden: walletTransactionsLength === 0 || !isOnchain,
    },
  ];
}
