const mockPrompt = jest.fn();

jest.mock('react-native-prompt-android', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockPrompt(...args),
}));

jest.mock('../../loc', () => ({
  __esModule: true,
  default: {
    _: {
      cancel: 'Cancel',
      ok: 'OK',
    },
  },
}));

describe('helpers/prompt', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockPrompt.mockClear();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const loadHelper = (os: 'ios' | 'android') => {
    jest.resetModules();
    jest.doMock('react-native-prompt-android', () => ({
      __esModule: true,
      default: (...args: unknown[]) => mockPrompt(...args),
    }));
    jest.doMock('../../loc', () => ({
      __esModule: true,
      default: { _: { cancel: 'Cancel', ok: 'OK' } },
    }));

    const { Platform } = require('react-native');
    Object.defineProperty(Platform, 'OS', { configurable: true, value: os });

    return require('../../helpers/prompt').default as typeof import('../../helpers/prompt').default;
  };

  it('defers showing the dialog on Android until the next tick', async () => {
    const promptHelper = loadHelper('android');

    const pending = promptHelper('Title', 'Message');
    expect(mockPrompt).not.toHaveBeenCalled();

    jest.runAllTimers();
    expect(mockPrompt).toHaveBeenCalledTimes(1);

    const buttons = mockPrompt.mock.calls[0][2] as Array<{ text: string; onPress?: (v?: string) => void }>;
    buttons.find(b => b.text === 'OK')?.onPress?.('secret');
    await expect(pending).resolves.toBe('secret');
  });

  it('shows the dialog immediately on iOS', async () => {
    const promptHelper = loadHelper('ios');

    const pending = promptHelper('Title', 'Message');
    expect(mockPrompt).toHaveBeenCalledTimes(1);

    const buttons = mockPrompt.mock.calls[0][2] as Array<{ text: string; onPress?: (v?: string) => void }>;
    buttons.find(b => b.text === 'OK')?.onPress?.('secret');
    await expect(pending).resolves.toBe('secret');
  });
});
