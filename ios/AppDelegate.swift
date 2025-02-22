import UIKit
import Foundation
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import UserNotifications

@main
class AppDelegate: RCTAppDelegate, UNUserNotificationCenterDelegate {

    var userDefaultsGroup: UserDefaults?
    
    // MARK: - Application Lifecycle
    override func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
        self.moduleName = "BlueWallet"
        self.dependencyProvider = RCTAppDependencyProvider()
        // Custom initial props for React Native
        self.initialProps = [:]
        
        // Initialize any custom singletons or managers.
        _ = MenuElementsEmitter.sharedInstance
        clearFilesIfNeeded()
        
        // Set up shared user defaults for app group.
        userDefaultsGroup = UserDefaults(suiteName: "group.io.bluewallet.bluewallet")
        
        // Configure Bugsnag if tracking is enabled.
        let isDoNotTrackEnabled = userDefaultsGroup?.string(forKey: "donottrack")
        if isDoNotTrackEnabled != "1" {
            #if targetEnvironment(macCatalyst)
            if let config = BugsnagConfiguration.loadConfig() {
                config.appType = "macOS"
                Bugsnag.start(with: config)
                copyDeviceUID()
            }
            #else
            Bugsnag.start()
            copyDeviceUID()
            #endif
        } else {
            UserDefaults.standard.set("", forKey: "deviceUIDCopy")
        }
        
        // Allow RTL support.
        RCTI18nUtil.sharedInstance().allowRTL(true)
        
        // Set the UNUserNotificationCenter delegate.
        let center = UNUserNotificationCenter.current()
        center.delegate = self
        
        setupUserDefaultsListener()
        registerNotificationCategories()
        
        return super.application(application, didFinishLaunchingWithOptions: launchOptions)
    }
    
    // MARK: - React Native Bridge
    override func sourceURL(for bridge: RCTBridge) -> URL? {
        bundleURL()
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
        let viewAddressTransactionsAction = UNNotificationAction(identifier: "VIEW_ADDRESS_TRANSACTIONS",
                                                                   title: NSLocalizedString("VIEW_ADDRESS_TRANSACTIONS_TITLE", comment: ""),
                                                                   options: [.foreground])
        
        let viewTransactionDetailsAction = UNNotificationAction(identifier: "VIEW_TRANSACTION_DETAILS",
                                                                  title: NSLocalizedString("VIEW_TRANSACTION_DETAILS_TITLE", comment: ""),
                                                                  options: [.foreground])
        
        let transactionCategory = UNNotificationCategory(identifier: "TRANSACTION_CATEGORY",
                                                          actions: [viewAddressTransactionsAction, viewTransactionDetailsAction],
                                                          intentIdentifiers: [],
                                                          options: [.customDismissAction])
        UNUserNotificationCenter.current().setNotificationCategories([transactionCategory])
    }
    
    // MARK: - KVO and UserDefaults Observing
    override func observeValue(forKeyPath keyPath: String?,
                               of object: Any?,
                               change: [NSKeyValueChangeKey : Any]?,
                               context: UnsafeMutableRawPointer?) {
        guard let keyPath = keyPath else { return }
        
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
        
        if keys.contains(keyPath) {
            WidgetHelper.reloadAllWidgets()
        }
    }
    
    func copyDeviceUID() {
        let defaults = UserDefaults.standard
        // Add KVO observers for deviceUID keys.
        defaults.addObserver(self, forKeyPath: "deviceUID", options: .new, context: nil)
        defaults.addObserver(self, forKeyPath: "deviceUIDCopy", options: .new, context: nil)
        
        if let deviceUID = defaults.string(forKey: "deviceUID"), !deviceUID.isEmpty {
            defaults.set(deviceUID, forKey: "deviceUIDCopy")
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
        keys.forEach { key in
            userDefaultsGroup?.addObserver(self, forKeyPath: key, options: .new, context: nil)
        }
    }
    
    // MARK: - Handoff and URL Handling
    override func application(_ application: UIApplication,
                              continue userActivity: NSUserActivity,
                              restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        guard let activityType = userActivity.activityType as String? else {
            NSLog("[Handoff] Invalid or missing userActivity")
            return false
        }
        
        let userActivityData: [String: Any] = [
            "activityType": activityType,
            "userInfo": userActivity.userInfo ?? [:]
        ]
        
        userDefaultsGroup?.set(userActivityData, forKey: "onUserActivityOpen")
        
        if activityType == "io.bluewallet.bluewallet.receiveonchain" ||
            activityType == "io.bluewallet.bluewallet.xpub" ||
            activityType == "io.bluewallet.bluewallet.blockexplorer" {
            
            if EventEmitter.sharedInstance.responds(to: #selector(EventEmitter.sendUserActivity(_:))) {
                EventEmitter.sharedInstance.sendUserActivity(userActivityData)
            } else {
                NSLog("[Handoff] EventEmitter does not implement sendUserActivity:")
            }
            return true
        }
        
        if activityType == NSUserActivityTypeBrowsingWeb {
            return RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
        }
        
        NSLog("[Handoff] Unhandled user activity type: \(activityType)")
        return false
    }
    
    override func application(_ app: UIApplication,
                              open url: URL,
                              options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
        return RCTLinkingManager.application(app, open: url, options: options)
    }
    
    override func application(_ application: UIApplication,
                              shouldAllowExtensionPointIdentifier extensionPointIdentifier: UIApplication.ExtensionPointIdentifier) -> Bool {
        return false
    }
    
    override func applicationWillTerminate(_ application: UIApplication) {
        userDefaultsGroup?.removeObject(forKey: "onUserActivityOpen")
    }
    
    // MARK: - Quick Actions
    override func application(_ application: UIApplication,
                              performActionFor shortcutItem: UIApplicationShortcutItem,
                              completionHandler: @escaping (Bool) -> Void) {
        RNQuickActionManager.onQuickActionPress(shortcutItem, completionHandler: completionHandler)
    }
    
    // MARK: - User Notifications
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.sound, .alert, .badge])
    }
    
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        let userInfo = response.notification.request.content.userInfo
      var blockExplorer = UserDefaults(suiteName: "group.io.bluewallet.bluewallet")?.string(forKey: "blockExplorer")
      
        if blockExplorer == nil || blockExplorer?.isEmpty == true {
            blockExplorer = "https://www.mempool.space"
        }
        
        if let data = userInfo["data"] as? [String: Any] {
            let address = data["address"] as? String
            let txid = data["txid"] as? String
            
            if response.actionIdentifier == "VIEW_ADDRESS_TRANSACTIONS", let address = address {
                let urlString = "\(blockExplorer!)/address/\(address)"
                if let url = URL(string: urlString), UIApplication.shared.canOpenURL(url) {
                    UIApplication.shared.open(url, options: [:], completionHandler: nil)
                }
            } else if response.actionIdentifier == "VIEW_TRANSACTION_DETAILS", let txid = txid {
                let urlString = "\(blockExplorer!)/tx/\(txid)"
                if let url = URL(string: urlString), UIApplication.shared.canOpenURL(url) {
                    UIApplication.shared.open(url, options: [:], completionHandler: nil)
                }
            }
        }
        
        RNCPushNotificationIOS.didReceive(response)
        completionHandler()
    }
    
    // MARK: - Menu Building for Mac Catalyst
    override func buildMenu(with builder: UIMenuBuilder) {
        super.buildMenu(with: builder)
        
        // Remove unwanted menus using the updated API
      builder.remove(menu: UIMenu.Identifier.services)
        builder.remove(menu: UIMenu.Identifier.format)
      builder.remove(menu: UIMenu.Identifier.toolbar)
        builder.remove(menu: UIMenu.Identifier.preferences)
        
        // File -> Wallet Operations
        let addWalletCommand = UIKeyCommand(input: "A",
                                            modifierFlags: [.command, .shift],
                                            action: #selector(addWalletAction(_:)))
        addWalletCommand.title = "Add Wallet"
        
        let importWalletCommand = UIKeyCommand(input: "I",
                                               modifierFlags: .command,
                                               action: #selector(importWalletAction(_:)))
        importWalletCommand.title = "Import Wallet"
        
        let walletOperationsMenu = UIMenu(title: "", image: nil, identifier: nil, options: .displayInline, children: [addWalletCommand, importWalletCommand])
        
        if let fileMenu = builder.menu(for: UIMenu.Identifier.file) {
            let reloadTransactionsCommand = UIKeyCommand(input: "R",
                                                           modifierFlags: .command,
                                                           action: #selector(reloadTransactionsAction(_:)))
            reloadTransactionsCommand.title = "Reload Transactions"
            
            let newFileMenu = UIMenu(title: fileMenu.title,
                                     image: nil,
                                     identifier: fileMenu.identifier,
                                     options: fileMenu.options,
                                     children: [walletOperationsMenu, reloadTransactionsCommand])
            builder.replace(menu: UIMenu.Identifier.file, with: newFileMenu)
        }
        
        // BlueWallet -> Settings
        let settingsCommand = UIKeyCommand(input: ",",
                                           modifierFlags: .command,
                                           action: #selector(openSettings(_:)))
        settingsCommand.title = "Settings..."
        let settingsMenu = UIMenu(title: "", image: nil, identifier: nil, options: .displayInline, children: [settingsCommand])
      builder.insertSibling(settingsMenu, afterMenu: UIMenu.Identifier.about)
        
        // Optionally add a new "Help" command
        let helpCommand = UIKeyCommand(input: "H",
                                       modifierFlags: .command,
                                       action: #selector(showHelp(_:)))
        helpCommand.title = "Help"
        let helpMenu = UIMenu(title: "", image: nil, identifier: nil, options: .displayInline, children: [helpCommand])
      builder.insertSibling(helpMenu, afterMenu: UIMenu.Identifier.file)
    }
    
    @objc func openSettings(_ keyCommand: UIKeyCommand) {
        MenuElementsEmitter.sharedInstance.openSettings()
    }
    
    @objc func addWalletAction(_ keyCommand: UIKeyCommand) {
        MenuElementsEmitter.sharedInstance.addWalletMenuAction()
        NSLog("Add Wallet action performed")
    }
    
    @objc func importWalletAction(_ keyCommand: UIKeyCommand) {
        MenuElementsEmitter.sharedInstance.importWalletMenuAction()
        NSLog("Import Wallet action performed")
    }
    
    @objc func reloadTransactionsAction(_ keyCommand: UIKeyCommand) {
        MenuElementsEmitter.sharedInstance.reloadTransactionsMenuAction()
        NSLog("Reload Transactions action performed")
    }
    
    @objc func showHelp(_ sender: Any) {
        if let url = URL(string: "https://bluewallet.io/docs") {
            UIApplication.shared.open(url, options: [:], completionHandler: nil)
        }
    }
    
    override func canPerformAction(_ action: Selector, withSender sender: Any?) -> Bool {
        if action == #selector(showHelp(_:)) {
            return true
        }
        return super.canPerformAction(action, withSender: sender)
    }
    
    // MARK: - Push Notification Delegates
    override func application(_ application: UIApplication,
                              didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
      RNCPushNotificationIOS.didRegisterForRemoteNotifications(withDeviceToken: deviceToken)
    }
    
    override func application(_ application: UIApplication,
                              didFailToRegisterForRemoteNotificationsWithError error: Error) {
      RNCPushNotificationIOS.didFailToRegisterForRemoteNotificationsWithError(error)
    }
    
    // MARK: - File Clearing Methods
    func clearFilesIfNeeded() {
        let defaults = UserDefaults.standard
        let shouldClearFiles = defaults.bool(forKey: "clearFilesOnLaunch")
        
        if shouldClearFiles {
            clearDocumentDirectory()
            clearCacheDirectory()
            clearTempDirectory()
            
            defaults.set(false, forKey: "clearFilesOnLaunch")
            defaults.synchronize()
            
            let alert = UIAlertController(title: "Cache Cleared",
                                          message: "The document, cache, and temp directories have been cleared.",
                                          preferredStyle: .alert)
            let okAction = UIAlertAction(title: "OK", style: .default, handler: nil)
            alert.addAction(okAction)
            
            DispatchQueue.main.async {
                if let topVC = self.topViewController() {
                    topVC.present(alert, animated: true, completion: nil)
                }
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
    
    func clearDirectory(at url: URL) {
        do {
            let contents = try FileManager.default.contentsOfDirectory(at: url, includingPropertiesForKeys: nil, options: [])
            for fileURL in contents {
                do {
                    try FileManager.default.removeItem(at: fileURL)
                } catch {
                    NSLog("Error removing file: \(error.localizedDescription)")
                }
            }
        } catch {
            NSLog("Error reading contents of directory: \(error.localizedDescription)")
        }
    }
}

extension AppDelegate {
    func topViewController(controller: UIViewController? = UIApplication.shared.windows.filter { $0.isKeyWindow }.first?.rootViewController) -> UIViewController? {
        if let nav = controller as? UINavigationController {
            return topViewController(controller: nav.visibleViewController)
        }
        if let tab = controller as? UITabBarController, let selected = tab.selectedViewController {
            return topViewController(controller: selected)
        }
        if let presented = controller?.presentedViewController {
            return topViewController(controller: presented)
        }
        return controller
    }
}
