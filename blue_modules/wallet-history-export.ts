import { TTXMetadata } from '../class/blue-app';
import { Platform } from 'react-native';
import { LightningTransaction, Transaction } from '../class/wallets/types';
import { Action } from '../components/types';
import loc from '../loc';
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
  if (value === undefined || value === null || value === '') return undefined;
  const bitcoin = Number(value);
  if (!Number.isFinite(bitcoin)) return undefined;
  return Math.round(bitcoin * SATOSHIS_PER_BITCOIN);
}

export function satoshisToBitcoin(value: number): string {
  return (value / SATOSHIS_PER_BITCOIN).toFixed(8);
}

export function getTransactionFee(transaction: Transaction): number | undefined {
  if (transaction.inputs.length && transaction.outputs.length) {
    const inputValues = transaction.inputs.map(input => (input.value == null ? undefined : bitcoinValueToSats(input.value)));
    const outputValues = transaction.outputs.map(output => (output.value == null ? undefined : bitcoinValueToSats(output.value)));
    if (inputValues.every(value => value !== undefined) && outputValues.every(value => value !== undefined)) {
      const fee = inputValues.reduce((total, value) => total + value, 0) - outputValues.reduce((total, value) => total + value, 0);
      if (Number.isSafeInteger(fee) && fee >= 0) return fee;
    }
  }
  const reportedFee = Number(transaction.fee);
  if (transaction.fee == null || !Number.isFinite(reportedFee) || reportedFee < 0) return undefined;
  return Number.isSafeInteger(reportedFee) ? reportedFee : bitcoinValueToSats(reportedFee);
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
    let confirmations = transaction.confirmations === undefined ? '' : String(transaction.confirmations);
    let fee = '';
    let feeSats: number | '' = '';
    let paymentHash = '';
    const invoiceExpiration = transaction.expire_time === undefined ? undefined : transaction.timestamp + transaction.expire_time;

    if (chain === Chain.OFFCHAIN) {
      const rawPaymentHash = transaction.payment_hash;
      paymentHash =
        typeof rawPaymentHash === 'string' ? rawPaymentHash : rawPaymentHash ? uint8ArrayToHex(new Uint8Array(rawPaymentHash.data)) : '';
      transactionId = transactionId || paymentHash;
      const expired = invoiceExpiration !== undefined && invoiceExpiration <= now / 1000;
      const complete =
        transaction.ispaid ||
        (transaction.type === 'paid_invoice' && transaction.ispaid !== false) ||
        (transaction.type === 'bitcoind_tx' &&
          !transaction.txid?.startsWith('boarding-utxo-') &&
          (transaction.confirmations === undefined || transaction.confirmations > 0));
      status = transaction.failed ? 'Failed' : complete ? 'Complete' : expired ? 'Expired' : 'Pending';
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
    const outputAddresses = outputs.flatMap(output => output.scriptPubKey?.addresses ?? []);
    const numberOrEmpty = (candidate: unknown): number | '' => {
      if (candidate === undefined || candidate === null) return '';
      const parsed = Number(candidate);
      return Number.isFinite(parsed) ? parsed : '';
    };
    const expiresAt = invoiceExpiration === undefined ? '' : new Date(invoiceExpiration * 1000).toISOString();
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
    backup: `${label}-bip329-labels.jsonl`,
  };
}

const removeTrailingEllipsis = (text: string): string => text.replace(/(?:\.{3}|…)+\s*$/, '').trimEnd();

export function createHistoryExportMenuActions(
  chain: Chain,
  walletTransactionsLength: number,
  exportText: string,
  importText: string,
  desktop = isDesktop,
  hasAddressLabels = false,
  platform = Platform.OS,
): Action[] {
  const isOnchain = chain === Chain.ONCHAIN;
  const hasTransactions = walletTransactionsLength > 0;
  const canExportLabels = isOnchain && (hasTransactions || hasAddressLabels);
  const shareActions: Action[] = [
    {
      id: 'share_accounting',
      text: loc.wallets.details_export_accounting,
      subtitle: loc.wallets.details_export_accounting_description,
      icon: { iconValue: 'chart.bar.doc.horizontal' },
      hidden: !hasTransactions,
      subactions: [
        {
          id: SHARE_ACCOUNTING_ACTION_ID,
          text: loc.wallets.details_export_csv,
          icon: { iconValue: 'tablecells' },
        },
        ...(platform === 'android'
          ? [
              {
                id: SAVE_ACCOUNTING_ACTION_ID,
                text: loc.wallets.details_export_save_csv,
                icon: CommonToolTipActions.SaveFile.icon,
              },
            ]
          : []),
      ],
    },
    {
      id: 'share_backup',
      text: loc.wallets.details_export_backup_category,
      subtitle: loc.wallets.details_export_backup_description,
      icon: { iconValue: 'archivebox' },
      hidden: !canExportLabels,
      subactions: [
        {
          id: SHARE_BACKUP_ACTION_ID,
          text: loc.wallets.details_export_bip329,
          subtitle: loc.wallets.details_export_bip329_description,
          icon: { iconValue: 'bitcoinsign' },
        },
        ...(platform === 'android'
          ? [
              {
                id: SAVE_BACKUP_ACTION_ID,
                text: loc.wallets.details_export_save_bip329,
                icon: CommonToolTipActions.SaveFile.icon,
              },
            ]
          : []),
      ],
    },
  ];
  return [
    {
      id: exportText,
      text: exportText,
      displayInline: true,
      hidden: !hasTransactions && !canExportLabels,
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
                  text: loc.wallets.details_export_accounting,
                  subtitle: loc.wallets.details_export_accounting_description,
                  icon: { iconValue: 'chart.bar.doc.horizontal' },
                  hidden: !hasTransactions,
                  subactions: [
                    {
                      id: SAVE_ACCOUNTING_ACTION_ID,
                      text: loc.wallets.details_export_csv,
                      icon: { iconValue: 'tablecells' },
                    },
                  ],
                },
                {
                  id: 'save_backup',
                  text: loc.wallets.details_export_backup_category,
                  subtitle: loc.wallets.details_export_backup_description,
                  icon: { iconValue: 'archivebox' },
                  hidden: !canExportLabels,
                  subactions: [
                    {
                      id: SAVE_BACKUP_ACTION_ID,
                      text: loc.wallets.details_export_bip329,
                      subtitle: loc.wallets.details_export_bip329_description,
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
