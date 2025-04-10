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
        userDefaultsGroup = UserDefaults(suiteName: "group.io.bluewallet.bluewallet")

        if let isDoNotTrackEnabled = userDefaultsGroup?.string(forKey: "donottrack"), isDoNotTrackEnabled != "1" {
            #if targetEnvironment(macCatalyst)
            if let config = BugsnagConfiguration.loadConfig() {
                config.appType = "macOS"
                Bugsnag.start(with: config)
            }
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

    private func copyDeviceUID() {
        UserDefaults.standard.addObserver(self, forKeyPath: "deviceUID", options: .new, context: nil)
        UserDefaults.standard.addObserver(self, forKeyPath: "deviceUIDCopy", options: .new, context: nil)

        if let deviceUID = UserDefaults.standard.string(forKey: "deviceUID"), !deviceUID.isEmpty {
            UserDefaults.standard.setValue(deviceUID, forKey: "deviceUIDCopy")
        }
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

    override func observeValue(forKeyPath keyPath: String?, of object: Any?, change: [NSKeyValueChangeKey: Any]?, context: UnsafeMutableRawPointer?) {
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

    override func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
      let activityType = userActivity.activityType
      guard activityType.isEmpty else {
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
}
