import { Platform } from 'react-native';
import { pick, types, keepLocalCopy, errorCodes, saveDocuments } from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import { launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import { detectQRCodeInImage } from 'react-native-camera-kit-no-google';
import Share from 'react-native-share';

import presentAlert from '../components/Alert';
import loc from '../loc';
import { isDesktop } from './environment';
import { readFile } from './react-native-bw-file-access';
import { base64ToUint8Array, uint8ArrayToString } from './uint8array-extras/index';

const _sanitizeFileName = (fileName: string) => {
  // Remove any path delimiters and non-alphanumeric characters except for -, _, and .
  return fileName.replace(/[^a-zA-Z0-9\-_.]/g, '');
};

export const isCancel = (err: any): boolean => {
  return err.code && err.code === errorCodes.OPERATION_CANCELED;
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
    } catch (error: any) {
      const message = String(error?.message || '').toLowerCase();
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

const _createTempExportPath = (fileName: string) => {
  const basePath = RNFS.CachesDirectoryPath || RNFS.TemporaryDirectoryPath;
  return `${basePath}/${Date.now()}-${fileName}`;
};

const _mimeTypeFromFileName = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'txt':
    case 'txn':
      return 'text/plain';
    case 'json':
      return 'application/json';
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

const _transactionFilePickerTypes = [types.allFiles];

const _pickSingleFileAndKeepLocalCopy = async (type: string[] = [types.allFiles]) => {
  const [pickedFile] = await pick({
    type,
  });

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
  } catch (error: any) {
    console.log(error);
    // If user cancels sharing, we dont want to show an error. for some reason we get 'CANCELLED' string as error
    const errorMessage = typeof error === 'string' ? error : error?.message;
    if (errorMessage !== 'CANCELLED') {
      presentAlert({ message: errorMessage });
    }
  } finally {
    await _safeUnlink(filePath);
  }
};

/**
 * Writes a file to fs, and triggers an OS sharing dialog, so user can decide where to put this file (share to cloud
 * or perhaps messaging app). Provided filename should be just a file name, NOT a path
 */

export const writeFileAndExport = async function (fileName: string, contents: string, showShareDialog: boolean = true) {
  const sanitizedFileName = _sanitizeFileName(fileName);
  try {
    if (Platform.OS === 'android' && !showShareDialog) {
      const sourceFilePath = _createTempExportPath(sanitizedFileName);
      try {
        await RNFS.writeFile(sourceFilePath, contents);
        const [savedFile] = await saveDocuments({
          sourceUris: [_toFileUri(sourceFilePath)],
          fileName: sanitizedFileName,
          mimeType: _mimeTypeFromFileName(sanitizedFileName),
        });

        if (savedFile.error) {
          // User dismissed the save dialog or the provider reported an error; treat as cancel.
          console.warn('saveDocuments returned error (user may have cancelled):', savedFile.error);
          return;
        }
      } finally {
        await _safeUnlink(sourceFilePath);
      }
      return;
    }

    if (Platform.OS === 'ios') {
      const filePath = _createTempExportPath(sanitizedFileName);
      await RNFS.writeFile(filePath, contents);
      await _shareOpen(filePath, showShareDialog);
    } else if (Platform.OS === 'android') {
      const filePath = _createTempExportPath(sanitizedFileName);
      try {
        await RNFS.writeFile(filePath, contents);
        if (showShareDialog) {
          await _shareOpen(filePath, true);
        }
      } catch (e: any) {
        console.error(e);
        presentAlert({ message: e.message });
      }
    }
  } catch (error: any) {
    if (isCancel(error)) {
      return;
    }
    console.error(error);
    presentAlert({ message: error.message });
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
  } catch (error: any) {
    console.error(error);
    throw error;
  }
};

export const showFilePickerAndReadFile = async function (): Promise<{ data: string | false; uri: string | false }> {
  try {
    const { localUri: fileCopyUri } = await _pickSingleFileAndKeepLocalCopy();
    const lowerCasePath = fileCopyUri.toLowerCase();

    if (lowerCasePath.endsWith('.psbt')) {
      // this is either binary file from ElectrumDesktop OR string file with base64 string in there
      const file = await _readPsbtFileIntoBase64(fileCopyUri);
      return { data: file, uri: fileCopyUri };
    }

    if (lowerCasePath.endsWith('.png') || lowerCasePath.endsWith('.jpg') || lowerCasePath.endsWith('.jpeg')) {
      return await handleImageFile(fileCopyUri);
    }

    const file = await RNFS.readFile(fileCopyUri);
    return { data: file, uri: fileCopyUri };
  } catch (err: any) {
    if (!isCancel(err)) {
      presentAlert({ message: err.message });
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
