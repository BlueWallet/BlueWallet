import { Platform } from 'react-native';
import { pick, types, keepLocalCopy, errorCodes } from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import { launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import RNQRGenerator from 'rn-qr-generator';
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

const _shareOpen = async (filePath: string, showShareDialog: boolean = false) => {
  try {
    await Share.open({
      url: 'file://' + filePath,
      saveToFiles: isDesktop || !showShareDialog,
      // @ts-ignore: Website claims this propertie exists, but TS cant find it. Send anyways.
      useInternalStorage: Platform.OS === 'android',
      failOnCancel: false,
    });
  } catch (error: any) {
    console.log(error);
    // If user cancels sharing, we dont want to show an error. for some reason we get 'CANCELLED' string as error
    if (error.message !== 'CANCELLED') {
      presentAlert({ message: error.message });
    }
  } finally {
    await RNFS.unlink(filePath);
  }
};

/**
 * Writes a file to fs, and triggers an OS sharing dialog, so user can decide where to put this file (share to cloud
 * or perhaps messaging app). Provided filename should be just a file name, NOT a path
 */

export const writeFileAndExport = async function (fileName: string, contents: string, showShareDialog: boolean = true) {
  const sanitizedFileName = _sanitizeFileName(fileName);
  try {
    if (Platform.OS === 'ios') {
      const filePath = `${RNFS.TemporaryDirectoryPath}/${sanitizedFileName}`;
      await RNFS.writeFile(filePath, contents);
      await _shareOpen(filePath, showShareDialog);
    } else if (Platform.OS === 'android') {
      const filePath = `${RNFS.DownloadDirectoryPath}/${sanitizedFileName}`;
      try {
        await RNFS.writeFile(filePath, contents);
        if (showShareDialog) {
          await _shareOpen(filePath);
        } else {
          presentAlert({ message: loc.formatString(loc.send.file_saved_at_path, { filePath }) });
        }
      } catch (e: any) {
        console.error(e);
        presentAlert({ message: e.message });
      }
    }
  } catch (error: any) {
    console.error(error);
    presentAlert({ message: error.message });
  }
};

/**
 * Opens & reads *.psbt files, and returns base64 psbt. FALSE if something went wrong (wont throw).
 */
export const openSignedTransaction = async function (): Promise<string | false> {
  try {
    const [res] = await pick({
      type: [types.allFiles],
    });

    return await _readPsbtFileIntoBase64(res.uri);
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
    });

    if (response.didCancel) {
      return undefined;
    } else if (response.errorCode) {
      throw new Error(response.errorMessage);
    } else if (response.assets) {
      try {
        const uri = response.assets[0].uri;
        if (uri) {
          const result = await RNQRGenerator.detect({ uri: decodeURI(uri.toString()) });
          if (result?.values.length > 0) {
            return result?.values[0];
          }
        }
        throw new Error(loc.send.qr_error_no_qrcode);
      } catch (error) {
        console.error(error);
        presentAlert({ message: loc.send.qr_error_no_qrcode });
      }
    }

    return undefined;
  } catch (error: any) {
    console.error(error);
    throw error;
  }
};

export const showFilePickerAndReadFile = async function (): Promise<{ data: string | false; uri: string | false }> {
  try {
    const [pickedFile] = await pick({
      type: [types.allFiles],
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
      // to make ts happy, should not need this check here
      presentAlert({ message: 'Picking and caching a file failed: ' + localCopy.copyError });
      return { data: false, uri: false };
    }

    const fileCopyUri = decodeURI(localCopy.localUri);

    if (localCopy.localUri.toLowerCase().endsWith('.psbt')) {
      // this is either binary file from ElectrumDesktop OR string file with base64 string in there
      const file = await _readPsbtFileIntoBase64(fileCopyUri);
      return { data: file, uri: fileCopyUri };
    }

    if (localCopy.localUri.endsWith('.png') || localCopy.localUri.endsWith('.jpg') || localCopy.localUri.endsWith('.jpeg')) {
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

const handleImageFile = async (fileCopyUri: string): Promise<{ data: string | false; uri: string | false }> => {
  try {
    const exists = await RNFS.exists(fileCopyUri);
    if (!exists) {
      presentAlert({ message: 'File does not exist' });
      return { data: false, uri: false };
    }
    // First attempt: use original URI
    let result = await RNQRGenerator.detect({ uri: decodeURI(fileCopyUri) });
    if (result?.values && result.values.length > 0) {
      return { data: result.values[0], uri: fileCopyUri };
    }
    // Second attempt: remove file:// prefix and try again
    const altUri = fileCopyUri.replace(/^file:\/\//, '');
    result = await RNQRGenerator.detect({ uri: decodeURI(altUri) });
    if (result?.values && result.values.length > 0) {
      return { data: result.values[0], uri: fileCopyUri };
    }
    presentAlert({ message: loc.send.qr_error_no_qrcode });
    return { data: false, uri: false };
  } catch (error: any) {
    console.error(error);
    presentAlert({ message: loc.send.qr_error_no_qrcode });
    return { data: false, uri: false };
  }
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
    const [res] = await pick({
      type: [types.allFiles],
    });
    const file = await RNFS.readFile(res.uri);
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
  const [res] = await pick({
    type: [types.allFiles],
  });

  return res;
};
