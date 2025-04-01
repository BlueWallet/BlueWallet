import { Platform } from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import { launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import Share from 'react-native-share';
import * as ScopedStorage from 'react-native-scoped-storage';
import presentAlert from '../components/Alert';
import loc from '../loc';
import { isDesktop } from './environment';
import { readFile } from './react-native-bw-file-access';
import RNQRGenerator from 'rn-qr-generator';

const _sanitizeFileName = (fileName: string) => {
  // Remove any path delimiters and non-alphanumeric characters except for -, _, and .
  return fileName.replace(/[^a-zA-Z0-9\-_.]/g, '');
};

const isScopedStorageSupported = (): boolean => {
  const isSupported = Platform.OS === 'android' && Platform.Version >= 29;
  console.debug(`[fs] isScopedStorageSupported: ${isSupported}, Platform: ${Platform.OS}, Version: ${Platform.Version}`);
  return isSupported;
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
    if (error.message !== 'CANCELLED') {
      presentAlert({ message: error.message });
    }
  } finally {
    if (isScopedStorageSupported() && filePath.startsWith('content://')) {
      await ScopedStorage.deleteFile(filePath);
    } else {
      await RNFS.unlink(filePath);
    }
  }
};

const _getMimeType = (fileName: string): string => {
  if (fileName.toLowerCase().endsWith('.psbt') || fileName.toLowerCase().endsWith('.psbt.txn')) {
    return 'application/octet-stream';
  } else if (fileName.toLowerCase().endsWith('.json')) {
    return 'application/json';
  } else if (fileName.toLowerCase().endsWith('.txt')) {
    return 'text/plain';
  }
  return 'text/plain';
};

const checkStoragePermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;

  try {
    const persistedUris = await ScopedStorage.getPersistedUriPermissions();
    const hasPermissions = persistedUris.length > 0;
    console.debug(`[fs] checkStoragePermissions: ${hasPermissions}, URIs: ${persistedUris.length}`);
    return hasPermissions;
  } catch (error) {
    console.error('Error checking storage permissions:', error);
    return false;
  }
};

const requestStoragePermission = async (): Promise<{ uri: string; name: string } | null> => {
  if (Platform.OS !== 'android') return null;

  try {
    console.debug('[fs] Requesting storage permissions with directory picker');
    const dirResult = await ScopedStorage.openDocumentTree(false);

    if (!dirResult || !dirResult.uri) {
      console.debug('[fs] User cancelled directory selection');
      return null;
    }

    console.debug(`[fs] Obtained temporary permission to directory: ${dirResult.name}, URI: ${dirResult.uri}`);

    return dirResult;
  } catch (error) {
    console.error('Error requesting storage permissions:', error);
    return null;
  }
};

export const writeFileAndExport = async function (fileName: string, contents: string, showShareDialog: boolean = true): Promise<void> {
  const sanitizedFileName = _sanitizeFileName(fileName);
  console.debug(`[fs] writeFileAndExport: ${sanitizedFileName}, showShare: ${showShareDialog}`);
  try {
    if (Platform.OS === 'ios') {
      const filePath = `${RNFS.TemporaryDirectoryPath}/${sanitizedFileName}`;
      await RNFS.writeFile(filePath, contents);
      await _shareOpen(filePath, showShareDialog);
    } else if (Platform.OS === 'android') {
      try {
        const mimeType = _getMimeType(sanitizedFileName);
        console.debug(`[fs] Android write, mime: ${mimeType}, using scoped storage: ${isScopedStorageSupported()}`);

        if (isScopedStorageSupported()) {
          console.debug('[fs] Using Android Scoped Storage API');

          if (!showShareDialog) {
            console.debug('[fs] Requesting full storage access');
            await requestFullStorageAccess();
          }

          try {
            console.debug('[fs] Prompting user to select save location');
            const file = await ScopedStorage.createDocument(sanitizedFileName, mimeType, contents, 'utf8');

            if (file && file.uri && file.name) {
              console.debug(`[fs] File saved as: ${file.name} at ${file.uri}`);
              if (showShareDialog) {
                await _shareOpen(file.uri, showShareDialog);
              } else {
                presentAlert({ message: loc.formatString(loc.send.file_saved_at_path, { filePath: file.name }) });
              }
            } else {
              console.debug('[fs] File save operation returned incomplete result');
            }
          } catch (saveError: any) {
            console.error('[fs] Error during file save operation:', saveError);
            if (saveError.message.includes('permission') || saveError.message.includes('denied') || saveError.message.includes('cancel')) {
              console.debug('[fs] User cancelled save operation or denied permission');
              const wantToGrantAccess = await new Promise(resolve => {
                presentAlert({
                  message: loc.settings.storage_access_denied,
                  buttons: [
                    {
                      text: loc._.cancel,
                      onPress: () => resolve(false),
                      style: 'cancel',
                    },
                    {
                      text: loc.settings.grant_access,
                      style: 'default',
                      onPress: () => resolve(true),
                    },
                  ],
                });
              });

              if (wantToGrantAccess) {
                console.debug('[fs] User wants to grant folder access');
                await requestAccessToAdditionalDirectories();
                console.debug('[fs] Retrying file save after granting permissions');
                return writeFileAndExport(fileName, contents, showShareDialog);
              }
            } else {
              throw saveError;
            }
          }
        } else {
          const filePath = `${RNFS.DownloadDirectoryPath}/${sanitizedFileName}`;
          await RNFS.writeFile(filePath, contents);
          if (showShareDialog) {
            await _shareOpen(filePath);
          } else {
            presentAlert({ message: loc.formatString(loc.send.file_saved_at_path, { filePath }) });
          }
        }
      } catch (e: any) {
        console.error('Error in writeFileAndExport for Android:', e);
        presentAlert({ message: e.message });
      }
    }
  } catch (error: any) {
    console.error(error);
    presentAlert({ message: error.message });
  }
};

export const requestAccessToAdditionalDirectories = async (): Promise<boolean> => {
  if (!isScopedStorageSupported()) {
    return false;
  }

  try {
    const dir = await requestStoragePermission();
    if (dir) {
      console.debug(`[fs] Successfully granted access to ${dir.name}`);
      return true;
    } else {
      console.debug('[fs] No folder was selected or permission was denied');
      return false;
    }
  } catch (error: any) {
    console.error('Error requesting additional directory access:', error);
    presentAlert({ message: 'Error: ' + error.message });
    return false;
  }
};

export const requestFullStorageAccess = async (): Promise<boolean> => {
  if (!isScopedStorageSupported()) {
    console.debug('[fs] Scoped storage not supported on this device');
    return false;
  }

  try {
    const rootDir = await ScopedStorage.openDocumentTree(true);
    if (rootDir && rootDir.uri) {
      console.debug(`[fs] Access granted to ${rootDir.name}`);
      return true;
    } else {
      console.debug('[fs] Storage access was not granted');
      return false;
    }
  } catch (error: any) {
    console.error('Error requesting full storage access:', error);
    return false;
  }
};

export const addStorageSettingsSection = async (): Promise<void> => {
  await requestFullStorageAccess();
};

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
  console.debug(`[fs] _readPsbtFileIntoBase64: ${uri}`);
  let base64;
  if (isScopedStorageSupported()) {
    console.debug('[fs] Reading PSBT with ScopedStorage');
    base64 = await ScopedStorage.readFile(uri, 'base64');
  } else {
    base64 = await RNFS.readFile(uri, 'base64');
  }

  const stringData = Buffer.from(base64, 'base64').toString(); // decode from base64
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
  console.debug('[fs] showFilePickerAndReadFile: starting');
  try {
    if (Platform.OS === 'ios') {
      const res = await DocumentPicker.pickSingle({
        copyTo: 'cachesDirectory',
        type: [
          'io.bluewallet.psbt',
          'io.bluewallet.psbt.txn',
          'io.bluewallet.backup',
          DocumentPicker.types.plainText,
          DocumentPicker.types.json,
          DocumentPicker.types.images,
        ],
      });

      if (!res.fileCopyUri) {
        presentAlert({ message: loc._.file_picking_failed });
        return { data: false, uri: false };
      }

      const fileCopyUri = decodeURI(res.fileCopyUri);
      console.debug(`[fs] File picked: ${fileCopyUri}, type: ${res.type}`);

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
    } else if (Platform.OS === 'android') {
      // Use ScopedStorage for Android
      if (isScopedStorageSupported()) {
        console.debug('[fs] Using ScopedStorage.openDocument on Android');
        const res = await ScopedStorage.openDocument();

        if (!res || !res.uri) {
          console.debug('[fs] User cancelled file selection');
          return { data: false, uri: false };
        }

        const fileCopyUri = res.uri;
        console.debug(`[fs] File picked with ScopedStorage: ${fileCopyUri}, name: ${res.name}, type: ${res.type || 'unknown'}`);

        // Handle PSBT files based on extension
        if (res.name && res.name.toLowerCase().endsWith('.psbt')) {
          const file = await _readPsbtFileIntoBase64(fileCopyUri);
          return { data: file, uri: fileCopyUri };
        }

        // Handle image files based on mime type
        if (res.mime && res.mime.startsWith('image/')) {
          console.debug(`[fs] Detected image file with mime type: ${res.mime}`);
          return await handleImageFile(fileCopyUri);
        }

        // Read the file content
        const file = await ScopedStorage.readFile(fileCopyUri);
        return { data: file, uri: fileCopyUri };
      } else {
        // Fall back to DocumentPicker for older Android versions
        const res = await DocumentPicker.pickSingle({
          copyTo: 'cachesDirectory',
          type: [DocumentPicker.types.allFiles],
        });

        if (!res.fileCopyUri) {
          presentAlert({ message: loc._.file_picking_failed });
          return { data: false, uri: false };
        }

        const fileCopyUri = decodeURI(res.fileCopyUri);
        console.debug(`[fs] File picked with DocumentPicker: ${fileCopyUri}, type: ${res.type}`);

        if (res.fileCopyUri.toLowerCase().endsWith('.psbt')) {
          const file = await _readPsbtFileIntoBase64(fileCopyUri);
          return { data: file, uri: fileCopyUri };
        }

        if (res.type === DocumentPicker.types.images || res.type?.startsWith('image/')) {
          return await handleImageFile(fileCopyUri);
        }

        const file = await RNFS.readFile(fileCopyUri);
        return { data: file, uri: fileCopyUri };
      }
    }

    return { data: false, uri: false };
  } catch (err: any) {
    if (!DocumentPicker.isCancel(err)) {
      presentAlert({ message: err.message });
    }
    return { data: false, uri: false };
  }
};

const handleImageFile = async (fileCopyUri: string): Promise<{ data: string | false; uri: string | false }> => {
  try {
    let exists = false;

    if (isScopedStorageSupported()) {
      try {
        await ScopedStorage.stat(fileCopyUri);
        exists = true;
      } catch (e) {
        exists = false;
      }
    } else {
      exists = await RNFS.exists(fileCopyUri);
    }

    if (!exists) {
      presentAlert({ message: loc._.file_does_not_exist });
      return { data: false, uri: false };
    }

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
  } else if (isScopedStorageSupported()) {
    return ScopedStorage.readFile(filePath);
  } else {
    return RNFS.readFile(filePath);
  }
};

export { checkStoragePermissions };
