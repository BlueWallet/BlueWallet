import WatchKit
import ClockKit
import Bugsnag
import WatchConnectivity

class ExtensionDelegate: NSObject, WKExtensionDelegate, WCSessionDelegate {

    private let groupUserDefaults = UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue)
    private let refreshInterval: TimeInterval = 600 // 10 minutes

    // MARK: - App Lifecycle

    func applicationDidFinishLaunching() {
        print("[AppLifecycle] Application did finish launching.")
        configureAppSettings()
        // Uncomment if Bugsnag tracking is needed
         setupBugsnagIfAllowed()
        setupWCSession()
    }

    private func configureAppSettings() {
        print("[AppSettings] Configuring app settings.")
        scheduleNextBackgroundRefresh()
        updatePreferredFiatCurrency()
    }

  private func setupBugsnagIfAllowed() {
      print("[Bugsnag] Checking if Bugsnag setup is allowed.")
      guard let isDoNotTrackEnabled = groupUserDefaults?.bool(forKey: "donottrack"), !isDoNotTrackEnabled else {
          print("[Bugsnag] Do Not Track is enabled; skipping Bugsnag setup.")
          return
      }

      let config = BugsnagConfiguration.loadConfig()
      config.releaseStage = "watchOS"
      
      // Set deviceUIDCopy as the Bugsnag user ID
      if let deviceUIDCopy = groupUserDefaults?.string(forKey: "deviceUIDCopy") {
          config.setUser(deviceUIDCopy, withEmail: nil, andName: nil)
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
        }
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        print("[WCSession] Received application context on watchOS: \(applicationContext)")
        processReceivedData(applicationContext)
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        print("[WCSession] Received message: \(message)")
        processReceivedData(message)
        replyHandler(["status": "Message received"])
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        print("[WCSession] Reachability changed. Is reachable: \(session.isReachable)")
    }

    private enum NotificationNames {
        static let dataUpdated = Notification.Name("DataUpdated")
    }

    private func processReceivedData(_ data: [String: Any]) {
        print("[DataProcessing] Starting to process received data: \(data)")
        guard !data.isEmpty else {
            print("[DataProcessing] Error: Received empty data.")
            return
        }
        
        guard let preferredFiatCurrency = data["preferredFiatCurrency"] as? String else {
            print("[DataProcessing] Error: Received invalid currency code.")
            return
        }
        
        guard !preferredFiatCurrency.isEmpty, preferredFiatCurrency.count == 3 else {
            print("[DataProcessing] Error: Invalid currency code format.")
            return
        }
        
        print("[DataProcessing] Storing preferred currency: \(preferredFiatCurrency)")
        groupUserDefaults?.set(preferredFiatCurrency, forKey: "preferredCurrency")
        updatePreferredFiatCurrency()
        NotificationCenter.default.post(name: NotificationNames.dataUpdated, object: nil)
    }

    // MARK: - Preferred Fiat Currency

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

    // MARK: - Market Data Update

    private let maxRetryAttempts = 3
    private let retryDelay: TimeInterval = 5

    private func updateMarketData(for fiatUnit: FiatUnit, retryCount: Int = 0, completion: (() -> Void)? = nil) {
        print("[MarketData] Updating market data for fiat unit: \(fiatUnit), Attempt: \(retryCount + 1)")
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
                print("[MarketData] Error: No data received.")
                completion?()
                return
            }

            do {
                let encodedData = try PropertyListEncoder().encode(data)
                self.groupUserDefaults?.set(encodedData, forKey: MarketData.string)
                ExtensionDelegate.reloadComplications()
                print("[MarketData] Market data updated and saved.")
                completion?()
            } catch {
                print("[MarketData] Encoding error: \(error.localizedDescription)")
                completion?()
            }
        }
    }

    private static func reloadComplications() {
        print("[Complications] Reloading complications.")
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
                print("[BackgroundRefresh] Scheduling failed: \(error)")
            } else {
                print("[BackgroundRefresh] Scheduled next refresh for \(nextRefreshDate).")
            }
        }
    }

    // MARK: - Background Task Handling

    func handle(_ backgroundTasks: Set<WKRefreshBackgroundTask>) {
        print("[BackgroundTask] Handling background tasks.")
        for task in backgroundTasks {
            if let backgroundTask = task as? WKApplicationRefreshBackgroundTask {
                print("[BackgroundTask] Handling application refresh task.")
                handleApplicationRefreshBackgroundTask(backgroundTask)
            } else {
                print("[BackgroundTask] Task completed without snapshot.")
                task.setTaskCompletedWithSnapshot(false)
            }
        }
    }

    private func handleApplicationRefreshBackgroundTask(_ backgroundTask: WKApplicationRefreshBackgroundTask) {
        print("[BackgroundTask] Scheduling next background refresh.")
        scheduleNextBackgroundRefresh()

        guard let fiatUnit = fetchPreferredFiatUnit() else {
            print("[BackgroundTask] Error: Failed to fetch fiat unit.")
            backgroundTask.setTaskCompletedWithSnapshot(false)
            return
        }

        updateMarketData(for: fiatUnit)
        backgroundTask.setTaskCompletedWithSnapshot(false)
    }
}
