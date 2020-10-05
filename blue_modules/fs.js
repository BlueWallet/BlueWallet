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

const openSignedTransaction = async function () {
  try {
    const res = await DocumentPicker.pick({
      type: Platform.OS === 'ios' ? ['io.bluewallet.psbt', 'io.bluewallt.psbt.txn'] : [DocumentPicker.types.allFiles],
    });
    return await RNFS.readFile(res.uri);
  } catch (err) {
    if (!DocumentPicker.isCancel(err)) {
      alert(loc.send.details_no_signed_tx);
    }
  }

  return false;
};

module.exports.writeFileAndExport = writeFileAndExport;
module.exports.openSignedTransaction = openSignedTransaction;
