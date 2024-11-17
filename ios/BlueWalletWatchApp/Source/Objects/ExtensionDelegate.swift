// ExtensionDelegate.swift

import WatchKit
import ClockKit
import Bugsnag

class ExtensionDelegate: NSObject, WKExtensionDelegate {
    
    let groupUserDefaults = UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue)
    
    func applicationDidFinishLaunching() {
        scheduleNextReload()
        updatePreferredFiatCurrency()
        if let isDoNotTrackEnabled = groupUserDefaults?.bool(forKey: "donottrack"), !isDoNotTrackEnabled {
            Bugsnag.start()
        }
    }
    
    func updatePreferredFiatCurrency() {
        guard let fiatUnitUserDefaults = fetchPreferredFiatUnit() else { return }
        updateMarketData(for: fiatUnitUserDefaults)
    }
    
    private func fetchPreferredFiatUnit() -> FiatUnit? {
        if let preferredFiatCurrency = groupUserDefaults?.string(forKey: "preferredCurrency"),
           let preferredFiatUnit = try? FiatUnit.fiatUnit(for:  preferredFiatCurrency) {
            return preferredFiatUnit
        } else {
          return try? FiatUnit(from: "USD" as! Decoder)
        }
    }
    
    private func updateMarketData(for fiatUnit: FiatUnit) {
        MarketAPI.fetchPrice(currency: fiatUnit.endPointKey) { (data, error) in
            guard let data = data, let encodedData = try? PropertyListEncoder().encode(data) else { return }
            self.groupUserDefaults?.set(encodedData, forKey: MarketData.string)
            self.groupUserDefaults?.synchronize()
            ExtensionDelegate.reloadActiveComplications()
        }
    }
    
    private static func reloadActiveComplications() {
        let server = CLKComplicationServer.sharedInstance()
        if let complications = server.activeComplications {
            for complication in complications {
                server.reloadTimeline(for: complication)
            }
        }
    }
    
    func nextReloadTime(after date: Date) -> Date {
        let calendar = Calendar(identifier: .gregorian)
        return calendar.date(byAdding: .minute, value: 10, to: date) ?? date.addingTimeInterval(600)
    }
    
    func scheduleNextReload() {
        let targetDate = nextReloadTime(after: Date())
        WKExtension.shared().scheduleBackgroundRefresh(
            withPreferredDate: targetDate,
            userInfo: nil
        ) { (error) in
            if let error = error {
                print("Background refresh scheduling error: \(error.localizedDescription)")
            }
        }
    }
    
    func handle(_ backgroundTasks: Set<WKRefreshBackgroundTask>) {
        for task in backgroundTasks {
            switch task {
            case let backgroundTask as WKApplicationRefreshBackgroundTask:
                handleApplicationRefreshBackgroundTask(backgroundTask)
            default:
                task.setTaskCompletedWithSnapshot(false)
            }
        }
    }
    
    private func handleApplicationRefreshBackgroundTask(_ backgroundTask: WKApplicationRefreshBackgroundTask) {
        scheduleNextReload()
        guard let fiatUnitUserDefaults = fetchPreferredFiatUnit() else {
            backgroundTask.setTaskCompletedWithSnapshot(false)
            return
        }
        updateMarketData(for: fiatUnitUserDefaults)
        backgroundTask.setTaskCompletedWithSnapshot(false)
    }
}
