import loc from '../../loc';
import { askNewPassphrase } from '../../helpers/askNewPassphrase';

const mockPrompt = jest.fn();
jest.mock('../../helpers/prompt', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockPrompt(...args),
}));

const TITLE = loc.wallets.add_passphrase_title;
const MESSAGE = loc.wallets.add_passphrase_message;
const CONFIRM = loc.wallets.add_passphrase_confirm_message;
const PLAIN = { type: 'plain-text' };

describe('askNewPassphrase', () => {
  beforeEach(() => {
    mockPrompt.mockReset();
  });

  it('returns the passphrase when both entries match on the first try', async () => {
    mockPrompt.mockResolvedValueOnce('correct horse').mockResolvedValueOnce('correct horse');

    await expect(askNewPassphrase()).resolves.toBe('correct horse');

    expect(mockPrompt).toHaveBeenCalledTimes(2);
    expect(mockPrompt).toHaveBeenNthCalledWith(1, TITLE, MESSAGE, { type: 'plain-text' });
    expect(mockPrompt).toHaveBeenNthCalledWith(2, TITLE, CONFIRM, { type: 'plain-text' });
  });

  it('re-prompts with the empty note when the first entry is empty, then accepts a valid pair', async () => {
    mockPrompt.mockResolvedValueOnce('').mockResolvedValueOnce('').mockResolvedValueOnce('secret').mockResolvedValueOnce('secret');

    await expect(askNewPassphrase()).resolves.toBe('secret');

    expect(mockPrompt).toHaveBeenCalledTimes(4);
    expect(mockPrompt).toHaveBeenNthCalledWith(3, TITLE, `${loc.wallets.add_passphrase_empty}\n\n${MESSAGE}`, PLAIN);
    expect(mockPrompt).toHaveBeenNthCalledWith(4, TITLE, CONFIRM, PLAIN);
  });

  it('treats a whitespace-only first entry as empty', async () => {
    mockPrompt.mockResolvedValueOnce('   ').mockResolvedValueOnce('   ').mockResolvedValueOnce('secret').mockResolvedValueOnce('secret');

    await expect(askNewPassphrase()).resolves.toBe('secret');

    expect(mockPrompt).toHaveBeenNthCalledWith(3, TITLE, `${loc.wallets.add_passphrase_empty}\n\n${MESSAGE}`, PLAIN);
  });

  it('returns the passphrase untrimmed, exactly as typed', async () => {
    mockPrompt.mockResolvedValueOnce(' spaced ').mockResolvedValueOnce(' spaced ');

    await expect(askNewPassphrase()).resolves.toBe(' spaced ');
  });

  it('re-prompts with the mismatch note when the confirmation differs, then accepts a matching pair', async () => {
    mockPrompt
      .mockResolvedValueOnce('first try')
      .mockResolvedValueOnce('typo')
      .mockResolvedValueOnce('second try')
      .mockResolvedValueOnce('second try');

    await expect(askNewPassphrase()).resolves.toBe('second try');

    expect(mockPrompt).toHaveBeenCalledTimes(4);
    expect(mockPrompt).toHaveBeenNthCalledWith(3, TITLE, `${loc.wallets.add_passphrase_mismatch}\n\n${MESSAGE}`, PLAIN);
    expect(mockPrompt).toHaveBeenNthCalledWith(4, TITLE, CONFIRM, PLAIN);
  });

  it('resolves undefined and skips the confirmation prompt when the first prompt is cancelled', async () => {
    mockPrompt.mockRejectedValueOnce(new Error('Cancel Pressed'));

    await expect(askNewPassphrase()).resolves.toBeUndefined();

    expect(mockPrompt).toHaveBeenCalledTimes(1);
    expect(mockPrompt).toHaveBeenCalledWith(TITLE, MESSAGE, PLAIN);
  });

  it('resolves undefined when the confirmation prompt is cancelled', async () => {
    mockPrompt.mockResolvedValueOnce('secret').mockRejectedValueOnce(new Error('Cancel Pressed'));

    await expect(askNewPassphrase()).resolves.toBeUndefined();

    expect(mockPrompt).toHaveBeenCalledTimes(2);
    expect(mockPrompt).toHaveBeenNthCalledWith(2, TITLE, CONFIRM, PLAIN);
  });
});
