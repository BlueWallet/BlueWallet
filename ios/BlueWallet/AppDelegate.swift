import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import UserNotifications
import Bugsnag


@main
class AppDelegate: RCTAppDelegate, UNUserNotificationCenterDelegate {

    private var userDefaultsGroup: UserDefaults?

    override func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        clearFilesIfNeeded()
        
        // Fix app group UserDefaults initialization
        userDefaultsGroup = UserDefaults.standard
        
        // Set up device UID observers early
        setupDeviceUIDObservers()
        
        let doNotTrackValue = userDefaultsGroup?.string(forKey: "donottrack") ?? "0"
        NSLog("[AppDelegate] Initial Do Not Track value: '\(doNotTrackValue)'")

        if let isDoNotTrackEnabled = userDefaultsGroup?.string(forKey: "donottrack"), isDoNotTrackEnabled == "1" {
            let isEnabled = userDefaultsGroup?.string(forKey: "donottrack") ?? "0"
            NSLog("[AppDelegate] Do Not Track setting: \(isEnabled), expected to be '1'")
          
            userDefaultsGroup?.set("Disabled", forKey: "deviceUIDCopy")
            userDefaultsGroup?.synchronize()
          
            NSLog("[AppDelegate] Do Not Track enabled: set deviceUIDCopy to 'Disabled'")
          
        } else {
      #if targetEnvironment(macCatalyst)
      let config = BugsnagConfiguration.loadConfig()
      config.appType = "macOS"
      Bugsnag.start(with: config)
      copyDeviceUID()
      #else
      Bugsnag.start()
      copyDeviceUID()
      #endif
        }

        self.moduleName = "BlueWallet"
        self.dependencyProvider = RCTAppDependencyProvider()
        self.initialProps = [:]

        RCTI18nUtil.sharedInstance().allowRTL(true)

        let center = UNUserNotificationCenter.current()
        center.delegate = self

        setupUserDefaultsListener()
        registerNotificationCategories()
        
        // Access the singleton via the class method
        _ = MenuElementsEmitter.sharedInstance()
        NSLog("[MenuElements] AppDelegate: Initialized emitter singleton")
        
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

    private func registerNotificationCategories() {
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

    private func setupUserDefaultsListener() {
        guard let defaults = userDefaultsGroup else {
            NSLog("[AppDelegate] Cannot setup UserDefaults listeners: group defaults not available")
            return
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

        for key in keys {
            defaults.addObserver(self, forKeyPath: key, options: .new, context: nil)
        }
    }

    private func copyDeviceUID() {
        let isDoNotTrackEnabled = userDefaultsGroup?.string(forKey: "donottrack") == "1"
        
        let deviceUID = UserDefaults.standard.string(forKey: "deviceUID") ?? ""
        let currentCopy = userDefaultsGroup?.string(forKey: "deviceUIDCopy") ?? ""
        
        if isDoNotTrackEnabled {
            if currentCopy != "Disabled" {
                userDefaultsGroup?.set("Disabled", forKey: "deviceUIDCopy")
                userDefaultsGroup?.synchronize()
                NSLog("[AppDelegate] Do Not Track enabled - set deviceUIDCopy to 'Disabled'")
            }
            return
        }
        
        let hasCorrectFormat = deviceUID.count == 36 && deviceUID.components(separatedBy: "-").count == 5
        if deviceUID.isEmpty || !hasCorrectFormat {
            let uuid = UUID().uuidString
            UserDefaults.standard.setValue(uuid, forKey: "deviceUID")
            copyDeviceUID()
            return
        }
        if deviceUID != currentCopy {
            userDefaultsGroup?.set(deviceUID, forKey: "deviceUIDCopy")
            userDefaultsGroup?.synchronize()
            
            NSLog("[AppDelegate] Synced deviceUID to shared group: \(deviceUID)")
            
            let updatedCopy = userDefaultsGroup?.string(forKey: "deviceUIDCopy") ?? ""
            NSLog("[AppDelegate] Verification - deviceUIDCopy is now: \(updatedCopy)")
        }
    }


    private func setupDeviceUIDObservers() {
        UserDefaults.standard.addObserver(self, forKeyPath: "deviceUID", options: .new, context: nil)
        
        if userDefaultsGroup != nil {
            userDefaultsGroup?.addObserver(self, forKeyPath: "donottrack", options: .new, context: nil)
            NSLog("[AppDelegate] Registered observer for donottrack changes")
        }
        
        // Check if Do Not Track is enabled
        let isDoNotTrackEnabled = userDefaultsGroup?.string(forKey: "donottrack") == "1"
        NSLog("[AppDelegate] Do Not Track enabled: \(isDoNotTrackEnabled)")
        
        let currentDeviceUID = UserDefaults.standard.string(forKey: "deviceUID")
        
        if !isDoNotTrackEnabled {
            var shouldSetUUID = false
            
            if currentDeviceUID == nil {
                shouldSetUUID = true
                NSLog("[AppDelegate] No deviceUID exists, will create a new one")
            } else if let currentUID = currentDeviceUID {
                let hasCorrectFormat = currentUID.count == 36 && currentUID.components(separatedBy: "-").count == 5
                if !hasCorrectFormat {
                    shouldSetUUID = true
                    NSLog("[AppDelegate] Current deviceUID doesn't match UUID format, will replace it")
                }
            }
            
            if shouldSetUUID {
                let uuid = UUID().uuidString
                UserDefaults.standard.setValue(uuid, forKey: "deviceUID")
                NSLog("[AppDelegate] Set deviceUID to: \(uuid)")
            }
        } else {
            NSLog("[AppDelegate] Do Not Track enabled - not setting UUID")
        }
        
        if userDefaultsGroup != nil {
            UserDefaults.standard.addSuite(named: UserDefaultsGroupKey.GroupName.rawValue)
            NSLog("[AppDelegate] Registered app group UserDefaults with standard UserDefaults")
        }
        
        copyDeviceUID()
    }

    private func clearFilesIfNeeded() {
        let defaults = UserDefaults.standard
        if defaults.bool(forKey: "clearFilesOnLaunch") {
            clearDirectory(.documentDirectory)
            clearDirectory(.cachesDirectory)
            clearTempDirectory()

            defaults.set(false, forKey: "clearFilesOnLaunch")
            defaults.synchronize()

            DispatchQueue.main.async {
                let alert = UIAlertController(
                    title: "Cache Cleared",
                    message: "The document, cache, and temp directories have been cleared.",
                    preferredStyle: .alert
                )
                alert.addAction(UIAlertAction(title: "OK", style: .default, handler: nil))
              self.window.rootViewController?.present(alert, animated: true, completion: nil)
            }
        }
    }

    private func clearDirectory(_ directory: FileManager.SearchPathDirectory) {
        if let directoryURL = FileManager.default.urls(for: directory, in: .userDomainMask).last {
            clearDirectory(at: directoryURL)
        }
    }

    private func clearTempDirectory() {
        let tempDirectory = URL(fileURLWithPath: NSTemporaryDirectory(), isDirectory: true)
        clearDirectory(at: tempDirectory)
    }

    private func clearDirectory(at url: URL) {
        do {
            let contents = try FileManager.default.contentsOfDirectory(at: url, includingPropertiesForKeys: nil, options: [])
            for fileURL in contents {
                try FileManager.default.removeItem(at: fileURL)
            }
        } catch {
            print("Error clearing directory: \(error.localizedDescription)")
        }
    }
    
    // MARK: - Key-Value Observing
  override func observeValue(forKeyPath keyPath: String?, of object: Any?, change: [NSKeyValueChangeKey: Any]?, context: UnsafeMutableRawPointer?) {
        guard let keyPath = keyPath else { return }

        // Handle deviceUID change
        if keyPath == "deviceUID" {
            NSLog("[AppDelegate] deviceUID changed, calling copyDeviceUID")
            copyDeviceUID()
        }
        
        // Handle donottrack changes
        if keyPath == "donottrack" {
            let newValue = userDefaultsGroup?.string(forKey: "donottrack") ?? "0"
            NSLog("[AppDelegate] donottrack changed to: \(newValue)")
            
            if newValue != "1" {
                let deviceUID = UserDefaults.standard.string(forKey: "deviceUID") ?? ""
                let hasCorrectFormat = deviceUID.count == 36 && deviceUID.components(separatedBy: "-").count == 5
                
                if deviceUID.isEmpty || !hasCorrectFormat {
                    let uuid = UUID().uuidString
                    UserDefaults.standard.setValue(uuid, forKey: "deviceUID")
                    NSLog("[AppDelegate] Do Not Track disabled - setting new deviceUID: \(uuid)")
                }
            }
            
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

    override func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
      let activityType = userActivity.activityType
      guard !activityType.isEmpty else {
            print("[Handoff] Invalid or missing userActivity")
            return false
        }

        let userActivityData: [String: Any] = [
            "activityType": activityType,
            "userInfo": userActivity.userInfo ?? [:]
        ]

        userDefaultsGroup?.setValue(userActivityData, forKey: "onUserActivityOpen")

        if ["io.bluewallet.bluewallet.receiveonchain", "io.bluewallet.bluewallet.xpub", "io.bluewallet.bluewallet.blockexplorer"].contains(activityType) {
          EventEmitter.shared().sendUserActivity(userActivityData)
            return true
        }

        if activityType == NSUserActivityTypeBrowsingWeb {
            return RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
        }

        print("[Handoff] Unhandled user activity type: \(activityType)")
        return false
    }

    override func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return RCTLinkingManager.application(app, open: url, options: options)
    }

    override func applicationWillTerminate(_ application: UIApplication) {
        userDefaultsGroup?.removeObject(forKey: "onUserActivityOpen")
        
        UserDefaults.standard.removeObserver(self, forKeyPath: "deviceUID")
    }

    override func application(_ application: UIApplication, performActionFor shortcutItem: UIApplicationShortcutItem, completionHandler: @escaping (Bool) -> Void) {
        RNQuickActionManager.onQuickActionPress(shortcutItem, completionHandler: completionHandler)
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.sound, .list, .banner, .badge])
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        let userInfo = response.notification.request.content.userInfo
        let blockExplorer = userDefaultsGroup?.string(forKey: "blockExplorer") ?? "https://www.mempool.space"

        if let data = userInfo["data"] as? [String: Any] {
            if response.actionIdentifier == "VIEW_ADDRESS_TRANSACTIONS", let address = data["address"] as? String {
                if let url = URL(string: "\(blockExplorer)/address/\(address)") {
                    UIApplication.shared.open(url)
                }
            } else if response.actionIdentifier == "VIEW_TRANSACTION_DETAILS", let txid = data["txid"] as? String {
                if let url = URL(string: "\(blockExplorer)/tx/\(txid)") {
                    UIApplication.shared.open(url)
                }
            }
        }

        RNCPushNotificationIOS.didReceive(response)
        completionHandler()
    }
    
    // MARK: - Menu Building (macOS Catalyst)
    
    override func buildMenu(with builder: UIMenuBuilder) {
        super.buildMenu(with: builder)
        
        // Remove unnecessary menus
        builder.remove(menu: .services)
        builder.remove(menu: .format)
        builder.remove(menu: .toolbar)
        
        // Remove the original Settings menu item
        builder.remove(menu: .preferences)
        
        // File -> Add Wallet (Command + Shift + A)
        let addWalletCommand = UIKeyCommand(
            title: "Add Wallet",
            action: #selector(addWalletAction),
            input: "A",
            modifierFlags: [.command, .shift]
        )
        
        // All menu items enabled by default
        
        // File -> Import Wallet (Command + I)
        let importWalletCommand = UIKeyCommand(
            title: "Import Wallet",
            action: #selector(importWalletAction),
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
            // Add "Reload Transactions" (Command + R)
            let reloadTransactionsCommand = UIKeyCommand(
                title: "Reload Transactions",
                action: #selector(reloadTransactionsAction),
                input: "R",
                modifierFlags: .command
            )
            
            // Combine wallet operations and Reload Transactions into the new File menu
            let newFileMenu = UIMenu(
                title: fileMenu.title,
                image: fileMenu.image,
                identifier: fileMenu.identifier,
                options: fileMenu.options,
                children: [walletOperationsMenu, reloadTransactionsCommand]
            )
            
            builder.replace(menu: .file, with: newFileMenu)
        }
        
        // BlueWallet -> Settings (Command + ,)
        let settingsCommand = UIKeyCommand(
            title: "Settings...",
            action: #selector(openSettings),
            input: ",",
            modifierFlags: .command
        )
        
        let settingsMenu = UIMenu(
            title: "",
            image: nil,
            identifier: nil,
            options: .displayInline,
            children: [settingsCommand]
        )
        
        // Insert the new Settings menu after the About menu
        builder.insertSibling(settingsMenu, afterMenu: .about)
    }
    
    @objc func openSettings(_ keyCommand: UIKeyCommand) {
        DispatchQueue.main.async {
            MenuElementsEmitter.sharedInstance().openSettings()
        }
    }
    
    @objc func addWalletAction(_ keyCommand: UIKeyCommand) {
        DispatchQueue.main.async {
            MenuElementsEmitter.sharedInstance().addWalletMenuAction()
        }
    }
    
    @objc func importWalletAction(_ keyCommand: UIKeyCommand) {
        DispatchQueue.main.async {
            MenuElementsEmitter.sharedInstance().importWalletMenuAction()
        }
    }
    
    @objc func reloadTransactionsAction(_ keyCommand: UIKeyCommand) {
        DispatchQueue.main.async {
            MenuElementsEmitter.sharedInstance().reloadTransactionsMenuAction()
        }
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
}
