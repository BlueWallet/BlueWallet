import assert from 'assert';
import { Platform } from 'react-native';
import Share from 'react-native-share';
import { saveDocuments } from '@react-native-documents/picker';

import { writeFileAndExport } from '../../blue_modules/fs.ts';

describe('writeFileAndExport', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    (saveDocuments as jest.Mock).mockImplementation(async ({ sourceUris }: { sourceUris: string[] }) => {
      const sourceUri = sourceUris?.[0] ?? 'file:///mock/unknown';
      return [{ uri: sourceUri, name: 'mock', error: null }];
    });
    (Share.open as jest.Mock).mockReset();
  });

  afterEach(() => {
    Platform.OS = originalOS;
  });

  it('save dialog: true on success, false on cancel', async () => {
    assert.strictEqual(await writeFileAndExport('exit.json', '{}', false), true);

    (saveDocuments as jest.Mock).mockRejectedValueOnce({ code: 'OPERATION_CANCELED' });
    assert.strictEqual(await writeFileAndExport('exit.json', '{}', false), false);
  });

  it('share sheet: iOS dismissedAction is cancel; Android dismissedAction is not', async () => {
    Platform.OS = 'ios';
    (Share.open as jest.Mock).mockResolvedValueOnce({ dismissedAction: true });
    assert.strictEqual(await writeFileAndExport('exit.json', '{}', true), false);

    Platform.OS = 'android';
    (Share.open as jest.Mock).mockResolvedValueOnce({ dismissedAction: true });
    assert.strictEqual(await writeFileAndExport('exit.json', '{}', true), true);
  });
});
