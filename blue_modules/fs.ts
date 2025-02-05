import { Alert, Linking, Platform } from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import { launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import Share from 'react-native-share';
import { request, PERMISSIONS } from 'react-native-permissions';
import presentAlert from '../components/Alert';
import loc from '../loc';
import { isDesktop } from './environment';
import { readFile } from './react-native-bw-file-access';
import RNQRGenerator from 'rn-qr-generator';

const _sanitizeFileName = (fileName: string) => {
  // Remove any path delimiters and non-alphanumeric characters except for -, _, and .
  return fileName.replace(/[^a-zA-Z0-9\-_.]/g, '');
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
 * or perhabs messaging app). Provided filename should be just a file name, NOT a path
 */

export const writeFileAndExport = async function (fileName: string, contents: string, showShareDialog: boolean = true) {
  const sanitizedFileName = _sanitizeFileName(fileName);
  try {
    if (Platform.OS === 'ios') {
      const filePath = `${RNFS.TemporaryDirectoryPath}/${sanitizedFileName}`;
      await RNFS.writeFile(filePath, contents);
      await _shareOpen(filePath, showShareDialog);
    } else if (Platform.OS === 'android') {
      const isAndroidVersion33OrAbove = Platform.Version >= 33;
      const permissionType = isAndroidVersion33OrAbove ? PERMISSIONS.ANDROID.READ_MEDIA_IMAGES : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;

      const result = await request(permissionType);
      if (result === 'granted') {
        const filePath = `${RNFS.ExternalDirectoryPath}/${sanitizedFileName}`;
        try {
          await RNFS.writeFile(filePath, contents);
          if (showShareDialog) {
            await _shareOpen(filePath);
          } else {
            presentAlert({ message: loc.formatString(loc.send.file_saved_at_path, { filePath }) });
          }
        } catch (e: any) {
          presentAlert({ message: e.message });
        }
      } else {
        Alert.alert(loc.send.permission_storage_title, loc.send.permission_storage_denied_message, [
          {
            text: loc.send.open_settings,
            onPress: () => {
              Linking.openSettings();
            },
            style: 'default',
          },
          { text: loc._.cancel, onPress: () => {}, style: 'cancel' },
        ]);
      }
    }
  } catch (error: any) {
    presentAlert({ message: error.message });
  }
};

/**
 * Opens & reads *.psbt files, and returns base64 psbt. FALSE if something went wrong (wont throw).
 */
export const openSignedTransaction = async function (): Promise<string | false> {
  try {
    const res = await DocumentPicker.pickSingle({
      type:
        Platform.OS === 'ios'
          ? ['io.bluewallet.psbt', 'io.bluewallet.psbt.txn', DocumentPicker.types.json]
          : [DocumentPicker.types.allFiles],
    });

    return await _readPsbtFileIntoBase64(res.uri);
  } catch (err) {
    if (!DocumentPicker.isCancel(err)) {
      presentAlert({ message: loc.send.details_no_signed_tx });
    }
  }

  return false;
};

const _readPsbtFileIntoBase64 = async function (uri: string): Promise<string> {
  const base64 = await RNFS.readFile(uri, 'base64');
  const stringData = Buffer.from(base64, 'base64').toString(); // decode from base64
  if (stringData.startsWith('psbt')) {
    // file was binary, but outer code expects base64 psbt, so we return base64 we got from rn-fs;
    // most likely produced by Electrum-desktop
    return base64;
  } else {
    // file was a text file, having base64 psbt in there. so we basically have double base64encoded string
    // thats why we are returning string that was decoded once;
    // most likely produced by Coldcard
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
    const res = await DocumentPicker.pickSingle({
      copyTo: 'cachesDirectory',
      type:
        Platform.OS === 'ios'
          ? [
              'io.bluewallet.psbt',
              'io.bluewallet.psbt.txn',
              'io.bluewallet.backup',
              DocumentPicker.types.plainText,
              DocumentPicker.types.json,
              DocumentPicker.types.images,
            ]
          : [DocumentPicker.types.allFiles],
    });

    if (!res.fileCopyUri) {
      // to make ts happy, should not need this check here
      presentAlert({ message: 'Picking and caching a file failed' });
      return { data: false, uri: false };
    }

    const fileCopyUri = decodeURI(res.fileCopyUri);

    if (res.fileCopyUri.toLowerCase().endsWith('.psbt')) {
      // this is either binary file from ElectrumDesktop OR string file with base64 string in there
      const file = await _readPsbtFileIntoBase64(fileCopyUri);
      return { data: file, uri: fileCopyUri };
    }

    if (res.type === DocumentPicker.types.images || res.type?.startsWith('image/')) {
      return await handleImageFile(fileCopyUri);
    }

    const file = await RNFS.readFile(fileCopyUri);
    return { data: file, uri: fileCopyUri };
  } catch (err: any) {
    if (!DocumentPicker.isCancel(err)) {
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
