const leaveBreadcrumb = jest.fn();
let resolvePreference: (value: boolean) => void;

jest.mock('@bugsnag/react-native', () => ({
  __esModule: true,
  default: {
    leaveBreadcrumb: (...args: unknown[]) => leaveBreadcrumb(...args),
    setUser: jest.fn(),
    addOnError: jest.fn(),
  },
}));
jest.mock('react-native-device-info', () => ({ getUniqueId: jest.fn().mockResolvedValue('id') }));
jest.unmock('../../blue_modules/analytics');

const flushPromises = () => new Promise(resolve => setImmediate(resolve));

describe('navigation breadcrumbs', () => {
  beforeEach(() => {
    jest.resetModules();
    leaveBreadcrumb.mockClear();
    jest.doMock('../../bugsnag', () => ({
      __esModule: true,
      default: new Promise<boolean>(resolve => (resolvePreference = resolve)),
    }));
  });

  it('waits for the tracking preference and records only the screen name', async () => {
    const analytics = require('../../blue_modules/analytics').default;
    analytics.leaveNavigationBreadcrumb('WalletsList');
    expect(leaveBreadcrumb).not.toHaveBeenCalled();
    resolvePreference(true);
    await flushPromises();
    expect(leaveBreadcrumb).toHaveBeenCalledWith('WalletsList', undefined, 'navigation');
  });

  it('does not record breadcrumbs when tracking is disabled', async () => {
    const analytics = require('../../blue_modules/analytics').default;
    analytics.leaveNavigationBreadcrumb('WalletsList');
    resolvePreference(false);
    await flushPromises();
    expect(leaveBreadcrumb).not.toHaveBeenCalled();
  });

  it('does not record queued breadcrumbs after opting out', async () => {
    const analytics = require('../../blue_modules/analytics').default;
    analytics.leaveNavigationBreadcrumb('WalletsList');
    analytics.setOptOut(true);
    resolvePreference(true);
    await flushPromises();
    expect(leaveBreadcrumb).not.toHaveBeenCalled();
  });
});
