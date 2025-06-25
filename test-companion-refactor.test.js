import { processAllNotifications } from '../navigation/LinkingConfig';

// Simple test to ensure our refactored function can be imported and called
describe('useCompanionListeners notification refactor', () => {
  test('processAllNotifications is available from LinkingConfig', () => {
    expect(typeof processAllNotifications).toBe('function');
  });

  test('processAllNotifications handles empty wallet array', async () => {
    const mockNavigate = jest.fn();
    const mockRefresh = jest.fn();

    // Mock the notification functions
    jest.mock('../blue_modules/notifications', () => ({
      getStoredNotifications: jest.fn().mockResolvedValue([]),
      clearStoredNotifications: jest.fn().mockResolvedValue(undefined),
      getDeliveredNotifications: jest.fn().mockResolvedValue([]),
      setApplicationIconBadgeNumber: jest.fn(),
      removeAllDeliveredNotifications: jest.fn(),
    }));

    const result = await processAllNotifications([], mockNavigate, mockRefresh);
    expect(typeof result).toBe('boolean');
  });
});
