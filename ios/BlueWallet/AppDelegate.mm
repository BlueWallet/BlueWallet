#import <Bugsnag/Bugsnag.h>
#import "AppDelegate.h"

#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>
#import <React/RCTLinkingManager.h>
#import <React/RCTI18nUtil.h>
#import <React/RCTAppSetupUtils.h>
#import <WatchConnectivity/WatchConnectivity.h>
#import "RNQuickActionManager.h"
#import <UserNotifications/UserNotifications.h>
#import <RNCPushNotificationIOS.h>
#import "EventEmitter.h"

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application 
didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
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
  
  RCTAppSetupPrepareApp(application);

  RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:launchOptions];

#if RCT_NEW_ARCH_ENABLED
  _contextContainer = std::make_shared<facebook::react::ContextContainer 
const>();
  _reactNativeConfig = 
std::make_shared<facebook::react::EmptyReactNativeConfig const>();
  _contextContainer->insert("ReactNativeConfig", _reactNativeConfig);
  _bridgeAdapter = [[RCTSurfacePresenterBridgeAdapter alloc] 
initWithBridge:bridge contextContainer:_contextContainer];
  bridge.surfacePresenter = _bridgeAdapter.surfacePresenter;
#endif

  UIView *rootView = RCTAppSetupDefaultRootView(bridge, @"BlueWallet", 
nil);

  if (@available(iOS 13.0, *)) {
    rootView.backgroundColor = [UIColor systemBackgroundColor];
  } else {
    rootView.backgroundColor = [UIColor clearColor];
  }
  [[RCTI18nUtil sharedInstance] allowRTL:YES];

  self.window = [[UIWindow alloc] initWithFrame:[UIScreen 
mainScreen].bounds];
  UIViewController *rootViewController = [UIViewController new];
  rootViewController.view = rootView;
  self.window.rootViewController = rootViewController;
  [self.window makeKeyAndVisible];
  // Define UNUserNotificationCenter
    UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
    center.delegate = self;
  /* For debugging purposes since iOS Simulator does not support handoff
   NSUserDefaults *defaults = [[NSUserDefaults alloc] initWithSuiteName:@"group.io.bluewallet.bluewallet"];
   [defaults setValue:@{@"activityType": @"io.bluewallet.bluewallet.receiveonchain", @"userInfo": @{@"address": @""}} forKey:@"onUserActivityOpen"];
   */
  return YES;
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

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] 
jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" 
withExtension:@"jsbundle"];
#endif
}

#if RCT_NEW_ARCH_ENABLED

#pragma mark - RCTCxxBridgeDelegate

- 
(std::unique_ptr<facebook::react::JSExecutorFactory>)jsExecutorFactoryForBridge:(RCTBridge 
*)bridge
{
  _turboModuleManager = [[RCTTurboModuleManager alloc] 
initWithBridge:bridge
                                                             delegate:self
                                                            
jsInvoker:bridge.jsCallInvoker];
  return RCTAppSetupDefaultJsExecutorFactory(bridge, _turboModuleManager);
}

#pragma mark RCTTurboModuleManagerDelegate

- (Class)getModuleClassFromName:(const char *)name
{
  return RCTCoreModulesClassProvider(name);
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const 
std::string &)name
                                                      
jsInvoker:(std::shared_ptr<facebook::react::CallInvoker>)jsInvoker
{
  return nullptr;
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const 
std::string &)name
                                                     initParams:
                                                         (const 
facebook::react::ObjCTurboModule::InitParams &)params
{
  return nullptr;
}

- (id<RCTTurboModule>)getModuleInstanceFromClass:(Class)moduleClass
{
  return RCTAppSetupDefaultModuleFromClass(moduleClass);
}

#endif

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
  [WCSession.defaultSession updateApplicationContext:@{@"isWalletsInitialized": @NO} error:nil];
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

// Required to register for notifications
- (void)application:(UIApplication *)application didRegisterUserNotificationSettings:(UIUserNotificationSettings *)notificationSettings
{
 [RNCPushNotificationIOS didRegisterUserNotificationSettings:notificationSettings];
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

// IOS 10+ Required for localNotification event
- (void)userNotificationCenter:(UNUserNotificationCenter *)center
didReceiveNotificationResponse:(UNNotificationResponse *)response
         withCompletionHandler:(void (^)(void))completionHandler
{
  [RNCPushNotificationIOS didReceiveNotificationResponse:response];
  completionHandler();
}

// IOS 4-10 Required for the localNotification event.
- (void)application:(UIApplication *)application didReceiveLocalNotification:(UILocalNotification *)notification
{
 [RNCPushNotificationIOS didReceiveLocalNotification:notification];
}

- (void)openPreferences {
  [EventEmitter.sharedInstance openSettings];
}

- (void)buildMenuWithBuilder:(id<UIMenuBuilder>)builder {
  [super buildMenuWithBuilder:builder];
  [builder removeMenuForIdentifier:UIMenuServices];
  [builder removeMenuForIdentifier:UIMenuFormat];
  [builder removeMenuForIdentifier:UIMenuToolbar];
  [builder removeMenuForIdentifier:UIMenuFile];

  UIKeyCommand *preferencesCommand = [UIKeyCommand keyCommandWithInput:@"," modifierFlags:UIKeyModifierCommand action:@selector(openPreferences)];
  [preferencesCommand setTitle:@"Preferences..."];
  UIMenu *preferences = [UIMenu menuWithTitle:@"Preferences..." image:nil identifier:@"openPreferences" options:UIMenuOptionsDisplayInline children:@[preferencesCommand]];
  
  [builder insertSiblingMenu:preferences afterMenuForIdentifier:UIMenuAbout];
}


-(void)showHelp:(id)sender {
  [[UIApplication sharedApplication] openURL:[NSURL URLWithString:@"http://help.bluewallet.io"] options:@{} completionHandler:nil];
}

- (BOOL)canPerformAction:(SEL)action withSender:(id)sender {
  if (action == @selector(showHelp:)) {
    return true;
  } else {
    return [super canPerformAction:action withSender:sender];
  }
}

@end
