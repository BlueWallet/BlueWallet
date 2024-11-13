import WatchKit
import ClockKit
import Bugsnag
import WatchConnectivity

class ExtensionDelegate: NSObject, WKExtensionDelegate, WCSessionDelegate {

    private let groupUserDefaults = UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue)
    private let refreshInterval: TimeInterval = 600 // 10 minutes

    // MARK: - App Lifecycle

    func applicationDidFinishLaunching() {
        configureAppSettings()
        setupBugsnagIfAllowed()
        setupWCSession()
    }

    private func configureAppSettings() {
        scheduleNextBackgroundRefresh()
        updatePreferredFiatCurrency()
    }

    private func setupBugsnagIfAllowed() {
        guard let isDoNotTrackEnabled = groupUserDefaults?.bool(forKey: "donottrack"), !isDoNotTrackEnabled else { return }
        
        let config = BugsnagConfiguration.loadConfig()
        config.releaseStage = "watchOS"
        config.addOnSendError { event in
            return true
        }
        Bugsnag.start(with: config)
        Bugsnag.leaveBreadcrumb(withMessage: "Application did finish launching on watchOS.")
        print("[Bugsnag] Initialized for watchOS")
    }

    // MARK: - WCSession Setup

    private func setupWCSession() {
        guard WCSession.isSupported() else {
            print("WCSession is not supported on this device.")
            return
        }
        WCSession.default.delegate = self
        WCSession.default.activate()
        print("WCSession activated for watchOS.")
    }

    // MARK: - WCSessionDelegate Methods

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if let error = error {
            print("WCSession activation error: \(error.localizedDescription)")
        } else {
            print("WCSession activation state: \(activationState.rawValue)")
        }
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        print("Received application context on watchOS:", applicationContext)
        processReceivedData(applicationContext)
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String : Any]) -> Void) {
        print("Received message:", message)
        processReceivedData(message)
        replyHandler(["status": "Message received"])
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        print("WCSession reachability changed. Is reachable: \(session.isReachable)")
    }

    private enum NotificationNames {
        static let dataUpdated = Notification.Name("DataUpdated")
    }

    private func processReceivedData(_ data: [String: Any]) {
        guard !data.isEmpty else {
            print("[WatchConnectivity] Error: Received empty data")
            return
        }
        
        guard let preferredFiatCurrency = data["preferredFiatCurrency"] as? String else {
            print("[WatchConnectivity] Received invalid currency code.")
            return
        }
        
        guard !preferredFiatCurrency.isEmpty, preferredFiatCurrency.count == 3 else {
            print("[WatchConnectivity] Error: Invalid currency code format")
            return
        }
        
        groupUserDefaults?.set(preferredFiatCurrency, forKey: "preferredCurrency")
        updatePreferredFiatCurrency()
        NotificationCenter.default.post(name: NotificationNames.dataUpdated, object: nil)
    }

    // MARK: - Preferred Fiat Currency

    func updatePreferredFiatCurrency() {
        guard let fiatUnit = fetchPreferredFiatUnit() else { return }
        updateMarketData(for: fiatUnit)
    }

    private func fetchPreferredFiatUnit() -> FiatUnit? {
        let currencyCode = groupUserDefaults?.string(forKey: "preferredCurrency") ?? "USD"
        return fiatUnit(for: currencyCode)
    }

    // MARK: - Market Data Update

    private let maxRetryAttempts = 3
    private let retryDelay: TimeInterval = 5

    private func updateMarketData(for fiatUnit: FiatUnit, retryCount: Int = 0, completion: (() -> Void)? = nil) {
        MarketAPI.fetchPrice(currency: fiatUnit.endPointKey) { [weak self] data, error in
            guard let self = self else { return }
            
            if let error = error {
                print("[MarketData] Fetch error: \(error.localizedDescription)")
                if retryCount < self.maxRetryAttempts {
                    print("[MarketData] Retrying in \(self.retryDelay) seconds... (\(retryCount + 1)/\(self.maxRetryAttempts))")
                    DispatchQueue.main.asyncAfter(deadline: .now() + self.retryDelay) {
                        self.updateMarketData(for: fiatUnit, retryCount: retryCount + 1)
                    }
                }
                completion?()
                return
            }

            guard let data = data else {
                print("[MarketData] No data received")
                completion?()
                return
            }

            do {
                let encodedData = try PropertyListEncoder().encode(data)
                self.groupUserDefaults?.set(encodedData, forKey: MarketData.string)
                ExtensionDelegate.reloadComplications()
                completion?()
            } catch {
                print("[MarketData] Encoding error: \(error.localizedDescription)")
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

    // MARK: - Background Refresh

    func scheduleNextBackgroundRefresh() {
        let nextRefreshDate = Date().addingTimeInterval(refreshInterval)
        WKExtension.shared().scheduleBackgroundRefresh(withPreferredDate: nextRefreshDate, userInfo: nil) { error in
            if let error = error {
                print("Background refresh scheduling failed: \(error)")
            } else {
                print("Scheduled background refresh for \(nextRefreshDate).")
            }
        }
    }

    // MARK: - Background Task Handling

    func handle(_ backgroundTasks: Set<WKRefreshBackgroundTask>) {
        for task in backgroundTasks {
            if let backgroundTask = task as? WKApplicationRefreshBackgroundTask {
                handleApplicationRefreshBackgroundTask(backgroundTask)
            } else {
                task.setTaskCompletedWithSnapshot(false)
            }
        }
    }

    private func handleApplicationRefreshBackgroundTask(_ backgroundTask: WKApplicationRefreshBackgroundTask) {
        scheduleNextBackgroundRefresh()

        guard let fiatUnit = fetchPreferredFiatUnit() else {
            backgroundTask.setTaskCompletedWithSnapshot(false)
            return
        }

        updateMarketData(for: fiatUnit)
        backgroundTask.setTaskCompletedWithSnapshot(false)
    }
}
