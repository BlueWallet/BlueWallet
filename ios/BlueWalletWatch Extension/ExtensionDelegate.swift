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
            Bugsnag.start()
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
        // Update app settings or UI based on the received data
        if let preferredFiatCurrency = data["preferredFiatCurrency"] as? String {
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
              let fiatUnit = fiatUnit(currency: currencyCode) else {
            return fiatUnit(currency: "USD") // Default to USD if no preference is found
        }
        return fiatUnit
    }
    
    // MARK: - Market Data Update
    
    private func updateMarketData(for fiatUnit: FiatUnit) {
        MarketAPI.fetchPrice(currency: fiatUnit.endPointKey) { [weak self] data, error in
            guard let self = self, let data = data else {
                print("Error fetching market data: \(String(describing: error))")
                return
            }
            
            if let encodedData = try? PropertyListEncoder().encode(data) {
                self.groupUserDefaults?.set(encodedData, forKey: MarketData.string)
                self.groupUserDefaults?.synchronize()
                ExtensionDelegate.reloadComplications()
            } else {
                print("Failed to encode market data for UserDefaults.")
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
