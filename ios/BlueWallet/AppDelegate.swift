import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import UserNotifications
import Bugsnag

@main
class AppDelegate: RCTAppDelegate, UNUserNotificationCenterDelegate {
  private var userDefaultsGroup: UserDefaults!
  
  override func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
    clearFilesIfNeeded()
    userDefaultsGroup = UserDefaults(suiteName: "group.io.bluewallet.bluewallet")
    
    let isDoNotTrackEnabled = userDefaultsGroup.string(forKey: "donottrack")
    if isDoNotTrackEnabled != "1" {
      #if targetEnvironment(macCatalyst)
      let config = BugsnagConfiguration.loadConfig()
      config.appType = "macOS"
      Bugsnag.start(with: config)
      copyDeviceUID()
      #else
      Bugsnag.start()
      copyDeviceUID()
      #endif
    } else {
      UserDefaults.standard.setValue("", forKey: "deviceUIDCopy")
    }
    
    self.moduleName = "BlueWallet"
    self.dependencyProvider = RCTAppDependencyProvider()
    self.initialProps = [:]
    
    RCTI18nUtil.sharedInstance().allowRTL(true)
    
    let center = UNUserNotificationCenter.current()
    center.delegate = self
    
    setupUserDefaultsListener()
    registerNotificationCategories()
    
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
  
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    return bundleURL()
  }
  
  override func bundleURL() -> URL? {
    #if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
    #else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
    #endif
  }
  
  // MARK: - Notification Categories
  
  func registerNotificationCategories() {
    // Define two actions: "View Address in Browser" and "View Transaction in Browser"
    let viewAddressTransactionsAction = UNNotificationAction(
      identifier: "VIEW_ADDRESS_TRANSACTIONS",
      title: NSLocalizedString("VIEW_ADDRESS_TRANSACTIONS_TITLE", comment: ""),
      options: .foreground
    )
    
    let viewTransactionDetailsAction = UNNotificationAction(
      identifier: "VIEW_TRANSACTION_DETAILS",
      title: NSLocalizedString("VIEW_TRANSACTION_DETAILS_TITLE", comment: ""),
      options: .foreground
    )
    
    let transactionCategory = UNNotificationCategory(
      identifier: "TRANSACTION_CATEGORY",
      actions: [viewAddressTransactionsAction, viewTransactionDetailsAction],
      intentIdentifiers: [],
      options: .customDismissAction
    )
    
    UNUserNotificationCenter.current().setNotificationCategories([transactionCategory])
  }
  
  // MARK: - KVO
  
  override func observeValue(forKeyPath keyPath: String?, of object: Any?, change: [NSKeyValueChangeKey : Any]?, context: UnsafeMutableRawPointer?) {
    if keyPath == "deviceUID" || keyPath == "deviceUIDCopy" {
      copyDeviceUID()
    }
    
    let keys = [
      "WidgetCommunicationAllWalletsSatoshiBalance",
      "WidgetCommunicationAllWalletsLatestTransactionTime",
      "WidgetCommunicationDisplayBalanceAllowed",
      "WidgetCommunicationLatestTransactionIsUnconfirmed",
      "preferredCurrency",
      "preferredCurrencyLocale",
      "electrum_host",
      "electrum_tcp_port",
      "electrum_ssl_port"
    ]
    
    if keys.contains(keyPath ?? "") {
      WidgetHelper.reloadAllWidgets()
    }
  }
  
  func copyDeviceUID() {
    UserDefaults.standard.addObserver(self, forKeyPath: "deviceUID", options: .new, context: nil)
    UserDefaults.standard.addObserver(self, forKeyPath: "deviceUIDCopy", options: .new, context: nil)
    
    if let deviceUID = UserDefaults.standard.string(forKey: "deviceUID"), !deviceUID.isEmpty {
      UserDefaults.standard.setValue(deviceUID, forKey: "deviceUIDCopy")
    }
  }
  
  func setupUserDefaultsListener() {
    let keys = [
      "WidgetCommunicationAllWalletsSatoshiBalance",
      "WidgetCommunicationAllWalletsLatestTransactionTime",
      "WidgetCommunicationDisplayBalanceAllowed",
      "WidgetCommunicationLatestTransactionIsUnconfirmed",
      "preferredCurrency",
      "preferredCurrencyLocale",
      "electrum_host",
      "electrum_tcp_port",
      "electrum_ssl_port"
    ]
    
    for key in keys {
      userDefaultsGroup.addObserver(self, forKeyPath: key, options: .new, context: nil)
    }
  }
  
  // MARK: - Handoff and URL Handling
  
  override func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
    // Validate userActivity and its type
    guard let activityType = userActivity.activityType else {
      print("[Handoff] Invalid or missing userActivity")
      return false
    }
    
    let userActivityData: [String: Any] = [
      "activityType": activityType,
      "userInfo": userActivity.userInfo ?? [:]
    ]
    
    // Save activity data to userDefaults for potential later use
    userDefaultsGroup.setValue(userActivityData, forKey: "onUserActivityOpen")
    
    // Check if the activity type matches one of the allowed types
    if activityType == "io.bluewallet.bluewallet.receiveonchain" ||
       activityType == "io.bluewallet.bluewallet.xpub" ||
       activityType == "io.bluewallet.bluewallet.blockexplorer" {
      
      if let eventEmitter = EventEmitter.shared, eventEmitter().responds(to: #selector(EventEmitter.sendUserActivity(_:))) {
        eventEmitter.sendUserActivity(userActivityData)
      } else {
        print("[Handoff] EventEmitter does not implement sendUserActivity:")
      }
      return true
    }
    
    // Forward web browsing activities to LinkingManager
    if activityType == NSUserActivityTypeBrowsingWeb {
      return RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
    
    print("[Handoff] Unhandled user activity type: \(activityType)")
    return false
  }
  
  func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
    return RCTLinkingManager.application(app, open: url, options: options)
  }
  
  override func application(_ application: UIApplication, shouldAllowExtensionPointIdentifier extensionPointIdentifier: UIApplication.ExtensionPointIdentifier) -> Bool {
    return false
  }
  
  override func applicationWillTerminate(_ application: UIApplication) {
    userDefaultsGroup.removeObject(forKey: "onUserActivityOpen")
  }
  
  override func application(_ application: UIApplication, performActionFor shortcutItem: UIApplicationShortcutItem, completionHandler: @escaping (Bool) -> Void) {
    RNQuickActionManager.onQuickActionPress(shortcutItem, completionHandler: completionHandler)
  }
  
  // MARK: - Notifications
  
  func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
    let userInfo = notification.request.content.userInfo
    completionHandler([.sound, .list, .banner, .badge])
  }
  
  func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
    let userInfo = response.notification.request.content.userInfo
    
    var blockExplorer = UserDefaults(suiteName: "group.io.bluewallet.bluewallet")?.string(forKey: "blockExplorer") ?? ""
    if blockExplorer.isEmpty {
      blockExplorer = "https://www.mempool.space"
    }
    
    if let data = userInfo["data"] as? [String: Any] {
      let address = data["address"] as? String
      let txid = data["txid"] as? String
      
      if response.actionIdentifier == "VIEW_ADDRESS_TRANSACTIONS", let address = address {
        let urlString = "\(blockExplorer)/address/\(address)"
        if let url = URL(string: urlString), UIApplication.shared.canOpenURL(url) {
          UIApplication.shared.open(url, options: [:], completionHandler: nil)
        }
      }
      else if response.actionIdentifier == "VIEW_TRANSACTION_DETAILS", let txid = txid {
        let urlString = "\(blockExplorer)/tx/\(txid)"
        if let url = URL(string: urlString), UIApplication.shared.canOpenURL(url) {
          UIApplication.shared.open(url, options: [:], completionHandler: nil)
        }
      }
    }
    
    RNCPushNotificationIOS.didReceive(response)
    completionHandler()
  }
  
  override func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    RNCPushNotificationIOS.didRegisterForRemoteNotifications(withDeviceToken: deviceToken)
  }
  
  override func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
    RNCPushNotificationIOS.didFailToRegisterForRemoteNotifications(withError: error)
  }
  
  // MARK: - Menu Building
  
  override func buildMenu(with builder: UIMenuBuilder) {
    super.buildMenu(with: builder)
    
    // Remove unnecessary menus
    builder.remove(menu: .services)
    builder.remove(menu: .format)
    builder.remove(menu: .toolbar)
    
    // Remove the original Settings menu item
    builder.remove(menu: .preferences)
    
    // File -> Add Wallet (Command + A)
    let addWalletCommand = UIKeyCommand(
      title: "Add Wallet",
      action: #selector(addWalletAction(_:)),
      input: "A",
      modifierFlags: [.command, .shift]
    )
    
    // File -> Import Wallet
    let importWalletCommand = UIKeyCommand(
      title: "Import Wallet",
      action: #selector(importWalletAction(_:)),
      input: "I",
      modifierFlags: .command
    )
    
    // Group Add Wallet and Import Wallet in a displayInline menu
    let walletOperationsMenu = UIMenu(
      title: "",
      image: nil,
      identifier: nil,
      options: .displayInline,
      children: [addWalletCommand, importWalletCommand]
    )
    
    // Modify the existing File menu to include Wallet Operations
    if let fileMenu = builder.menu(for: .file) {
      // Add "Reload Transactions"
      let reloadTransactionsCommand = UIKeyCommand(
        title: "Reload Transactions",
        action: #selector(reloadTransactionsAction(_:)),
        input: "R",
        modifierFlags: .command
      )
      
      // Combine wallet operations and Reload Transactions into the new File menu
      let newFileMenu = UIMenu(
        title: fileMenu.title,
        image: nil,
        identifier: fileMenu.identifier,
        options: fileMenu.options,
        children: [walletOperationsMenu, reloadTransactionsCommand]
      )
      
      builder.replace(menu: .file, with: newFileMenu)
    }
    
    // BlueWallet -> Settings (Command + ,)
    let settingsCommand = UIKeyCommand(
      title: "Settings...",
      action: #selector(openSettings(_:)),
      input: ",",
      modifierFlags: .command
    )
    
    let settings = UIMenu(
      title: "",
      image: nil,
      identifier: nil,
      options: .displayInline,
      children: [settingsCommand]
    )
    
    // Insert the new Settings menu after the About menu
    builder.insertSibling(settings, afterMenu: .about)
  }
  
  @objc func openSettings(_ keyCommand: UIKeyCommand) {
    MenuElementsEmitter.shared().openSettings()
  }
  
  @objc func addWalletAction(_ keyCommand: UIKeyCommand) {
    MenuElementsEmitter.shared().addWalletMenuAction()
    print("Add Wallet action performed")
  }
  
  @objc func importWalletAction(_ keyCommand: UIKeyCommand) {
    MenuElementsEmitter.shared().importWalletMenuAction()
    print("Import Wallet action performed")
  }
  
  @objc func reloadTransactionsAction(_ keyCommand: UIKeyCommand) {
    MenuElementsEmitter.shared().reloadTransactionsMenuAction()
    print("Reload Transactions action performed")
  }
  
  @objc func showHelp(_ sender: Any) {
    if let url = URL(string: "https://bluewallet.io/docs") {
      UIApplication.shared.open(url, options: [:], completionHandler: nil)
    }
  }
  
  override func canPerformAction(_ action: Selector, withSender sender: Any?) -> Bool {
    if action == #selector(showHelp(_:)) {
      return true
    } else {
      return super.canPerformAction(action, withSender: sender)
    }
  }
  
  // MARK: - File Clearing
  
  func clearFilesIfNeeded() {
    let defaults = UserDefaults.standard
    let shouldClearFiles = defaults.bool(forKey: "clearFilesOnLaunch")
    
    if shouldClearFiles {
      clearDocumentDirectory()
      clearCacheDirectory()
      clearTempDirectory()
      
      // Reset the switch
      defaults.set(false, forKey: "clearFilesOnLaunch")
      defaults.synchronize()
      
      // Show an alert
      let alert = UIAlertController(
        title: "Cache Cleared",
        message: "The document, cache, and temp directories have been cleared.",
        preferredStyle: .alert
      )
      let okAction = UIAlertAction(title: "OK", style: .default, handler: nil)
      alert.addAction(okAction)
      
      DispatchQueue.main.async {
        self.window.rootViewController?.present(alert, animated: true, completion: nil)
      }
    }
  }
  
  func clearDocumentDirectory() {
    if let documentsDirectory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).last {
      clearDirectory(at: documentsDirectory)
    }
  }
  
  func clearCacheDirectory() {
    if let cacheDirectory = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).last {
      clearDirectory(at: cacheDirectory)
    }
  }
  
  func clearTempDirectory() {
    let tempDirectory = URL(fileURLWithPath: NSTemporaryDirectory(), isDirectory: true)
    clearDirectory(at: tempDirectory)
  }
  
  func clearDirectory(at directoryURL: URL) {
    do {
      let contents = try FileManager.default.contentsOfDirectory(at: directoryURL, includingPropertiesForKeys: nil)
      
      for fileURL in contents {
        try FileManager.default.removeItem(at: fileURL)
      }
    } catch {
      print("Error clearing directory: \(error.localizedDescription)")
    }
  }
}
