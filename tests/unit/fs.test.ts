import { keepLocalCopy, pick } from '@react-native-documents/picker';
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { openSignedTransaction, pickTransaction } from '../../blue_modules/fs';

const maxTransactionFileSizeBytes = 10 * 1024 * 1024;
const psbtPickerTypes =
  Platform.OS === 'ios' ? ['io.bluewallet.psbt'] : ['application/octet-stream', 'text/plain', 'application/vnd.bitcoin.psbt'];
const transactionPickerTypes =
  Platform.OS === 'ios' ? [...psbtPickerTypes, 'io.bluewallet.psbt.txn'] : [...psbtPickerTypes, 'application/vnd.bitcoin.txn'];

describe('transaction file import', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (RNFS.stat as jest.Mock).mockResolvedValue({ size: 1024 });
  });

  it.each([
    {
      format: 'PSBT',
      fileName: 'signed.psbt',
      providerType: Platform.OS === 'ios' ? 'io.bluewallet.psbt' : 'application/vnd.bitcoin.psbt',
    },
    {
      format: 'TXN',
      fileName: 'signed.txn',
      providerType: Platform.OS === 'ios' ? 'io.bluewallet.psbt.txn' : 'application/vnd.bitcoin.txn',
    },
  ])('accepts a $format file when its document provider reports a custom MIME type', async ({ fileName, providerType }) => {
    const providerUri = `content://documents/${fileName}`;
    const localUri = `file:///mock/Caches/${fileName}`;

    (pick as jest.Mock).mockImplementationOnce(async ({ type }: { type: string[] }) => [
      {
        uri: providerUri,
        name: fileName,
        size: 1024,
        hasRequestedType: type.includes('*/*') || type.includes(providerType),
      },
    ]);
    (keepLocalCopy as jest.Mock).mockResolvedValueOnce([
      {
        status: 'success',
        localUri,
      },
    ]);

    await expect(pickTransaction()).resolves.toEqual({
      uri: localUri,
      name: fileName,
    });

    expect(pick).toHaveBeenLastCalledWith({ type: transactionPickerTypes });
    expect(keepLocalCopy).toHaveBeenLastCalledWith({
      files: [
        {
          uri: providerUri,
          fileName,
        },
      ],
      destination: 'cachesDirectory',
    });
  });

  it('rejects unsupported extensions before copying the selected file', async () => {
    (pick as jest.Mock).mockResolvedValueOnce([
      {
        uri: 'content://documents/video.mp4',
        name: 'video.mp4',
        size: 1024,
        hasRequestedType: true,
      },
    ]);

    await expect(pickTransaction()).rejects.toThrow();

    expect(keepLocalCopy).not.toHaveBeenCalled();
  });

  it('rejects an oversized transaction before copying it', async () => {
    (pick as jest.Mock).mockResolvedValueOnce([
      {
        uri: 'content://documents/oversized.psbt',
        name: 'oversized.psbt',
        size: maxTransactionFileSizeBytes + 1,
        hasRequestedType: true,
      },
    ]);

    await expect(pickTransaction()).rejects.toThrow();

    expect(keepLocalCopy).not.toHaveBeenCalled();
  });

  it('checks the cached PSBT size before reading it into memory', async () => {
    (pick as jest.Mock).mockResolvedValueOnce([
      {
        uri: 'content://documents/oversized.psbt',
        name: 'oversized.psbt',
        size: null,
        hasRequestedType: true,
      },
    ]);
    (keepLocalCopy as jest.Mock).mockResolvedValueOnce([
      {
        status: 'success',
        localUri: 'file:///mock/Caches/oversized.psbt',
      },
    ]);
    (RNFS.stat as jest.Mock).mockResolvedValueOnce({
      size: maxTransactionFileSizeBytes + 1,
    });

    await expect(openSignedTransaction()).resolves.toBe(false);

    expect(RNFS.readFile).not.toHaveBeenCalled();
  });
});
