const start = jest.fn();
const getLegacy = jest.fn();
const removeLegacy = jest.fn();
const setName = jest.fn();
const getPreference = jest.fn();
const setPreference = jest.fn();

jest.mock('@bugsnag/react-native', () => ({ __esModule: true, default: { start: () => start() } }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: (...args: unknown[]) => getLegacy(...args), removeItem: (...args: unknown[]) => removeLegacy(...args) },
}));
jest.mock('react-native-default-preference', () => ({
  __esModule: true,
  default: {
    setName: (...args: unknown[]) => setName(...args),
    get: (...args: unknown[]) => getPreference(...args),
    set: (...args: unknown[]) => setPreference(...args),
  },
}));

describe('Bugsnag startup', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    getLegacy.mockResolvedValue(null);
    getPreference.mockResolvedValue(null);
  });

  it('starts when tracking is allowed', async () => {
    expect(await require('../../bugsnag').default).toBe(true);
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('does not start when the current preference disables tracking', async () => {
    getPreference.mockResolvedValue('1');
    expect(await require('../../bugsnag').default).toBe(false);
    expect(start).not.toHaveBeenCalled();
  });

  it('migrates a legacy opt-out before deciding whether to start', async () => {
    getLegacy.mockResolvedValue('1');
    getPreference.mockResolvedValue('1');
    expect(await require('../../bugsnag').default).toBe(false);
    expect(setPreference).toHaveBeenCalledWith('donottrack', '1');
    expect(removeLegacy).toHaveBeenCalledWith('donottrack');
    expect(start).not.toHaveBeenCalled();
  });
});
