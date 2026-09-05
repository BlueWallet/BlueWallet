import { keepLocalCopy, pick } from '@react-native-documents/picker';
import { Platform } from 'react-native';
import { pickTransaction } from '../../blue_modules/fs';

const psbtPickerTypes =
  Platform.OS === 'ios' ? ['io.bluewallet.psbt'] : ['application/octet-stream', 'text/plain', 'application/vnd.bitcoin.psbt'];
const transactionPickerTypes =
  Platform.OS === 'ios' ? [...psbtPickerTypes, 'io.bluewallet.psbt.txn'] : [...psbtPickerTypes, 'application/vnd.bitcoin.txn'];

describe('transaction file import', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
  ])('opens a $format file without making a local copy', async ({ fileName, providerType }) => {
    const uri = `content://documents/${fileName}`;
    (pick as jest.Mock).mockImplementationOnce(async ({ type }: { type: string[] }) => [
      {
        uri,
        name: fileName,
        hasRequestedType: type.includes(providerType),
      },
    ]);

    await expect(pickTransaction()).resolves.toEqual({ uri, name: fileName });

    expect(pick).toHaveBeenCalledWith({ mode: 'open', type: transactionPickerTypes });
    expect(keepLocalCopy).not.toHaveBeenCalled();
  });

  it('rejects a file when an Android provider ignores the requested types', async () => {
    (pick as jest.Mock).mockResolvedValueOnce([
      {
        uri: 'content://documents/video.mp4',
        name: 'video.mp4',
        hasRequestedType: false,
      },
    ]);

    await expect(pickTransaction()).rejects.toThrow();

    expect(keepLocalCopy).not.toHaveBeenCalled();
  });
});
