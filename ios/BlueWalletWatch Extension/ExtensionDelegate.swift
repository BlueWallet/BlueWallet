import WatchKit
import ClockKit
import Bugsnag
import WatchConnectivity

class ExtensionDelegate: NSObject, WKExtensionDelegate, WCSessionDelegate {

    private let groupUserDefaults = UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue)
    private let refreshInterval: TimeInterval = 600 // 10 minutes
    private let maxRetryAttempts = 3 // Maximum retry attempts for network requests
    private let retryDelay: TimeInterval = 5 // Delay in seconds between retry attempts

    // MARK: - App Lifecycle

    func applicationDidFinishLaunching() {
        print("[AppLifecycle] Application did finish launching.")
        configureAppSettings()
        setupBugsnagIfAllowed()
        setupWCSession()
    }

    override init() {
        super.init()
        addUserDefaultsObserver()
    }
    
    deinit {
        removeUserDefaultsObserver()
    }

    private func configureAppSettings() {
        print("[AppSettings] Configuring app settings.")
        scheduleNextBackgroundRefresh()
        updatePreferredFiatCurrency()
    }

    private func addUserDefaultsObserver() {
        groupUserDefaults?.addObserver(self, forKeyPath: "deviceUIDCopy", options: [.new], context: nil)
    }

    private func removeUserDefaultsObserver() {
        groupUserDefaults?.removeObserver(self, forKeyPath: "deviceUIDCopy")
    }

    private func updateBugsnagUserID() {
        if let deviceUIDCopy = groupUserDefaults?.string(forKey: "deviceUIDCopy") {
            Bugsnag.setUser(deviceUIDCopy, withEmail: nil, andName: nil)
            print("[Bugsnag] Updated user ID to \(deviceUIDCopy)")
        }
    }

    override func observeValue(forKeyPath keyPath: String?, of object: Any?, change: [NSKeyValueChangeKey : Any]?, context: UnsafeMutableRawPointer?) {
        if keyPath == "deviceUIDCopy" {
            updateBugsnagUserID()
        }
    }

    private func setupBugsnagIfAllowed() {
        print("[Bugsnag] Checking if Bugsnag setup is allowed.")
        guard let isDoNotTrackEnabled = groupUserDefaults?.bool(forKey: "donottrack"), !isDoNotTrackEnabled else {
            print("[Bugsnag] Do Not Track is enabled; skipping Bugsnag setup.")
            return
        }

        let config = BugsnagConfiguration.loadConfig()
        config.appType = "watchOS"
      
        if let deviceUIDCopy = groupUserDefaults?.string(forKey: "deviceUIDCopy") {
            config.setUser(deviceUIDCopy, withEmail: nil, andName: nil)
            print("[Bugsnag] Updated user ID to \(deviceUIDCopy)")
        }
    
        config.addOnSendError { event in
            print("[Bugsnag] Sending error event to Bugsnag.")
            return true
        }
        Bugsnag.start(with: config)
        Bugsnag.leaveBreadcrumb(withMessage: "Application did finish launching on watchOS.")
        print("[Bugsnag] Initialized for watchOS with user ID set to deviceUIDCopy.")
    }

    // MARK: - WCSession Setup

    private func setupWCSession() {
        print("[WCSession] Setting up WCSession.")
        guard WCSession.isSupported() else {
            print("[WCSession] WCSession is not supported on this device.")
            return
        }
        WCSession.default.delegate = self
        WCSession.default.activate()
        print("[WCSession] WCSession activated for watchOS.")
    }

    // MARK: - WCSessionDelegate Methods

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if let error = error {
            print("[WCSession] Activation error: \(error.localizedDescription)")
        } else {
            print("[WCSession] Activation completed with state: \(activationState.rawValue)")

            if activationState == .activated && session.isReachable {
                let message: [String: Any] = ["request": "wakeUpApp"]
                session.sendMessage(message, replyHandler: nil) { error in
                    print("[WCSession] Error sending wake-up message: \(error.localizedDescription)")
                }
            }
        }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        print("[WCSession] Received message: \(message)")
        handleMessages(message: message, replyHandler: replyHandler)
    }

    private func handleMessages(message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        guard let request = message["request"] as? String else {
            print("[DataProcessing] Error: Request type not found in message.")
            replyHandler(["status": "Invalid request"])
            return
        }

        switch request {
        case "updatePreferredFiatCurrency":
            if let currencyCode = message["preferredFiatCurrency"] as? String {
              groupUserDefaults?.set(currencyCode, forKey: UserDefaultsGroupKey.PreferredCurrency.rawValue)
                updatePreferredFiatCurrency()
                print("[DataProcessing] Updated preferred fiat currency to \(currencyCode)")
                replyHandler(["status": "Currency updated"])
            } else {
                print("[DataProcessing] Error: Missing preferredFiatCurrency in message.")
                replyHandler(["status": "Error: Missing preferredFiatCurrency"])
            }
            
        case "fetchTransactions":
            print("[DataProcessing] Fetching transactions")
            replyHandler(["status": "Transactions fetched"])
        case "updateComplication":
                       NotificationCenter.default.post(name: .didReceiveUpdateComplicationRequest, object: nil)
                       replyHandler(["status": "Complication data updated"])
        case "hideBalance":
            if let hideBalance = message["hideBalance"] as? Bool {
                groupUserDefaults?.set(hideBalance, forKey: "hideBalance")
                replyHandler(["status": "Balance hidden setting updated"])
                print("[DataProcessing] Set hide balance to \(hideBalance)")
            } else {
                replyHandler(["status": "Error: Missing hideBalance value"])
            }
        
        default:
            print("[DataProcessing] Unknown request type.")
            replyHandler(["status": "Unknown request"])
        }
    }

    func updatePreferredFiatCurrency() {
        print("[CurrencyUpdate] Updating preferred fiat currency.")
        guard let fiatUnit = fetchPreferredFiatUnit() else {
            print("[CurrencyUpdate] Error: Failed to fetch preferred fiat unit.")
            return
        }
        print("[CurrencyUpdate] Fetched fiat unit: \(fiatUnit)")
        updateMarketData(for: fiatUnit)
    }

    private func fetchPreferredFiatUnit() -> FiatUnit? {
        let currencyCode = groupUserDefaults?.string(forKey: "preferredCurrency") ?? "USD"
        print("[CurrencyFetch] Fetching fiat unit for currency code: \(currencyCode)")
        do {
            return try FiatUnit.fiatUnit(for: currencyCode)
        } catch {
            print("[CurrencyFetch] Error fetching FiatUnit: \(error)")
            return nil
        }
    }

    private func updateMarketData(for fiatUnit: FiatUnit, retryCount: Int = 0, completion: (() -> Void)? = nil) {
        print("[MarketData] Updating market data for fiat unit: \(fiatUnit), Attempt: \(retryCount + 1)")
        MarketAPI.fetchPrice(currency: fiatUnit.endPointKey) { [weak self] data, error in
            guard let self = self else { return }
            
            if let error = error {
                print("[MarketData] Fetch error: \(error.localizedDescription)")
                if retryCount < self.maxRetryAttempts {
                    DispatchQueue.main.asyncAfter(deadline: .now() + self.retryDelay) {
                        self.updateMarketData(for: fiatUnit, retryCount: retryCount + 1)
                    }
                }
                completion?()
                return
            }

            guard let data = data else {
                completion?()
                return
            }

            do {
                let encodedData = try PropertyListEncoder().encode(data)
                self.groupUserDefaults?.set(encodedData, forKey: MarketData.string)
                ExtensionDelegate.reloadComplications()
                completion?()
            } catch {
                completion?()
            }
        }
    }

    private static func reloadComplications() {
        let complicationServer = CLKComplicationServer.sharedInstance()
        complicationServer.activeComplications?.forEach { complication in
            complicationServer.reloadTimeline(for: complication)
        }
    }

    func scheduleNextBackgroundRefresh() {
        let nextRefreshDate = Date().addingTimeInterval(refreshInterval)
        WKExtension.shared().scheduleBackgroundRefresh(withPreferredDate: nextRefreshDate, userInfo: nil) { error in
            if let error = error {
                print("[BackgroundRefresh] Scheduling failed: \(error)")
            } else {
                print("[BackgroundRefresh] Scheduled next refresh for \(nextRefreshDate).")
            }
        }
    }

    func handle(_ backgroundTasks: Set<WKRefreshBackgroundTask>) {
        print("[BackgroundTask] Handling background tasks.")
        for task in backgroundTasks {
            if let backgroundTask = task as? WKApplicationRefreshBackgroundTask {
                scheduleNextBackgroundRefresh()
                backgroundTask.setTaskCompletedWithSnapshot(false)
            } else {
                task.setTaskCompletedWithSnapshot(false)
            }
        }
    }
}

extension Notification.Name {
    static let didReceiveUpdateComplicationRequest = Notification.Name("didReceiveUpdateComplicationRequest")
}
