import { Alert, Linking, PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import loc from '../loc';
import DocumentPicker from 'react-native-document-picker';
import { launchImageLibrary } from 'react-native-image-picker';
import { isDesktop } from './environment';
import presentAlert from '../components/Alert';
import { readFile } from './react-native-bw-file-access';

const LocalQRCode = require('@remobile/react-native-qrcode-local-image');

const _shareOpen = async (filePath: string) => {
  return await Share.open({
    url: 'file://' + filePath,
    saveToFiles: isDesktop,
  })
    .catch(error => {
      presentAlert({ message: error.message });
      console.log(error);
    })
    .finally(() => {
      RNFS.unlink(filePath);
    });
};

/**
 * Writes a file to fs, and triggers an OS sharing dialog, so user can decide where to put this file (share to cloud
 * or perhabs messaging app). Provided filename should be just a file name, NOT a path
 */
export const writeFileAndExport = async function (filename: string, contents: string) {
  if (Platform.OS === 'ios') {
    const filePath = RNFS.TemporaryDirectoryPath + `/${filename}`;
    await RNFS.writeFile(filePath, contents);
    await _shareOpen(filePath);
  } else if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE, {
      title: loc.send.permission_storage_title,
      message: loc.send.permission_storage_message,
      buttonNeutral: loc.send.permission_storage_later,
      buttonNegative: loc._.cancel,
      buttonPositive: loc._.ok,
    });

    // In Android 13 no WRITE_EXTERNAL_STORAGE permission is needed
    // @see https://stackoverflow.com/questions/76311685/permissionandroid-request-always-returns-never-ask-again-without-any-prompt-r
    if (granted === PermissionsAndroid.RESULTS.GRANTED || Platform.Version >= 33) {
      const filePath = RNFS.DocumentDirectoryPath + `/${filename}`;
      try {
        await RNFS.writeFile(filePath, contents);
        console.log(`file saved to ${filePath}`);
        await _shareOpen(filePath);
      } catch (e: any) {
        console.log(e);
        presentAlert({ message: e.message });
      }
    } else {
      console.log('Storage Permission: Denied');
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
  } else {
    presentAlert({ message: 'Not implemented for this platform' });
  }
};

/**
 * Opens & reads *.psbt files, and returns base64 psbt. FALSE if something went wrong (wont throw).
 */
export const openSignedTransaction = async function (): Promise<string | boolean> {
  try {
    const res = await DocumentPicker.pickSingle({
      type: Platform.OS === 'ios' ? ['io.bluewallet.psbt', 'io.bluewallet.psbt.txn'] : [DocumentPicker.types.allFiles],
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

export const showImagePickerAndReadImage = () => {
  return new Promise((resolve, reject) =>
    launchImageLibrary(
      {
        mediaType: 'photo',
        maxHeight: 800,
        maxWidth: 600,
        selectionLimit: 1,
      },
      response => {
        if (!response.didCancel) {
          const asset = response.assets?.[0] ?? {};
          if (asset.uri) {
            const uri = asset.uri.toString().replace('file://', '');
            LocalQRCode.decode(uri, (error: any, result: string) => {
              if (!error) {
                resolve(result);
              } else {
                reject(new Error(loc.send.qr_error_no_qrcode));
              }
            });
          }
        }
      },
    ),
  );
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
              'public.json',
              DocumentPicker.types.images,
            ]
          : [DocumentPicker.types.allFiles],
    });

    if (!res.fileCopyUri) {
      presentAlert({ message: 'Picking and caching a file failed' });
      return { data: false, uri: false };
    }

    const fileCopyUri = decodeURI(res.fileCopyUri);

    let file;
    if (res.fileCopyUri.toLowerCase().endsWith('.psbt')) {
      // this is either binary file from ElectrumDesktop OR string file with base64 string in there
      file = await _readPsbtFileIntoBase64(fileCopyUri);
      return { data: file, uri: decodeURI(res.fileCopyUri) };
    }

    if (res.type === DocumentPicker.types.images || res.type?.startsWith('image/')) {
      return new Promise(resolve => {
        if (!res.fileCopyUri) {
          // to make ts happy, should not need this check here
          presentAlert({ message: 'Picking and caching a file failed' });
          resolve({ data: false, uri: false });
          return;
        }
        const uri2 = res.fileCopyUri.replace('file://', '');
        LocalQRCode.decode(decodeURI(uri2), (error: any, result: string) => {
          if (!error) {
            resolve({ data: result, uri: fileCopyUri });
          } else {
            resolve({ data: false, uri: false });
          }
        });
      });
    }

    file = await RNFS.readFile(fileCopyUri);
    return { data: file, uri: fileCopyUri };
  } catch (err: any) {
    if (!DocumentPicker.isCancel(err)) {
      presentAlert({ message: err.message });
    }
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
