//
//  ExtensionDelegate.swift
//  BlueWalletWatch Extension
//

import WatchKit
import ClockKit
import Bugsnag
import WatchConnectivity

class ExtensionDelegate: NSObject, WKExtensionDelegate, WCSessionDelegate {
    
    private let groupUserDefaults = UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue)
    private let refreshInterval: TimeInterval = 600 // 10 minutes in seconds

    // MARK: - App Lifecycle
    
    func applicationDidFinishLaunching() {
        configureAppSettings()
        setupBugsnagIfAllowed()
        setupWCSession() // Initialize WCSession
    }
    
    private func configureAppSettings() {
        scheduleNextBackgroundRefresh()
        updatePreferredFiatCurrency()
    }
    
   private func setupBugsnagIfAllowed() {
    if let isDoNotTrackEnabled = groupUserDefaults?.bool(forKey: "donottrack"), !isDoNotTrackEnabled {
        let config = BugsnagConfiguration.loadConfig() // Load the default configuration
        config.releaseStage = "watchOS" // Set release stage specifically for watchOS if needed
        config.addOnSendError { event in
            // Add custom metadata or actions if needed before sending error logs
            return true // Return true to allow the error to be sent
        }
        Bugsnag.start(with: config)
        
        // Capture watchOS specific logs
        Bugsnag.leaveBreadcrumb(withMessage: "Application did finish launching on watchOS.")
        print("[Bugsnag] Initialized with watchOS logging enabled")
    }
}

    // MARK: - WCSession Setup
    
    private func setupWCSession() {
        guard WCSession.isSupported() else {
            print("WCSession is not supported on this device.")
            return
        }
        WCSession.default.delegate = self
        WCSession.default.activate()
        print("Attempting to activate WCSession on watchOS.")
    }
    
    // MARK: - WCSessionDelegate Methods

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if let error = error {
            print("WCSession activation failed with error: \(error.localizedDescription)")
        } else {
            print("WCSession activation state on watchOS: \(activationState.rawValue)")
        }
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        print("Received application context on watchOS:", applicationContext)
        // Process received data
        processReceivedData(applicationContext)
    }
    
    func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String : Any]) -> Void) {
        print("Received message on watchOS:", message)
        // Handle the message and send a reply if necessary
        processReceivedData(message)
        replyHandler(["status": "Message received"])
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        print("WCSession reachability changed. Is reachable: \(session.isReachable)")
    }
    
    private func processReceivedData(_ data: [String: Any]) {
        guard !data.isEmpty else {
            print("[WatchConnectivity] Error: Received empty data")
            return
        }

        if let preferredFiatCurrency = data["preferredFiatCurrency"] as? String {
            guard !preferredFiatCurrency.isEmpty else {
                print("[WatchConnectivity] Error: Received empty currency code")
                return
            }
            groupUserDefaults?.set(preferredFiatCurrency, forKey: "preferredCurrency")
            updatePreferredFiatCurrency()
        }
        
        // Post notification if needed to update the UI
        NotificationCenter.default.post(name: Notification.Name("DataUpdated"), object: nil)
    }

    // MARK: - Preferred Fiat Currency
    
    func updatePreferredFiatCurrency() {
        guard let fiatUnit = fetchPreferredFiatUnit() else { return }
        updateMarketData(for: fiatUnit)
    }
    
    private func fetchPreferredFiatUnit() -> FiatUnit? {
        guard let currencyCode = groupUserDefaults?.string(forKey: "preferredCurrency"),
              let fiatUnit = FiatUnit(currency: currencyCode) else {
            return FiatUnit(currency: "USD") // Default to USD if no preference is found
        }
        return fiatUnit
    }
    
    // MARK: - Market Data Update
    
    private let maxRetryAttempts = 3
    private let retryDelay: TimeInterval = 5

    private func updateMarketData(for fiatUnit: FiatUnit, retryCount: Int = 0) {
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
                return
            }
            
            guard let data = data else {
                print("[MarketData] No data received")
                return
            }
            
            do {
                let encodedData = try PropertyListEncoder().encode(data)
                guard let defaults = self.groupUserDefaults else {
                    print("[MarketData] UserDefaults not available")
                    return
                }
                defaults.set(encodedData, forKey: MarketData.string)
                defaults.synchronize()
                ExtensionDelegate.reloadComplications()
            } catch {
                print("[MarketData] Encoding error: \(error.localizedDescription)")
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
        WKExtension.shared().scheduleBackgroundRefresh(
            withPreferredDate: nextRefreshDate,
            userInfo: nil
        ) { error in
            if let error = error {
                print("Failed to schedule background refresh: \(error)")
            } else {
                print("Scheduled next background refresh for \(nextRefreshDate).")
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
