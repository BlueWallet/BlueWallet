import { Platform } from 'react-native';
import { pick, types, keepLocalCopy, errorCodes, saveDocuments } from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import { launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import { detectQRCodeInImage } from 'react-native-camera-kit-no-google';
import Share from 'react-native-share';

import type { TTXMetadata } from '../class/blue-app';
import presentAlert from '../components/Alert';
import loc from '../loc';
import { isDesktop } from './environment';
import { readFile } from './react-native-bw-file-access';
import { base64ToUint8Array, uint8ArrayToString } from './uint8array-extras/index';
import { errorMessage } from '../helpers/errorMessage';

const _sanitizeFileName = (fileName: string) => {
  // Remove any path delimiters and non-alphanumeric characters except for -, _, and .
  return fileName.replace(/[^a-zA-Z0-9\-_.]/g, '');
};

export const isCancel = (err: unknown): boolean => {
  return typeof err === 'object' && err !== null && 'code' in err && err.code === errorCodes.OPERATION_CANCELED;
};

export const encodeCsvRow = (values: Array<string | number>): string =>
  values
    .map(value => {
      const stringValue = String(value);
      return /[",\r\n]/.test(stringValue) ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
    })
    .join(',');

export type Bip329Record = {
  type: 'tx' | 'addr' | 'pubkey' | 'input' | 'output' | 'xpub' | 'spscan';
  ref: string;
  label?: string;
  origin?: string;
  spendable?: boolean;
  height?: number;
  time?: string;
  fee?: number;
  value?: number;
  rate?: Record<string, number>;
  keypath?: string;
  fmv?: Record<string, number>;
  heights?: number[];
};

export const encodeBip329Record = (record: Bip329Record): string => {
  const validTypes: ReadonlySet<Bip329Record['type']> = new Set(['tx', 'addr', 'pubkey', 'input', 'output', 'xpub', 'spscan']);
  if (!validTypes.has(record.type) || typeof record.ref !== 'string' || record.ref.length === 0) {
    throw new Error('Invalid BIP-329 record');
  }
  if (record.spendable !== undefined && record.type !== 'output') {
    throw new Error('BIP-329 spendable is only valid for output records');
  }
  for (const field of ['height', 'fee', 'value'] as const) {
    if (record[field] !== undefined && !Number.isSafeInteger(record[field])) {
      throw new Error(`BIP-329 ${field} must be an integer`);
    }
  }
  if (record.time !== undefined && Number.isNaN(Date.parse(record.time))) {
    throw new Error('BIP-329 time must be an ISO-8601 timestamp');
  }
  return JSON.stringify(record);
};

export const encodeBip329TransactionLabel = (
  transactionId: string,
  label?: string,
  details: Omit<Bip329Record, 'type' | 'ref' | 'label' | 'spendable' | 'keypath' | 'fmv' | 'heights'> = {},
): string =>
  encodeBip329Record({
    type: 'tx',
    ref: transactionId,
    ...(label === undefined ? {} : { label }),
    ...details,
  });

const parseCsv = (contents: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < contents.length; index++) {
    const character = contents[index];

    if (quoted) {
      if (character === '"' && contents[index + 1] === '"') {
        value += '"';
        index++;
      } else if (character === '"') {
        quoted = false;
      } else {
        value += character;
      }
    } else if (character === '"' && value.length === 0) {
      quoted = true;
    } else if (character === ',') {
      row.push(value);
      value = '';
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && contents[index + 1] === '\n') index++;
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
    } else {
      value += character;
    }
  }

  if (quoted) throw new Error('Unterminated quoted field');
  if (row.length > 0 || value.length > 0) {
    row.push(value);
    rows.push(row);
  }

  return rows;
};

const normalizeBip329Origin = (origin: string): string =>
  origin
    .replace(/\s+/g, '')
    .replace(/(\d+)[hH]/g, "$1'")
    .toLowerCase();

const restoreNeutralizedCsvValue = (value: string): string => {
  if (!value.startsWith("'")) return value;
  const original = value.slice(1);
  const isPlainNumber = /^-?\d+(?:\.\d+)?$/.test(original);
  const hasFormulaPrefix = /^[\t\r\n]/.test(original) || /^\s*[=+@]/.test(original) || (!isPlainNumber && /^\s*-/.test(original));
  return hasFormulaPrefix ? original : value;
};

export type WalletHistoryImportDiagnostics = { originMismatchCount: number };

const parseBip329TransactionNotes = (
  contents: string,
  expectedOrigin?: string,
  diagnostics?: WalletHistoryImportDiagnostics,
): Array<{ transactionId: string; memo: string }> =>
  contents
    .split(/\r?\n/)
    .filter(line => line.trim().length > 0)
    .flatMap(line => {
      const record: unknown = JSON.parse(line);
      if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('Invalid BIP-329 record');

      const { type, ref, label, origin } = record as Record<string, unknown>;
      if (typeof type !== 'string' || typeof ref !== 'string') throw new Error('Invalid BIP-329 record');
      if (type !== 'tx' || label === undefined) return [];
      if (!/^[0-9a-f]{64}$/i.test(ref) || typeof label !== 'string') throw new Error('Invalid BIP-329 transaction label');
      if (origin !== undefined && (typeof origin !== 'string' || origin.trim().length === 0)) throw new Error('Invalid BIP-329 origin');
      if (origin && expectedOrigin && normalizeBip329Origin(origin) !== normalizeBip329Origin(expectedOrigin)) {
        if (diagnostics) diagnostics.originMismatchCount++;
        return [];
      }

      return [{ transactionId: ref, memo: label }];
    });

/**
 * Reads transaction notes from BIP-329 JSONL or BlueWallet wallet-history CSV.
 * Older BlueWallet exports did not escape commas in memos, so extra CSV
 * columns are joined back into the memo.
 */
export const parseWalletHistoryNotes = (
  contents: string,
  expectedOrigin?: string,
  diagnostics?: WalletHistoryImportDiagnostics,
): Array<{ transactionId: string; memo: string }> => {
  if (diagnostics) diagnostics.originMismatchCount = 0;
  const normalizedContents = contents.replace(/^\uFEFF/, '').trimStart();
  if (normalizedContents.startsWith('{')) return parseBip329TransactionNotes(normalizedContents, expectedOrigin, diagnostics);

  const rows = parseCsv(normalizedContents);
  if (rows.length === 0 || rows[0].length < 4) throw new Error('Invalid wallet history CSV');
  const headers = rows[0].map(header => header.trim().toLowerCase());
  const transactionIdColumn = headers.findIndex(header => header === 'transaction id' || header === 'txid');
  const memoColumn = headers.findIndex(header => header === 'memo' || header === 'note');
  const resolvedTransactionIdColumn = transactionIdColumn >= 0 ? transactionIdColumn : 1;
  const resolvedMemoColumn = memoColumn >= 0 ? memoColumn : 3;
  const hasColumnsAfterMemo = resolvedMemoColumn < rows[0].length - 1;

  return rows.slice(1).flatMap(row => {
    if (row.length <= Math.max(resolvedTransactionIdColumn, resolvedMemoColumn)) return [];

    const transactionId = row[resolvedTransactionIdColumn].trim();
    const memo = restoreNeutralizedCsvValue(
      (hasColumnsAfterMemo ? row[resolvedMemoColumn] : row.slice(resolvedMemoColumn).join(',')).trim(),
    );

    return transactionId && memo ? [{ transactionId, memo }] : [];
  });
};

export const planWalletHistoryNoteImport = (
  importedNotes: Array<{ transactionId: string; memo: string }>,
  transactionMetadataKeys: ReadonlyMap<string, string>,
  metadata: TTXMetadata,
): { updates: Map<string, string>; overwriteCount: number } => {
  const updates = new Map<string, string>();

  for (const importedNote of importedNotes) {
    const metadataKey = transactionMetadataKeys.get(importedNote.transactionId.toLowerCase());
    if (metadataKey && metadata[metadataKey]?.memo !== importedNote.memo) {
      updates.set(metadataKey, importedNote.memo);
    }
  }

  const overwriteCount = [...updates.keys()].filter(metadataKey => Boolean(metadata[metadataKey]?.memo?.trim())).length;
  return { updates, overwriteCount };
};

export const selectWalletHistoryNoteUpdates = (
  updates: ReadonlyMap<string, string>,
  metadata: TTXMetadata,
  selectedOverwrites: ReadonlySet<string>,
): Map<string, string> =>
  new Map([...updates].filter(([metadataKey]) => !metadata[metadataKey]?.memo?.trim() || selectedOverwrites.has(metadataKey)));

export const applyWalletHistoryNoteUpdates = async (
  metadata: TTXMetadata,
  updates: ReadonlyMap<string, string>,
  persist: () => Promise<void>,
): Promise<void> => {
  const previousMetadata = new Map([...updates.keys()].map(metadataKey => [metadataKey, metadata[metadataKey]]));
  for (const [metadataKey, memo] of updates) metadata[metadataKey] = { memo };

  try {
    await persist();
  } catch (error) {
    for (const [metadataKey, previousValue] of previousMetadata) {
      if (previousValue) metadata[metadataKey] = previousValue;
      else delete metadata[metadataKey];
    }
    throw error;
  }
};

const _safeUnlink = async (filePath: string) => {
  const normalizedPath = decodeURI(filePath).replace(/^file:\/\//, '');
  const candidates = [normalizedPath, filePath].filter((value, index, all) => all.indexOf(value) === index);

  for (const candidate of candidates) {
    try {
      if (!(await RNFS.exists(candidate))) {
        continue;
      }

      await RNFS.unlink(candidate);
      return;
    } catch (error) {
      const message = String(errorMessage(error) || '').toLowerCase();
      const notFound = message.includes('no such file') || message.includes('does not exist') || message.includes('enoent');

      if (notFound) {
        return;
      }

      console.warn('Failed to remove temporary file:', candidate, error);
    }
  }
};

const _toFileUri = (filePath: string) => {
  return encodeURI(filePath.startsWith('file://') ? filePath : `file://${filePath}`);
};

const TEMP_EXPORT_PREFIX = 'bluewallet-export-';

const _createTempExportPath = (fileName: string) => {
  const basePath = RNFS.CachesDirectoryPath || RNFS.TemporaryDirectoryPath;
  return `${basePath}/${TEMP_EXPORT_PREFIX}${Date.now()}-${fileName}`;
};

export const cleanupTemporaryExportFiles = async (): Promise<void> => {
  const basePath = RNFS.CachesDirectoryPath || RNFS.TemporaryDirectoryPath;
  try {
    const entries = await RNFS.readDir(basePath);
    await Promise.all(entries.filter(entry => entry.name.startsWith(TEMP_EXPORT_PREFIX)).map(entry => _safeUnlink(entry.path)));
  } catch (error) {
    console.warn('Failed to clean temporary export files:', error);
  }
};

const _mimeTypeFromFileName = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'txt':
    case 'txn':
      return 'text/plain';
    case 'json':
      return 'application/json';
    case 'jsonl':
      return 'application/x-ndjson';
    case 'csv':
      return 'text/csv';
    case 'pdf':
      return 'application/pdf';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    default:
      return 'application/octet-stream';
  }
};

const _transactionFilePickerTypes = ['application/octet-stream', 'text/plain'];

export const isAppleNumbersFile = (path: string, fileName: string): boolean =>
  path.toLowerCase().endsWith('.numbers') || fileName.toLowerCase().endsWith('.numbers');

const _pickSingleFileAndKeepLocalCopy = async (type: string[] = [types.allFiles]) => {
  const [pickedFile] = await pick({
    type,
  });

  if (!pickedFile.hasRequestedType) {
    throw new Error(loc.send.details_unrecognized_file_format);
  }

  const [localCopy] = await keepLocalCopy({
    files: [
      {
        uri: pickedFile.uri,
        fileName: pickedFile.name ?? 'unnamed',
      },
    ],
    destination: 'cachesDirectory',
  });

  if (localCopy.status !== 'success') {
    throw new Error(localCopy.copyError || 'Could not create local file copy');
  }

  return {
    localUri: decodeURI(localCopy.localUri),
    fileName: pickedFile.name ?? 'unnamed',
  };
};

const _shareOpen = async (filePath: string, showShareDialog: boolean = false) => {
  try {
    await Share.open({
      url: 'file://' + filePath,
      saveToFiles: isDesktop || !showShareDialog,
      failOnCancel: false,
    });
  } catch (error) {
    console.log(error);
    // If user cancels sharing, we dont want to show an error. for some reason we get 'CANCELLED' string as error
    const message = errorMessage(error);
    if (message !== 'CANCELLED') {
      presentAlert({ message });
    }
  }
};

/**
 * Writes a file to fs, and triggers an OS sharing dialog, so user can decide where to put this file (share to cloud
 * or perhaps messaging app). Provided filename should be just a file name, NOT a path
 */

export const writeFileAndExport = async function (fileName: string, contents: string, showShareDialog: boolean = true) {
  const sanitizedFileName = _sanitizeFileName(fileName);
  try {
    await cleanupTemporaryExportFiles();
    if (!showShareDialog) {
      const sourceFilePath = _createTempExportPath(sanitizedFileName);
      try {
        await RNFS.writeFile(sourceFilePath, contents, 'utf8');
        const [savedFile] = await saveDocuments({
          sourceUris: [_toFileUri(sourceFilePath)],
          fileName: sanitizedFileName,
          mimeType: _mimeTypeFromFileName(sanitizedFileName),
          copy: true,
        });

        if (savedFile.error) {
          throw new Error(savedFile.error);
        }
      } finally {
        await _safeUnlink(sourceFilePath);
      }
      return;
    }

    const filePath = _createTempExportPath(sanitizedFileName);
    try {
      await RNFS.writeFile(filePath, contents, 'utf8');
      await _shareOpen(filePath, true);
    } finally {
      await _safeUnlink(filePath);
    }
  } catch (error) {
    if (isCancel(error)) {
      return;
    }
    console.error(error);
    presentAlert({ message: errorMessage(error) });
  }
};

/**
 * Opens & reads *.psbt files, and returns base64 psbt. FALSE if something went wrong (wont throw).
 */
export const openSignedTransaction = async function (): Promise<string | false> {
  try {
    const { localUri } = await _pickSingleFileAndKeepLocalCopy(_transactionFilePickerTypes);
    return await _readPsbtFileIntoBase64(localUri);
  } catch (err) {
    if (!isCancel(err)) {
      presentAlert({ message: loc.send.details_no_signed_tx });
    }
  }

  return false;
};

const _readPsbtFileIntoBase64 = async function (uri: string): Promise<string> {
  const base64 = await RNFS.readFile(uri, 'base64');
  const stringData = uint8ArrayToString(base64ToUint8Array(base64)); // decode from base64
  if (stringData.startsWith('psbt')) {
    // file was binary, but outer code expects base64 psbt, so we return base64 we got from rn-fs;
    // most likely produced by Electrum-desktop
    return base64;
  } else {
    // file was a text file, having base64 psbt in there. so we basically have double base64encoded string
    // thats why we are returning string that was decoded once;
    // most likely produced by ColdCard
    return stringData;
  }
};

export const showImagePickerAndReadImage = async (): Promise<string | undefined> => {
  try {
    const response: ImagePickerResponse = await launchImageLibrary({
      mediaType: 'photo',
      maxHeight: 800,
      maxWidth: 600,
      selectionLimit: 1,
      includeBase64: true,
    });

    if (response.didCancel) {
      return undefined;
    } else if (response.errorCode) {
      throw new Error(response.errorMessage);
    } else if (response.assets) {
      const base64 = response.assets[0].base64;
      if (base64) {
        const result = await detectQRCodeInImage(base64);
        if (result) return result;
      }
      throw new Error(loc.send.qr_error_no_qrcode);
    }

    return undefined;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const showFilePickerAndReadFile = async function (): Promise<{
  data: string | false;
  uri: string | false;
  fileName?: string;
  unsupportedFileType?: 'numbers';
}> {
  try {
    const { localUri: fileCopyUri, fileName } = await _pickSingleFileAndKeepLocalCopy();
    const lowerCasePath = fileCopyUri.toLowerCase();
    if (isAppleNumbersFile(fileCopyUri, fileName)) {
      return { data: false, uri: fileCopyUri, fileName, unsupportedFileType: 'numbers' };
    }
    if (lowerCasePath.endsWith('.psbt')) {
      // this is either binary file from ElectrumDesktop OR string file with base64 string in there
      const file = await _readPsbtFileIntoBase64(fileCopyUri);
      return { data: file, uri: fileCopyUri, fileName };
    }

    if (lowerCasePath.endsWith('.png') || lowerCasePath.endsWith('.jpg') || lowerCasePath.endsWith('.jpeg')) {
      return await handleImageFile(fileCopyUri);
    }

    const file = await RNFS.readFile(fileCopyUri, 'utf8');
    return { data: file, uri: fileCopyUri, fileName };
  } catch (err) {
    if (!isCancel(err)) {
      presentAlert({ message: errorMessage(err) });
    }
    return { data: false, uri: false };
  }
};

const readFileAsBase64 = async (uri: string): Promise<string> => {
  try {
    return await RNFS.readFile(uri, 'base64');
  } catch {
    return await RNFS.readFile(uri.replace(/^file:\/\//, ''), 'base64');
  }
};

const handleImageFile = async (fileCopyUri: string): Promise<{ data: string | false; uri: string | false }> => {
  const base64 = await readFileAsBase64(fileCopyUri);
  const result = await detectQRCodeInImage(base64);
  if (result) {
    return { data: result, uri: fileCopyUri };
  }
  throw new Error(loc.send.qr_error_no_qrcode);
};

export const readFileOutsideSandbox = (filePath: string) => {
  if (Platform.OS === 'ios') {
    return readFile(filePath);
  } else if (Platform.OS === 'android') {
    return RNFS.readFile(filePath);
  } else {
    presentAlert({ message: 'Not implemented for this platform' });
    throw new Error('Not implemented for this platform');
  }
};

export const openSignedTransactionRaw: () => Promise<string> = async () => {
  try {
    const { localUri } = await _pickSingleFileAndKeepLocalCopy(_transactionFilePickerTypes);
    const file = await RNFS.readFile(localUri);
    if (file) {
      return file;
    } else {
      throw new Error('Could not read file');
    }
  } catch (err) {
    if (!isCancel(err)) {
      presentAlert({ message: loc.send.details_no_signed_tx });
    }

    return '';
  }
};

export const pickTransaction = async () => {
  const { localUri, fileName } = await _pickSingleFileAndKeepLocalCopy(_transactionFilePickerTypes);
  return {
    uri: localUri,
    name: fileName,
  };
};
