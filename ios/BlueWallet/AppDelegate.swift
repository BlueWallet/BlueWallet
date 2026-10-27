import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import UserNotifications
import Bugsnag


@main
class AppDelegate: RCTAppDelegate, UNUserNotificationCenterDelegate {

    private var userDefaultsGroup: UserDefaults?
    var sceneLaunchOptions: [UIApplication.LaunchOptionsKey: Any]?

    override func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        var reactLaunchOptions = launchOptions
        if let shortcutItem = launchOptions?[.shortcutItem] as? UIApplicationShortcutItem,
           let url = appLinkURL(for: shortcutItem) {
            reactLaunchOptions?[.url] = url
            reactLaunchOptions?.removeValue(forKey: .shortcutItem)
        }
        sceneLaunchOptions = reactLaunchOptions
        automaticallyLoadReactNativeWindow = false
        clearFilesIfNeeded()

        if #available(iOS 16.4, visionOS 1.0, *) {
            WalletAppShortcuts.updateAppShortcutParameters()
        }
        
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

        RNNotifications.startMonitorNotifications()
        RNNotifications.addNativeDelegate(self)

        setupUserDefaultsListener()
        registerNotificationCategories()
        
        return super.application(application, didFinishLaunchingWithOptions: reactLaunchOptions)
    }

    override func application(
        _ application: UIApplication,
        configurationForConnecting connectingSceneSession: UISceneSession,
        options: UIScene.ConnectionOptions
    ) -> UISceneConfiguration {
        let configuration = UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
        configuration.delegateClass = SceneDelegate.self
        return configuration
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
                let rootViewController = UIApplication.shared.connectedScenes
                    .compactMap { $0 as? UIWindowScene }
                    .flatMap(\.windows)
                    .first { $0.isKeyWindow }?
                    .rootViewController
                rootViewController?.present(alert, animated: true, completion: nil)
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
            WidgetHelper().reloadAllWidgets()
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

        if ["io.bluewallet.bluewallet.receiveonchain", "io.bluewallet.bluewallet.xpub", "io.bluewallet.bluewallet.blockexplorer", "io.bluewallet.bluewallet.electrumserverhistory"].contains(activityType) {
          EventEmitter.shared()?.sendUserActivity(userActivityData)
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

    override func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        RNNotifications.didRegisterForRemoteNotifications(withDeviceToken: deviceToken)
    }

    override func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        RNNotifications.didFailToRegisterForRemoteNotificationsWithError(error)
    }

    override func application(
        _ application: UIApplication,
        didReceiveRemoteNotification userInfo: [AnyHashable: Any],
        fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
    ) {
        RNNotifications.didReceiveBackgroundNotification(userInfo, withCompletionHandler: completionHandler)
    }

    override func applicationWillTerminate(_ application: UIApplication) {
        userDefaultsGroup?.removeObject(forKey: "onUserActivityOpen")

        RNNotifications.removeNativeDelegate(self)
        UserDefaults.standard.removeObserver(self, forKeyPath: "deviceUID")
    }

    override func application(_ application: UIApplication, performActionFor shortcutItem: UIApplicationShortcutItem, completionHandler: @escaping (Bool) -> Void) {
        openShortcutLink(shortcutItem, completionHandler: completionHandler)
    }

    func openShortcutLink(
        _ shortcutItem: UIApplicationShortcutItem,
        in scene: UIWindowScene? = nil,
        completionHandler: @escaping (Bool) -> Void
    ) {
        guard let url = appLinkURL(for: shortcutItem) else {
            completionHandler(false)
            return
        }

        if let scene = scene ?? window.windowScene {
            let activity = NSUserActivity(activityType: NSUserActivityTypeBrowsingWeb)
            activity.webpageURL = url
            RCTLinkingManager.scene(scene, continue: activity)
            completionHandler(true)
            return
        }

        completionHandler(RCTLinkingManager.application(UIApplication.shared, open: url, options: [:]))
    }

    func appLinkURL(for shortcutItem: UIApplicationShortcutItem) -> URL? {
        guard let urlString = shortcutItem.userInfo?["url"] as? String else { return nil }
        return URL(string: urlString)
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

        completionHandler()
    }
    
    // MARK: - Menu Building (macOS Catalyst)
    
    override func buildMenu(with builder: UIMenuBuilder) {
        super.buildMenu(with: builder)
        
        guard builder.system === UIMenuSystem.main else { return }
        builder.remove(menu: .services)
        builder.remove(menu: .format)
        builder.remove(menu: .toolbar)
        builder.remove(menu: .preferences)

        let actions = MenuActionsController.shared.availableActions
        let commands: [(String, String, String, Selector, String?, UIKeyModifierFlags, UIMenu.Identifier)] = [
            ("addWallet", "Add Wallet", "plus.rectangle.on.folder", #selector(addWalletAction), "a", [.command, .shift], .file),
            ("importWallet", "Import Wallet", "square.and.arrow.down", #selector(importWalletAction), "i", .command, .file),
            ("manageWallets", "Manage Wallets…", "list.bullet.rectangle", #selector(manageWalletsAction), "m", [.command, .shift], .file),
            ("send", "Send…", "arrow.up.circle", #selector(sendMenuAction), "s", [.command, .shift], .file),
            ("receive", "Receive…", "arrow.down.circle", #selector(receiveMenuAction), "r", [.command, .shift], .file),
            ("walletDetails", "Wallet Details…", "info.circle", #selector(walletDetailsMenuAction), "d", .command, .file),
            ("reloadTransactions", "Reload Transactions", "arrow.clockwise", #selector(reloadTransactionsAction), "r", .command, .view),
            ("backToWallets", "Back to Wallets", "wallet.pass", #selector(backToWalletsMenuAction), "w", [.command, .shift], .view),
            ("copyAddress", "Copy Address", "doc.on.doc", #selector(copyAddressMenuAction), "c", [.command, .shift], .edit),
            ("copyTransactionId", "Copy Transaction ID", "doc.on.doc", #selector(copyTransactionIdMenuAction), "c", [.command, .shift], .edit),
            ("accelerateTransaction", "Speed up Transaction", "hare", #selector(accelerateTransactionMenuAction), "u", [.command, .shift], .view),
            ("keyboardShortcuts", "Keyboard Shortcuts…", "keyboard", #selector(keyboardShortcutsMenuAction), "/", .command, .help)
        ]
        for parent in [UIMenu.Identifier.file, .edit, .view, .help] {
            let identifier = UIMenu.Identifier("io.bluewallet.commands.\(parent.rawValue)")
            builder.remove(menu: identifier)
            let children = commands.filter { actions.contains($0.0) && $0.6 == parent }.map { command -> UICommand in
                let title = MenuActionsController.shared.title(for: command.0, fallback: command.1)
                let image = UIImage(systemName: command.2)
                if let input = command.4 {
                    return UIKeyCommand(title: title, image: image, action: command.3, input: input, modifierFlags: command.5)
                }
                return UICommand(title: title, image: image, action: command.3)
            }
            if !children.isEmpty {
                builder.insertChild(UIMenu(title: "", identifier: identifier,
                                           options: .displayInline, children: children), atStartOfMenu: parent)
            }
        }

        let electrumMenuID = UIMenu.Identifier("io.bluewallet.electrum")
        builder.remove(menu: electrumMenuID)
        let electrumPrimaryCommands = [
            actions.contains("addElectrumServer")
                ? UIKeyCommand(title: "Add Server…", action: #selector(addElectrumServerMenuAction), input: "n", modifierFlags: .command)
                : nil,
            actions.contains("saveElectrumServer")
                ? UIKeyCommand(title: "Save Server", action: #selector(saveElectrumServerMenuAction), input: "\r", modifierFlags: .command)
                : nil
        ].compactMap { $0 }
        let electrumViewCommands = [
            actions.contains("toggleSuggestedElectrumServers")
                ? UIKeyCommand(title: "Toggle Suggested Servers", action: #selector(toggleSuggestedElectrumServersMenuAction), input: "e", modifierFlags: [.command, .shift])
                : nil,
            actions.contains("resetElectrumSettings")
                ? UIKeyCommand(title: "Reset Electrum Settings…", action: #selector(resetElectrumSettingsMenuAction), input: "r", modifierFlags: [.command, .alternate])
                : nil
        ].compactMap { $0 }
        let electrumGroups = [
            electrumPrimaryCommands.isEmpty ? nil : UIMenu(title: "", options: .displayInline, children: electrumPrimaryCommands),
            electrumViewCommands.isEmpty ? nil : UIMenu(title: "", options: .displayInline, children: electrumViewCommands)
        ].compactMap { $0 }
        if !electrumGroups.isEmpty {
            builder.insertSibling(UIMenu(title: "Server", identifier: electrumMenuID, children: electrumGroups), afterMenu: .file)
        }

        let sendDetailsMenuID = UIMenu.Identifier("io.bluewallet.sendDetails")
        builder.remove(menu: sendDetailsMenuID)
        let sendDetailsCommands: [(String, String, String, String, UIKeyModifierFlags)] = [
            ("add_recipient", "Add Recipient", "person.badge.plus", "a", [.command, .alternate]),
            ("remove_recipient", "Remove Recipient", "person.badge.minus", "r", [.command, .alternate]),
            ("remove_all_recipients", "Remove All Recipients", "person.2.slash", "r", [.command, .alternate, .shift]),
            ("send_max", "Use Full Balance", "dial.high", "m", [.command, .alternate]),
            ("allow_rbf", "Allow Fee Bump", "arrowshape.up.circle", "b", [.command, .alternate]),
            ("import_transaction", "Import Transaction", "square.and.arrow.down", "i", [.command, .alternate]),
            ("import_transaction_qr", "Import Transaction (QR)", "qrcode.viewfinder", "q", [.command, .alternate]),
            ("import_transaction_multisig", "Import Multisig Transaction", "square.and.arrow.down.on.square", "i", [.command, .alternate, .shift]),
            ("co_sign_transaction", "Co-sign Transaction", "signature", "c", [.command, .alternate]),
            ("sign_psbt", "Sign a Transaction", "signature", "s", [.command, .alternate]),
            ("insert_contact", "Insert Contact", "at.badge.plus", "p", [.command, .alternate]),
            ("coin_control", "Coin Control", "switch.2", "o", [.command, .alternate])
        ]
        let availableSendCommands = sendDetailsCommands.filter { actions.contains($0.0) }.map {
            let command = UIKeyCommand(title: MenuActionsController.shared.title(for: $0.0, fallback: $0.1),
                                       image: UIImage(systemName: $0.2), action: #selector(sendDetailsMenuAction),
                                       input: $0.3, modifierFlags: $0.4, propertyList: $0.0)
            if let state = MenuActionsController.shared.actionStates[$0.0] {
                command.attributes = state.disabled == true ? .disabled : []
                if let checked = state.checked {
                    command.state = checked ? .on : .off
                }
            }
            return command
        }
        if !availableSendCommands.isEmpty {
            builder.insertChild(UIMenu(title: MenuActionsController.shared.title(for: "send", fallback: "Send"),
                                       image: UIImage(systemName: "paperplane"), identifier: sendDetailsMenuID,
                                       children: availableSendCommands), atStartOfMenu: .file)
        }

        let recentItems: [UIMenuElement]
        if !actions.contains("openFile") {
            recentItems = [UICommand(title: MenuActionsController.shared.title(for: "unlockRecent", fallback: "Unlock BlueWallet to View Recent Items"),
                                     image: UIImage(systemName: "lock"),
                                     action: #selector(unavailableRecentMenuAction), attributes: .disabled)]
        } else if MenuActionsController.shared.recentItems.isEmpty {
            recentItems = [UICommand(title: MenuActionsController.shared.title(for: "noRecent", fallback: "No Recent Wallets or Transactions"),
                                     image: UIImage(systemName: "clock"),
                                     action: #selector(unavailableRecentMenuAction), attributes: .disabled)]
        } else {
            recentItems = MenuActionsController.shared.recentItems.map { item in
                UICommand(
                    title: item.title,
                    image: UIImage(systemName: item.kind == "wallet" ? "wallet.pass" : "list.bullet.rectangle"),
                    action: #selector(openRecentMenuAction),
                    propertyList: item.id
                )
            }
        }

        func replacingSystemFileCommands(_ elements: [UIMenuElement]) -> [UIMenuElement] {
            elements.map { element in
                if let menu = element as? UIMenu {
                    let isOpenRecent = menu.identifier == .openRecent
                    let children = isOpenRecent ? recentItems : replacingSystemFileCommands(menu.children)
                    let identifier = isOpenRecent ? UIMenu.Identifier("io.bluewallet.openRecent") : menu.identifier
                    return UIMenu(title: menu.title, image: menu.image, identifier: identifier,
                                  options: menu.options, children: children)
                }
                if let command = element as? UICommand,
                   command.action == NSSelectorFromString("open:") {
                    return UIKeyCommand(title: command.title, image: UIImage(systemName: "folder"), action: #selector(openFileMenuAction),
                                        input: "o", modifierFlags: .command)
                }
                if let command = element as? UICommand,
                   command.action == NSSelectorFromString("performClose:") {
                    let closeCommand = UIKeyCommand(title: command.title, image: UIImage(systemName: "xmark"), action: #selector(closePresentedMenuAction),
                                                    input: "w", modifierFlags: .command)
                    closeCommand.attributes = presentedViewController == nil ? .hidden : []
                    return closeCommand
                }
                return element
            }
        }
        builder.replaceChildren(ofMenu: .file, from: replacingSystemFileCommands)

        let settingsMenuID = UIMenu.Identifier("io.bluewallet.settings")
        let toolsMenuID = UIMenu.Identifier("io.bluewallet.tools")
        builder.remove(menu: settingsMenuID)
        builder.remove(menu: toolsMenuID)
        if actions.contains("settings") {
            let command = UIKeyCommand(title: MenuActionsController.shared.title(for: "settings", fallback: "Settings") + "…",
                                       image: UIImage(systemName: "gearshape"), action: #selector(openSettings),
                                       input: ",", modifierFlags: .command)
            builder.insertSibling(UIMenu(title: "", identifier: settingsMenuID,
                                         options: .displayInline, children: [command]), afterMenu: .about)

            let tools = [
                UIKeyCommand(title: MenuActionsController.shared.title(for: "isItMyAddress", fallback: "Is it my address?"),
                             image: UIImage(systemName: "magnifyingglass"), action: #selector(isItMyAddressMenuAction),
                             input: "i", modifierFlags: [.command, .shift]),
                UIKeyCommand(title: MenuActionsController.shared.title(for: "broadcastTransaction", fallback: "Broadcast Transaction"),
                             image: UIImage(systemName: "antenna.radiowaves.left.and.right"), action: #selector(broadcastTransactionMenuAction),
                             input: "b", modifierFlags: [.command, .shift]),
                UIKeyCommand(title: MenuActionsController.shared.title(for: "generateWord", fallback: "Seed final word"),
                             image: UIImage(systemName: "key"), action: #selector(generateWordMenuAction),
                             input: "g", modifierFlags: [.command, .shift])
            ]
            builder.insertSibling(UIMenu(title: MenuActionsController.shared.title(for: "tools", fallback: "Tools"),
                                         image: UIImage(systemName: "wrench.and.screwdriver"),
                                         identifier: toolsMenuID, children: tools), afterMenu: settingsMenuID)
        }
    }

    @objc func openSettings(_ keyCommand: UIKeyCommand) {
        MenuActionsController.shared.perform("settings")
    }

    @objc func accelerateTransactionMenuAction(_ command: UICommand) {
        MenuActionsController.shared.perform("accelerateTransaction")
    }

    @objc func isItMyAddressMenuAction(_ command: UICommand) {
        MenuActionsController.shared.perform("isItMyAddress")
    }

    @objc func broadcastTransactionMenuAction(_ command: UICommand) {
        MenuActionsController.shared.perform("broadcastTransaction")
    }

    @objc func generateWordMenuAction(_ command: UICommand) {
        MenuActionsController.shared.perform("generateWord")
    }

    @objc func addWalletAction(_ keyCommand: UIKeyCommand) {
        MenuActionsController.shared.perform("addWallet")
    }

    @objc func importWalletAction(_ keyCommand: UIKeyCommand) {
        MenuActionsController.shared.perform("importWallet")
    }

    @objc func openFileMenuAction(_ keyCommand: UIKeyCommand) {
        MenuActionsController.shared.perform("openFile")
    }

    @objc func closePresentedMenuAction(_ keyCommand: UIKeyCommand) {
        presentedViewController?.dismiss(animated: true) {
            DispatchQueue.main.async {
                UIMenuSystem.main.setNeedsRebuild()
            }
        }
    }

    @objc func openRecentMenuAction(_ command: UICommand) {
        guard let identifier = command.propertyList as? String else { return }
        MenuActionsController.shared.perform("openRecent:\(identifier)")
    }

    @objc func unavailableRecentMenuAction(_ command: UICommand) {}

    @objc func sendDetailsMenuAction(_ command: UICommand) {
        guard let action = command.propertyList as? String else { return }
        MenuActionsController.shared.perform(action)
    }

    @objc func manageWalletsAction(_ keyCommand: UIKeyCommand) {
        MenuActionsController.shared.perform("manageWallets")
    }

    @objc func reloadTransactionsAction(_ keyCommand: UIKeyCommand) {
        MenuActionsController.shared.perform("reloadTransactions")
    }

    @objc func sendMenuAction(_ keyCommand: UIKeyCommand) {
        MenuActionsController.shared.perform("send")
    }

    @objc func receiveMenuAction(_ keyCommand: UIKeyCommand) {
        MenuActionsController.shared.perform("receive")
    }

    @objc func walletDetailsMenuAction(_ keyCommand: UIKeyCommand) {
        MenuActionsController.shared.perform("walletDetails")
    }

    @objc func backToWalletsMenuAction(_ keyCommand: UIKeyCommand) {
        MenuActionsController.shared.perform("backToWallets")
    }

    @objc func copyAddressMenuAction(_ keyCommand: UIKeyCommand) {
        MenuActionsController.shared.perform("copyAddress")
    }

    @objc func copyTransactionIdMenuAction(_ keyCommand: UIKeyCommand) {
        MenuActionsController.shared.perform("copyTransactionId")
    }

    @objc func addElectrumServerMenuAction(_ keyCommand: UIKeyCommand) {
      MenuActionsController.shared.perform("addElectrumServer")
    }

    @objc func saveElectrumServerMenuAction(_ keyCommand: UIKeyCommand) {
      MenuActionsController.shared.perform("saveElectrumServer")
    }

    @objc func toggleSuggestedElectrumServersMenuAction(_ keyCommand: UIKeyCommand) {
      MenuActionsController.shared.perform("toggleSuggestedElectrumServers")
    }

    @objc func resetElectrumSettingsMenuAction(_ keyCommand: UIKeyCommand) {
      MenuActionsController.shared.perform("resetElectrumSettings")
    }

    @objc func keyboardShortcutsMenuAction(_ keyCommand: UIKeyCommand) {
        MenuActionsController.shared.perform("keyboardShortcuts")
    }

    @objc func showHelp(_ sender: Any) {
        if let url = URL(string: "https://bluewallet.io/docs") {
            UIApplication.shared.open(url, options: [:], completionHandler: nil)
        }
    }

    private var presentedViewController: UIViewController? {
        guard let rootViewController = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .flatMap(\.windows)
            .first(where: \.isKeyWindow)?
            .rootViewController else { return nil }

        var presented = rootViewController.presentedViewController
        while let next = presented?.presentedViewController {
            presented = next
        }
        return presented
    }

    override func validate(_ command: UICommand) {
        if command.action == #selector(closePresentedMenuAction) {
            command.attributes = presentedViewController == nil ? .hidden : []
        } else {
            super.validate(command)
        }
    }
    
    override func canPerformAction(_ action: Selector, withSender sender: Any?) -> Bool {
        if action == #selector(openFileMenuAction) {
            return MenuActionsController.shared.availableActions.contains("openFile")
        } else if action == #selector(closePresentedMenuAction) {
            return presentedViewController != nil
        } else if action == #selector(showHelp(_:)) {
            return true
        } else {
            return super.canPerformAction(action, withSender: sender)
        }
    }
}
