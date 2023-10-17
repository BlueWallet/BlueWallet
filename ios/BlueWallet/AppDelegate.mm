#import <Bugsnag/Bugsnag.h>
#import "AppDelegate.h"

#import <React/RCTLinkingManager.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTI18nUtil.h>
#import <React/RCTBundleURLProvider.h>
#import "RNQuickActionManager.h"
#import <UserNotifications/UserNotifications.h>
#import <RNCPushNotificationIOS.h>
#import "EventEmitter.h"
#import <React/RCTRootView.h>
#import <WatchConnectivity/WatchConnectivity.h>

@interface AppDelegate() <UNUserNotificationCenterDelegate>

@end

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  [Bugsnag start];
  [self copyDeviceUID];
  [[NSUserDefaults standardUserDefaults] addObserver:self
                                           forKeyPath:@"deviceUID"
                                              options:NSKeyValueObservingOptionNew
                                              context:NULL];
  [[NSUserDefaults standardUserDefaults] addObserver:self
                                           forKeyPath:@"deviceUIDCopy"
                                              options:NSKeyValueObservingOptionNew
                                              context:NULL];
  self.moduleName = @"BlueWallet";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  [[RCTI18nUtil sharedInstance] allowRTL:YES];

  UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
  center.delegate = self;
  
  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

/// This method controls whether the `concurrentRoot`feature of React18 is turned on or off.
///
/// @see: https://reactjs.org/blog/2022/03/29/react-v18.html
/// @note: This requires to be rendering on Fabric (i.e. on the New Architecture).
/// @return: `true` if the `concurrentRoot` feature is enabled. Otherwise, it returns `false`.
- (BOOL)concurrentRootEnabled
{
  return true;
}


- (void)observeValueForKeyPath:(NSString *) keyPath ofObject:(id) object change:(NSDictionary *) change context:(void *) context
{
    if([keyPath isEqual:@"deviceUID"] || [keyPath isEqual:@"deviceUIDCopy"])
    {
      [self copyDeviceUID];
    }
}

- (void)copyDeviceUID {
  NSString *deviceUID = [[NSUserDefaults standardUserDefaults] stringForKey:@"deviceUID"];
  if (deviceUID && deviceUID.length > 0) {
    [NSUserDefaults.standardUserDefaults setValue:deviceUID forKey:@"deviceUIDCopy"];
  }
}

- (BOOL)application:(UIApplication *)application continueUserActivity:(nonnull NSUserActivity *)userActivity
 restorationHandler:(nonnull void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler
{
  NSUserDefaults *defaults = [[NSUserDefaults alloc] initWithSuiteName:@"group.io.bluewallet.bluewallet"];
  [defaults setValue:@{@"activityType": userActivity.activityType, @"userInfo": userActivity.userInfo} forKey:@"onUserActivityOpen"];
  if (userActivity.activityType == NSUserActivityTypeBrowsingWeb) {
    return [RCTLinkingManager application:application
                     continueUserActivity:userActivity
                       restorationHandler:restorationHandler];
  }
  else {
    [EventEmitter.sharedInstance sendUserActivity:@{@"activityType": userActivity.activityType, @"userInfo": userActivity.userInfo}];
    return YES;
  }
}

- (BOOL)application:(UIApplication *)app openURL:(NSURL *)url options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {
  return [RCTLinkingManager application:app openURL:url options:options];
}

- (BOOL)application:(UIApplication *)application shouldAllowExtensionPointIdentifier:(UIApplicationExtensionPointIdentifier)extensionPointIdentifier {
  return NO;
}

- (void)applicationWillTerminate:(UIApplication *)application {
  if ([[WCSession defaultSession] isReachable]) {
    [WCSession.defaultSession updateApplicationContext:@{@"isWalletsInitialized": @NO} error:nil];
  }
  NSUserDefaults *defaults = [[NSUserDefaults alloc] initWithSuiteName:@"group.io.bluewallet.bluewallet"];
  [defaults removeObjectForKey:@"onUserActivityOpen"];
}

- (void)application:(UIApplication *)application performActionForShortcutItem:(UIApplicationShortcutItem *)shortcutItem completionHandler:(void (^)(BOOL succeeded)) completionHandler {
  [RNQuickActionManager onQuickActionPress:shortcutItem completionHandler:completionHandler];
}

//Called when a notification is delivered to a foreground app.
-(void)userNotificationCenter:(UNUserNotificationCenter *)center willPresentNotification:(UNNotification *)notification withCompletionHandler:(void (^)(UNNotificationPresentationOptions options))completionHandler
{
  NSDictionary *userInfo = notification.request.content.userInfo;
  [EventEmitter.sharedInstance sendNotification:userInfo];
  completionHandler(UNNotificationPresentationOptionSound | UNNotificationPresentationOptionAlert | UNNotificationPresentationOptionBadge);
}

- (void)openSettings {
  [EventEmitter.sharedInstance openSettings];
}

- (void)buildMenuWithBuilder:(id<UIMenuBuilder>)builder {
  [super buildMenuWithBuilder:builder];
  [builder removeMenuForIdentifier:UIMenuServices];
  [builder removeMenuForIdentifier:UIMenuFormat];
  [builder removeMenuForIdentifier:UIMenuToolbar];
  [builder removeMenuForIdentifier:UIMenuFile];

  UIKeyCommand *settingsCommand = [UIKeyCommand keyCommandWithInput:@"," modifierFlags:UIKeyModifierCommand action:@selector(openSettings)];
  [settingsCommand setTitle:@"Settings..."];
  UIMenu *settings = [UIMenu menuWithTitle:@"Settings..." image:nil identifier:@"openSettings" options:UIMenuOptionsDisplayInline children:@[settingsCommand]];
  
  [builder insertSiblingMenu:settings afterMenuForIdentifier:UIMenuAbout];
}


-(void)showHelp:(id)sender {
  [[UIApplication sharedApplication] openURL:[NSURL URLWithString:@"https://bluewallet.io/docs"] options:@{} completionHandler:nil];
}

- (BOOL)canPerformAction:(SEL)action withSender:(id)sender {
  if (action == @selector(showHelp:)) {
    return true;
  } else {
    return [super canPerformAction:action withSender:sender];
  }
}

// Required for the register event.
- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken
{
 [RNCPushNotificationIOS didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];
}
// Required for the notification event. You must call the completion handler after handling the remote notification.
- (void)application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)userInfo
fetchCompletionHandler:(void (^)(UIBackgroundFetchResult))completionHandler
{
  [RNCPushNotificationIOS didReceiveRemoteNotification:userInfo fetchCompletionHandler:completionHandler];
}
// Required for the registrationError event.
- (void)application:(UIApplication *)application didFailToRegisterForRemoteNotificationsWithError:(NSError *)error
{
 [RNCPushNotificationIOS didFailToRegisterForRemoteNotificationsWithError:error];
}
// Required for localNotification event
- (void)userNotificationCenter:(UNUserNotificationCenter *)center
didReceiveNotificationResponse:(UNNotificationResponse *)response
         withCompletionHandler:(void (^)(void))completionHandler
{
  [RNCPushNotificationIOS didReceiveNotificationResponse:response];
}

@end
