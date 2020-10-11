/* global alert */
import { PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import loc from '../loc';
import { getSystemName } from 'react-native-device-info';
import DocumentPicker from 'react-native-document-picker';

const isDesktop = getSystemName() === 'Mac OS X';

const writeFileAndExport = async function (filename, contents) {
  if (Platform.OS === 'ios') {
    const filePath = RNFS.TemporaryDirectoryPath + `/${filename}`;
    await RNFS.writeFile(filePath, contents);
    Share.open({
      url: 'file://' + filePath,
      saveToFiles: isDesktop,
    })
      .catch(error => {
        console.log(error);
        // alert(error.message);
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
      await RNFS.writeFile(filePath, contents);
      alert(loc.formatString(loc._.file_saved, { filePath: filename }));
    } else {
      console.log('Storage Permission: Denied');
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

const showFilePickerAndReadFile = async function () {
  try {
    const res = await DocumentPicker.pick({
      type:
        Platform.OS === 'ios'
          ? ['io.bluewallet.psbt', 'io.bluewallet.psbt.txn', 'io.bluewallet.backup', DocumentPicker.types.plainText, 'public.json']
          : [DocumentPicker.types.allFiles],
    });

    let file = false;
    if (res.uri.toLowerCase().endsWith('.psbt')) {
      // this is either binary file from ElectrumDesktop OR string file with base64 string in there
      file = await _readPsbtFileIntoBase64(res.uri);
    } else {
      file = await RNFS.readFile(res.uri);
    }

    return { data: file, uri: res.uri };
  } catch (err) {
    if (!DocumentPicker.isCancel(err)) {
      return { data: false, uri: false };
    }
  }
};

module.exports.writeFileAndExport = writeFileAndExport;
module.exports.openSignedTransaction = openSignedTransaction;
module.exports.showFilePickerAndReadFile = showFilePickerAndReadFile;
