import { keepLocalCopy, pick } from '@react-native-documents/picker';
import { pickTransaction } from '../../blue_modules/fs';

const providerPsbtMimeType = 'application/vnd.bitcoin.psbt';

describe('PSBT file import', () => {
  beforeEach(() => {
    (pick as jest.Mock).mockImplementation(async ({ type }: { type: string[] }) => [
      {
        uri: 'content://documents/signed.psbt',
        name: 'signed.psbt',
        hasRequestedType: type.includes('*/*') || type.includes(providerPsbtMimeType),
      },
    ]);
    (keepLocalCopy as jest.Mock).mockResolvedValue([
      {
        status: 'success',
        localUri: 'file:///mock/Caches/signed.psbt',
      },
    ]);
  });

  it('accepts a PSBT when its document provider reports a custom MIME type', async () => {
    await expect(pickTransaction()).resolves.toEqual({
      uri: 'file:///mock/Caches/signed.psbt',
      name: 'signed.psbt',
    });

    expect(pick).toHaveBeenCalledWith({ type: ['*/*'] });
    expect(keepLocalCopy).toHaveBeenCalledWith({
      files: [
        {
          uri: 'content://documents/signed.psbt',
          fileName: 'signed.psbt',
        },
      ],
      destination: 'cachesDirectory',
    });
  });
});
