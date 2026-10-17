const mockIgnoreAllLogs = jest.fn();
const mockClearAllLogs = jest.fn();
const mockUninstall = jest.fn();

jest.mock('react-native', () => ({
  LogBox: {
    ignoreAllLogs: mockIgnoreAllLogs,
    clearAllLogs: mockClearAllLogs,
    uninstall: mockUninstall,
  },
}));

const { configureLogBoxForDetox } = require('../../blue_modules/disableLogBoxForDetox');

describe('configureLogBoxForDetox', () => {
  it('leaves LogBox unchanged outside Detox', () => {
    configureLogBoxForDetox(false);

    expect(mockIgnoreAllLogs).not.toHaveBeenCalled();
    expect(mockClearAllLogs).not.toHaveBeenCalled();
    expect(mockUninstall).not.toHaveBeenCalled();
  });

  it('fully disables LogBox once during Detox', () => {
    configureLogBoxForDetox(true);
    configureLogBoxForDetox(true);

    expect(mockIgnoreAllLogs).toHaveBeenCalledTimes(1);
    expect(mockIgnoreAllLogs).toHaveBeenCalledWith(true);
    expect(mockClearAllLogs).toHaveBeenCalledTimes(1);
    expect(mockUninstall).toHaveBeenCalledTimes(1);
  });
});
