jest.mock('react-native-watch-connectivity', () => {
  return {
    getIsWatchAppInstalled: jest.fn(),
    subscribeToMessages: jest.fn(),
    updateApplicationContext: jest.fn(),
  }
})
