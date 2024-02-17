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

@interface AppDelegate() <UNUserNotificationCenterDelegate>

@property (nonatomic, strong) UIView *launchScreenView;

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
  [self addSplashScreenView];

  self.moduleName = @"BlueWallet";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  [[RCTI18nUtil sharedInstance] allowRTL:YES];

  UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
  center.delegate = self;
  
  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

- (void)addSplashScreenView
{
  // Get the rootView
  RCTRootView *rootView = (RCTRootView *)self.window.rootViewController.view;

  // Capture the launch screen view
  UIStoryboard *launchScreenStoryboard = [UIStoryboard storyboardWithName:@"LaunchScreen" bundle:nil];
  UIViewController *launchScreenVC = [launchScreenStoryboard instantiateInitialViewController];
  UIView *launchScreenView = launchScreenVC.view;
  launchScreenView.frame = self.window.bounds;
  [self.window addSubview:launchScreenView];

  // Keep a reference to the launch screen view to remove it later
  rootView.loadingView = launchScreenView;
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
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

- (void)buildMenuWithBuilder:(id<UIMenuBuilder>)builder {
  [super buildMenuWithBuilder:builder];
  [builder removeMenuForIdentifier:UIMenuServices];
  [builder removeMenuForIdentifier:UIMenuFormat];
  [builder removeMenuForIdentifier:UIMenuToolbar];
  
  // File -> Add Wallet (Command + A)
  UIKeyCommand *addWalletCommand = [UIKeyCommand keyCommandWithInput:@"A" modifierFlags:UIKeyModifierCommand action:@selector(addWalletAction:)];
  [addWalletCommand setTitle:@"Add Wallet"];
  
  // File -> Import Wallet
  UIKeyCommand *importWalletCommand = [UIKeyCommand keyCommandWithInput:@"I" modifierFlags:UIKeyModifierCommand action:@selector(importWalletAction:)];
  [importWalletCommand setTitle:@"Import Wallet"];
  
  // Group Add Wallet and Import Wallet in a displayInline menu
  UIMenu *walletOperationsMenu = [UIMenu menuWithTitle:@"" image:nil identifier:nil options:UIMenuOptionsDisplayInline children:@[addWalletCommand, importWalletCommand]];
  
  // Modify the existing File menu to include Wallet Operations
  UIMenu *fileMenu = [builder menuForIdentifier:UIMenuFile];
  if (fileMenu) {
      // Add "Reload Transactions"
      UIKeyCommand *reloadTransactionsCommand = [UIKeyCommand keyCommandWithInput:@"R" modifierFlags:UIKeyModifierCommand action:@selector(reloadTransactionsAction:)];
      [reloadTransactionsCommand setTitle:@"Reload Transactions"];
      
      // Combine wallet operations and Reload Transactions into the new File menu
      UIMenu *newFileMenu = [UIMenu menuWithTitle:fileMenu.title image:nil identifier:fileMenu.identifier options:fileMenu.options children:@[walletOperationsMenu, reloadTransactionsCommand]];
      [builder replaceMenuForIdentifier:UIMenuFile withMenu:newFileMenu];
  }
  
  // BlueWallet -> Settings (Command + ,)
  UIKeyCommand *settingsCommand = [UIKeyCommand keyCommandWithInput:@"," modifierFlags:UIKeyModifierCommand action:@selector(openSettings:)];
  [settingsCommand setTitle:@"Settings..."];
  UIMenu *settings = [UIMenu menuWithTitle:@"" image:nil identifier:nil options:UIMenuOptionsDisplayInline children:@[settingsCommand]];
  
  [builder insertSiblingMenu:settings afterMenuForIdentifier:UIMenuAbout];
}


- (void)openSettings:(UIKeyCommand *)keyCommand {
  [EventEmitter.sharedInstance openSettings];
}

- (void)addWalletAction:(UIKeyCommand *)keyCommand {
    // Implement the functionality for adding a wallet
      [EventEmitter.sharedInstance addWalletMenuAction];

    NSLog(@"Add Wallet action performed");
}

- (void)importWalletAction:(UIKeyCommand *)keyCommand {
    // Implement the functionality for adding a wallet
      [EventEmitter.sharedInstance importWalletMenuAction];

    NSLog(@"Import Wallet action performed");
}

- (void)reloadTransactionsAction:(UIKeyCommand *)keyCommand {
    // Implement the functionality for adding a wallet
      [EventEmitter.sharedInstance reloadTransactionsMenuAction];

    NSLog(@"Reload Transactions action performed");
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
