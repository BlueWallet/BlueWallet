## Notification Payload Issue Fix Summary

### Problem Identified
The notification payload wasn't being received by React Native because:

1. **Callback Storage Issue**: The `onProcessNotifications` callback was only captured during initial configuration but not stored for later use when notifications are received.

2. **Configuration State Problem**: If notifications were already configured (`alreadyConfigured = true`), the new callback wouldn't be stored, leaving the notification handler without a valid callback.

3. **Missing Initial Notification Handling**: iOS notifications that open the app from a closed state weren't being properly handled.

### Fix Implemented

#### 1. **Stored Callback Mechanism**
- Added `storedOnProcessNotifications` module-level variable to persist the callback
- Modified `configureNotifications()` to always store the latest callback
- Updated notification handler to use either the current callback or stored callback

#### 2. **Enhanced Notification Debugging**
- Added comprehensive logging for raw notification data
- Added payload processing debugging
- Added callback execution logging with context

#### 3. **iOS Initial Notification Support**
- Added `checkInitialNotification()` function for iOS-specific handling
- Properly converts iOS notification format to our payload format
- Automatically calls this during initialization when tokens exist

#### 4. **Improved Configuration**
- Added `requestPermissions: Platform.OS === 'ios'` for proper iOS setup
- Enhanced notification handler to process both foreground and userInteraction events
- Better error handling and logging throughout

### Code Changes Made

**blue_modules/notifications.ts:**
```typescript
// Added module-level storage
let storedOnProcessNotifications: (() => void) | undefined;

// Enhanced configureNotifications
export const configureNotifications = async (onProcessNotifications?: () => void) => {
  // Always store the latest callback
  if (onProcessNotifications) {
    storedOnProcessNotifications = onProcessNotifications;
  }
  // ... rest of function
};

// Enhanced notification handler
const handleNotification = async (notification: Omit<ReceivedNotification, 'userInfo'>) => {
  // Added comprehensive debugging
  console.debug('🔔 Raw notification received:', {
    foreground: notification.foreground,
    userInteraction: notification.userInteraction,
    data: notification.data,
    message: notification.message,
  });

  // ... payload processing ...

  // Use stored or current callback
  if ((payload.foreground || payload.userInteraction) && (onProcessNotifications || storedOnProcessNotifications)) {
    const callbackToUse = onProcessNotifications || storedOnProcessNotifications;
    if (callbackToUse) {
      console.debug('🔔 Calling notification processing callback:', {
        foreground: payload.foreground,
        userInteraction: payload.userInteraction,
        hasCallback: !!callbackToUse,
      });
      await callbackToUse();
    }
  }
};

// Added iOS initial notification check
export const checkInitialNotification = async () => {
  if (Platform.OS === 'ios') {
    try {
      const initialNotification = await PushNotificationIOS.getInitialNotification();
      if (initialNotification && storedOnProcessNotifications) {
        // Convert and process initial notification
        const notificationData = initialNotification.getData();
        const alert = initialNotification.getAlert();
        // ... process notification ...
        await storedOnProcessNotifications();
      }
    } catch (error) {
      console.error('Error checking initial notification:', error);
    }
  }
};
```

### Testing Enhancements

**test-qr-debug.js:**
- Added more notification URL test cases
- Added notification URLs with addresses and transaction IDs
- Better test coverage for notification deep links

### Expected Results

With these fixes:

1. **Notification Tap Navigation**: Tapping notifications should now properly trigger navigation
2. **Persistent Callbacks**: The notification processor callback persists across app lifecycle
3. **iOS App Launch**: Notifications that open the app from closed state are handled
4. **Better Debugging**: Comprehensive logging helps diagnose notification issues
5. **Foreground & Background**: Both foreground and tap notifications are processed

### Verification Steps

1. Send a test notification to the device
2. Check console logs for notification debugging output
3. Verify that tapping notifications triggers navigation
4. Test both foreground and background notification scenarios
5. Test iOS app launch from notification

The notification payload issue should now be resolved with proper callback persistence and enhanced iOS support.
