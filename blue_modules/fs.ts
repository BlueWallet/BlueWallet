import { NativeModules, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { ImagePickerResponse, launchImageLibrary } from 'react-native-image-picker';
import Share from 'react-native-share';
import { saveDocuments, pick, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import presentAlert from '../components/Alert';
import loc from '../loc';
import { isDesktop } from './environment';
import RNQRGenerator from 'rn-qr-generator';


const { BWFileAccess } = NativeModules;

export const readFile = (path: string): Promise<string> => {
  const sanitizedPath = path.trim();
  const decodedPath = decodeURIComponent(decodeURI(sanitizedPath));
  return new Promise((resolve, reject) => {
    BWFileAccess.ReadFile(decodedPath, (error: string | null, content: string) => {
      if (error) {
        reject(new Error(error));
      } else {
        resolve(content);
      }
    });
  });
};

const applicationId = 'io.bluewallet.bluewallet';

const _sanitizeFileName = (fileName: string) => {
  console.log('Sanitizing filename:', { original: fileName });
  const decodedName = decodeURI(fileName.trim());
  const sanitized = decodedName.replace(/[^a-zA-Z0-9\-_.]/g, '');
  console.log('Filename sanitized:', { sanitized });
  return sanitized;
};

const sanitizeUri = (uri: string): string => {
  console.log('Sanitizing URI:', { original: uri });
  const trimmedUri = uri.trim();
  const decodedUri = decodeURIComponent(decodeURI(trimmedUri));
  if (Platform.OS === 'android' && decodedUri.startsWith('content://')) {
    console.log('Keeping Android content URI as is:', decodedUri);
    return decodedUri; // Keep content:// URIs intact on Android
  }
  const sanitized = decodedUri.replace(/^file:\/\//, '').replace(/^content:\/\//, '');
  console.log('URI sanitized:', { sanitized });
  return sanitized;
};

const createContentUri = (path: string): string => {
  console.log('Creating content URI for path:', path);
  const trimmedPath = path.trim();
  const uri = `content://${applicationId}.provider/cache/${encodeURIComponent(encodeURI(trimmedPath))}`;
  console.log('Content URI created:', uri);
  return uri;
};

const _shareOpen = async (filePath: string, showShareDialog: boolean = false) => {
  console.log('Opening share dialog:', { filePath, showShareDialog });
  try {
    await Share.open({
      url: filePath,
      saveToFiles: isDesktop || !showShareDialog,
      failOnCancel: false,
    });
    console.log('Share dialog completed successfully');
  } catch (error: any) {
    console.error('Share open failed:', { error, filePath });
    if (error.message !== 'CANCELLED') {
      presentAlert({ message: error.message });
    }
  } finally {
    console.log('Cleaning up temporary file:', filePath);
    await RNFS.unlink(filePath);
  }
};

/**
 * Writes a file to fs, and triggers an OS sharing dialog, so user can decide where to put this file (share to cloud
 * or perhaps messaging app). Provided filename should be just a file name, NOT a path
 */
export const writeFileAndExport = async function (fileName: string, contents: string, showShareDialog: boolean = true) {
  console.log('Writing file and exporting:', { fileName, showShareDialog });
  const sanitizedFileName = _sanitizeFileName(fileName);
  try {
    if (Platform.OS === 'ios') {
      const filePath = `${RNFS.TemporaryDirectoryPath}/${sanitizedFileName}`;
      console.log('Writing file on iOS:', { filePath });
      await RNFS.writeFile(filePath, contents);
      await _shareOpen(filePath, showShareDialog);
    } else if (Platform.OS === 'android') {
      // Log all available paths to debug
      console.log('Available paths:', { 
        DocumentDir: RNFS.DocumentDirectoryPath,
        DownloadDir: RNFS.DownloadDirectoryPath,
        CachesDir: RNFS.CachesDirectoryPath,
        PicturesDir: RNFS.PicturesDirectoryPath,
        TempDir: RNFS.TemporaryDirectoryPath,
        LibraryDir: RNFS.LibraryDirectoryPath,
        ExternalDir: RNFS.ExternalDirectoryPath,
        ExternalStorageDir: RNFS.ExternalStorageDirectoryPath
      });
      
      // Use a reliable directory path that's always available
      const tempFilePath = `${RNFS.CachesDirectoryPath}/${sanitizedFileName}`;
      console.log('Writing temporary file on Android:', { tempFilePath });
      await RNFS.writeFile(tempFilePath, contents);

      if (showShareDialog) {
        await _shareOpen(tempFilePath, showShareDialog);
      } else {
        try {
          console.log('Saving document using document picker');
          const encodedPath = encodeURIComponent(encodeURI(sanitizedFileName));
          const contentUri = createContentUri(encodedPath);
          console.log('Using content URI:', contentUri);
          
          const [{ uri: targetUri, name: savedFileName }] = await saveDocuments({
            sourceUris: [contentUri],
            copy: true,
            mimeType: 'text/plain',
            fileName: sanitizedFileName,
          });
          console.log('Document saved successfully:', { targetUri, savedFileName });

          await RNFS.unlink(tempFilePath);
          console.log('Temporary file cleaned up');

          if (targetUri) {
            presentAlert({ message: loc.formatString(loc.send.file_saved_at_path, { filePath: savedFileName || fileName }) });
          }
        } catch (e) {
          console.error('Save document failed:', { error: e, fileName });
          await RNFS.unlink(tempFilePath);
          if (e instanceof Error) {
            presentAlert({ message: e.message });
          } else {
            presentAlert({ message: 'An unknown error occurred' });
          }
        }
      }
    }
  } catch (error: any) {
    console.error('Write and export failed:', { error, fileName });
    presentAlert({ message: error.message });
  }
};

const handleError = (err: unknown) => {
  if (isErrorWithCode(err)) {
    switch (err.code) {
      case errorCodes.IN_PROGRESS:
        console.warn('user attempted to present a picker, but a previous one was already presented');
        break;
      case errorCodes.UNABLE_TO_OPEN_FILE_TYPE:
        console.warn('unable to open file type');
        break;
      case errorCodes.OPERATION_CANCELED:
        console.log('cancelled');
        break;
      default:
        console.error(err);
    }
  } else {
    console.warn(err);
  }
};

/**
 * Opens & reads *.psbt files, and returns base64 psbt. FALSE if something went wrong (wont throw).
 */
export const openSignedTransaction = async function (): Promise<string | false> {
  try {
    const [result] = await pick({
      type: ['io.bluewallet.psbt', 'io.bluewallet.psbt.txn', 'application/json'],
    });

    if (!result.uri) return false;
    return await _readPsbtFileIntoBase64(sanitizeUri(result.uri));
  } catch (err) {
    handleError(err);
    return false;
  }
};

const _readPsbtFileIntoBase64 = async function (uri: string): Promise<string> {
  console.log('Reading PSBT file:', { uri });
  const sanitizedUri = sanitizeUri(uri);
  console.log('Using sanitized URI:', { sanitizedUri });
  const base64 = await RNFS.readFile(sanitizedUri, 'base64');
  const stringData = Buffer.from(base64, 'base64').toString();
  if (stringData.trim().startsWith('psbt')) {
    return base64;
  } else {
    return stringData;
  }
};

const handleImageFile = async (fileCopyUri: string): Promise<{ data: string | false; uri: string | false }> => {
  try {
    if (Platform.OS === 'android' && fileCopyUri.startsWith('content://')) {
      // On Android, use direct content URI for QR detection
      console.log('Processing Android content URI:', fileCopyUri);
      const result = await RNQRGenerator.detect({ uri: fileCopyUri });
      console.log('QR detection result:', { hasValues: !!result?.values?.length });
      
      if (result?.values?.[0]) {
        return { data: result.values[0], uri: fileCopyUri };
      }
      throw new Error(loc.send.qr_error_no_qrcode);
    }

    // For iOS and other cases
    const exists = await RNFS.exists(fileCopyUri);
    if (!exists) {
      console.warn('Image file does not exist:', fileCopyUri);
      throw new Error('IMAGE_NOT_FOUND');
    }

    const sanitizedUri = sanitizeUri(fileCopyUri);
    console.log('Attempting QR detection on sanitized URI:', sanitizedUri);
    const result = await RNQRGenerator.detect({ uri: sanitizedUri });
    console.log('QR detection result:', { hasValues: !!result?.values?.length });
    
    if (result?.values?.[0]) {
      return { data: result.values[0], uri: fileCopyUri };
    }

    // Try parsing file contents as JSON with QR values
    const fileContents = await RNFS.readFile(sanitizedUri);
    try {
      const parsed = JSON.parse(fileContents);
      if (parsed?.values?.[0]) {
        return { data: parsed.values[0], uri: fileCopyUri };
      }
    } catch (e) {
      // Not JSON or no QR values
      console.warn('File is not a JSON with QR values:', e);
    }

    console.warn('No QR code found in image:', fileCopyUri);
    return { data: false, uri: false };
  } catch (err: any) {
    console.error('Image processing error:', err);
    if (err.message === 'IMAGE_NOT_FOUND') {
      throw new Error(loc.send.qr_error_no_qrcode);
    }
    throw err;
  }
};

export const showFilePickerAndReadFile = async function (): Promise<{ data: string | false; uri: string | false }> {
  console.log('Showing file picker');
  try {
    const [result] = await pick();
    console.log('File picker result:', { hasUri: !!result?.uri, type: result?.type });

    if (!result?.uri) {
      console.warn('No uri in file picker result');
      return { data: false, uri: false };
    }

    const fileUri = result.uri;
    console.log('Processing file:', { fileUri, type: result.type });

    try {
      // Handle images using QR decoder
      if (result.type?.startsWith('image/') || result.nativeType?.includes('image')) {
        return await handleImageFile(fileUri);
      }

      // Handle text files
      const file = await RNFS.readFile(fileUri, 'utf8');
      return { data: file, uri: fileUri };
      
    } catch (error) {
      console.error('File processing error:', error);
      return { data: false, uri: false };
    }
  } catch (err) {
    console.error('File picker error:', err);
    handleError(err);
    return { data: false, uri: false };
  }
};

export const readFileOutsideSandbox = async (filePath: string): Promise<{ data: string | false; uri: string | false }> => {
  const sanitizedPath = sanitizeUri(filePath);
  try {
    const fileContents = Platform.OS === 'ios' 
      ? await readFile(sanitizedPath)
      : await RNFS.readFile(sanitizedPath);
    return { data: fileContents, uri: filePath };
  } catch (error: any) {
    console.error('Read file failed:', { error, filePath: sanitizedPath });
    if (error.code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    }
    return { data: false, uri: false };
  }
};

export const showImagePickerAndReadImage = async (): Promise<{ data: string | false; uri: string | false }> => {
  console.log('Launching image picker...');
  try {
    const response: ImagePickerResponse = await launchImageLibrary({
      mediaType: 'photo',
      maxHeight: 800,
      maxWidth: 600,
      selectionLimit: 1,
    });

    console.log('Image picker response:', { 
      didCancel: response.didCancel, 
      errorCode: response.errorCode, 
      hasAssets: !!response.assets?.length,
      type: response.assets?.[0]?.type,
      uri: response.assets?.[0]?.uri
    });

    if (response.didCancel) {
      console.log('Image picker cancelled by user');
      return { data: false, uri: false };
    } else if (response.errorCode) {
      console.error('Image picker error:', response.errorMessage);
      throw new Error(response.errorMessage);
    } else if (response.assets?.[0]?.uri) {
      try {
        const uri = response.assets[0].uri;
        console.log('Processing image:', { uri, type: response.assets[0].type });
        const decodedUri = decodeURI(uri.toString());
        console.log('Attempting QR detection:', { decodedUri });
        const result = await RNQRGenerator.detect({ uri: decodedUri });
        console.log('QR detection result:', { hasValues: !!result?.values?.length });
        if (result?.values?.[0]) {
          return { data: result.values[0], uri };
        }
        console.warn('No QR code found in image');
        throw new Error(loc.send.qr_error_no_qrcode);
      } catch (error) {
        console.error('QR detection failed:', error);
        throw error;
      }
    }
    console.warn('No image selected');
    return { data: false, uri: false };
  } catch (error: any) {
    console.error('Image picker/QR detection error:', error);
    throw error;
  }
};
