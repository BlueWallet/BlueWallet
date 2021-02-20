/* global alert */
import { Alert, Linking, PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import loc from '../loc';
import DocumentPicker from 'react-native-document-picker';
import isCatalyst from 'react-native-is-catalyst';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { presentCameraNotAuthorizedAlert } from '../class/camera';
import Clipboard from '@react-native-community/clipboard';
import ActionSheet from '../screen/ActionSheet';
const LocalQRCode = require('@remobile/react-native-qrcode-local-image');

const writeFileAndExport = async function (filename, contents) {
  if (Platform.OS === 'ios') {
    const filePath = RNFS.TemporaryDirectoryPath + `/${filename}`;
    await RNFS.writeFile(filePath, contents);
    Share.open({
      url: 'file://' + filePath,
      saveToFiles: isCatalyst,
    })
      .catch(error => {
        console.log(error);
      })
      .finally(() => {
        RNFS.unlink(filePath);
      });
  } else if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE, {
      title: loc.send.permission_storage_title,
      message: loc.send.permission_storage_message,
      buttonNeutral: loc.send.permission_storage_later,
      buttonNegative: loc._.cancel,
      buttonPositive: loc._.ok,
    });

    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      console.log('Storage Permission: Granted');
      const filePath = RNFS.DownloadDirectoryPath + `/${filename}`;
      try {
        await RNFS.writeFile(filePath, contents);
        alert(loc.formatString(loc._.file_saved, { filePath: filename }));
      } catch (e) {
        console.log(e);
        alert(e.message);
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
  }
};

/**
 * Opens & reads *.psbt files, and returns base64 psbt. FALSE if something went wrong (wont throw).
 *
 * @returns {Promise<string|boolean>} Base64 PSBT
 */
const openSignedTransaction = async function () {
  try {
    const res = await DocumentPicker.pick({
      type: Platform.OS === 'ios' ? ['io.bluewallet.psbt', 'io.bluewallt.psbt.txn'] : [DocumentPicker.types.allFiles],
    });

    return await _readPsbtFileIntoBase64(res.uri);
  } catch (err) {
    if (!DocumentPicker.isCancel(err)) {
      alert(loc.send.details_no_signed_tx);
    }
  }

  return false;
};

const _readPsbtFileIntoBase64 = async function (uri) {
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

const showImagePickerAndReadImage = () => {
  return new Promise((resolve, reject) =>
    launchImageLibrary(
      {
        title: null,
        mediaType: 'photo',
        takePhotoButtonTitle: null,
      },
      response => {
        if (response.uri) {
          const uri = Platform.OS === 'ios' ? response.uri.toString().replace('file://', '') : response.path.toString();
          LocalQRCode.decode(uri, (error, result) => {
            if (!error) {
              resolve(result);
            } else {
              reject(new Error(loc.send.qr_error_no_qrcode));
            }
          });
        }
      },
    ),
  );
};

const takePhotoWithImagePickerAndReadPhoto = () => {
  return new Promise((resolve, reject) =>
    launchCamera(
      {
        title: null,
        mediaType: 'photo',
        takePhotoButtonTitle: null,
      },
      response => {
        if (response.uri) {
          const uri = Platform.OS === 'ios' ? response.uri.toString().replace('file://', '') : response.path.toString();
          LocalQRCode.decode(uri, (error, result) => {
            if (!error) {
              resolve(result);
            } else {
              reject(new Error(loc.send.qr_error_no_qrcode));
            }
          });
        } else if (response.error) {
          presentCameraNotAuthorizedAlert(response.error);
        }
      },
    ),
  );
};

const showFilePickerAndReadFile = async function () {
  try {
    const res = await DocumentPicker.pick({
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

    const uri = Platform.OS === 'ios' ? decodeURI(res.uri) : res.uri;
    // ^^ some weird difference on how spaces in filenames are treated on ios and android

    let file = false;
    if (res.uri.toLowerCase().endsWith('.psbt')) {
      // this is either binary file from ElectrumDesktop OR string file with base64 string in there
      file = await _readPsbtFileIntoBase64(uri);
      return { data: file, uri: decodeURI(res.uri) };
    }

    if (res?.type === DocumentPicker.types.images || res?.type?.startsWith('image/')) {
      return new Promise(resolve => {
        const uri = Platform.OS === 'ios' ? res.uri.toString().replace('file://', '') : res.uri;
        LocalQRCode.decode(decodeURI(uri), (error, result) => {
          if (!error) {
            resolve({ data: result, uri: decodeURI(res.uri) });
          } else {
            resolve({ data: false, uri: false });
          }
        });
      });
    }

    file = await RNFS.readFile(uri);
    return { data: file, uri: decodeURI(res.uri) };
  } catch (err) {
    return { data: false, uri: false };
  }
};

// Intended for macOS Catalina. Not for long press shortcut
const showActionSheet = async () => {
  const isClipboardEmpty = (await Clipboard.getString()).replace(' ', '').length === 0;
  let copyFromClipboardIndex;
  const options = [loc._.cancel, loc.wallets.take_photo, loc.wallets.list_long_choose];
  if (!isClipboardEmpty) {
    options.push(loc.wallets.list_long_clipboard);
    copyFromClipboardIndex = options.length - 1;
  }

  options.push(loc.wallets.import_file);
  const importFileButtonIndex = options.length - 1;

  return new Promise(resolve =>
    ActionSheet.showActionSheetWithOptions({ options, cancelButtonIndex: 0 }, async buttonIndex => {
      if (buttonIndex === 1) {
        takePhotoWithImagePickerAndReadPhoto().then(resolve);
      } else if (buttonIndex === 2) {
        showImagePickerAndReadImage()
          .then(resolve)
          .catch(error => alert(error.message));
      } else if (buttonIndex === copyFromClipboardIndex) {
        const clipboard = await Clipboard.getString();
        resolve(clipboard);
      } else if (importFileButtonIndex) {
        const { data } = await showFilePickerAndReadFile();
        if (data) {
          resolve(data);
        }
      }
    }),
  );
};

module.exports.writeFileAndExport = writeFileAndExport;
module.exports.openSignedTransaction = openSignedTransaction;
module.exports.showFilePickerAndReadFile = showFilePickerAndReadFile;
module.exports.showImagePickerAndReadImage = showImagePickerAndReadImage;
module.exports.takePhotoWithImagePickerAndReadPhoto = takePhotoWithImagePickerAndReadPhoto;
module.exports.showActionSheet = showActionSheet;
