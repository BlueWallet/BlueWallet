import { keepLocalCopy, pick } from '@react-native-documents/picker';
import { pickTransaction } from '../../blue_modules/fs';

describe('transaction file import', () => {
  it.each([
    { format: 'PSBT', fileName: 'signed.psbt', providerType: 'application/vnd.bitcoin.psbt' },
    { format: 'TXN', fileName: 'signed.txn', providerType: 'application/vnd.bitcoin.txn' },
  ])('accepts a $format file when its document provider reports a custom MIME type', async ({ fileName, providerType }) => {
    const providerUri = `content://documents/${fileName}`;
    const localUri = `file:///mock/Caches/${fileName}`;

    (pick as jest.Mock).mockImplementationOnce(async ({ type }: { type: string[] }) => [
      {
        uri: providerUri,
        name: fileName,
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

    expect(pick).toHaveBeenLastCalledWith({ type: ['*/*'] });
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
});
