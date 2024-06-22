import WatchKit
import ClockKit
import Bugsnag
import WatchConnectivity
import SwiftData

class ExtensionDelegate: NSObject, WKExtensionDelegate, WCSessionDelegate {
    let context: ModelContext
    
    override init() {
        do {
            context = try ModelContext(ModelContainer(for: Wallet.self, WalletTransaction.self, MarketData.self))
        } catch {
            fatalError("Failed to initialize ModelContext: \(error)")
        }
        super.init()
        let session = WCSession.default
        session.delegate = self
        session.activate()
    }

    func applicationDidFinishLaunching() {
        scheduleNextReload()
        updatePreferredFiatCurrency()
      let isDoNotTrackEnabled = UserDefaults.standard.bool(forKey: WatchDataKeys.donottrack.rawValue)
        if !isDoNotTrackEnabled {
            Bugsnag.start()
        }
    }

    func updatePreferredFiatCurrency() {
        guard let fiatUnitUserDefaults = fetchPreferredFiatUnit() else { return }
        updateMarketData(for: fiatUnitUserDefaults)
    }

    private func fetchPreferredFiatUnit() -> FiatUnit? {
      if let preferredFiatCurrency = UserDefaults.standard.string(forKey: WatchDataKeys.preferredCurrency.rawValue), let preferredFiatUnit = fiatUnit(currency: preferredFiatCurrency) {
            return preferredFiatUnit
        } else {
          return fiatUnit(currency: "USD")
        }
    }

    private func updateMarketData(for fiatUnit: FiatUnit) {
        MarketAPI.fetchPrice(currency: fiatUnit.endPointKey) { (data, error) in
            guard let data = data, let encodedData = try? JSONEncoder().encode(data) else { return }
            UserDefaults.standard.set(encodedData, forKey: WatchDataKeys.preferredCurrency.rawValue)
            ExtensionDelegate.reloadActiveComplications()
        }
    }

    private static func reloadActiveComplications() {
        let server = CLKComplicationServer.sharedInstance()
        for complication in server.activeComplications ?? [] {
            server.reloadTimeline(for: complication)
        }
    }

    func nextReloadTime(after date: Date) -> Date {
        let calendar = Calendar(identifier: .gregorian)
        return calendar.date(byAdding: .minute, value: 10, to: date)!
    }

    func scheduleNextReload() {
        let targetDate = nextReloadTime(after: Date())
        WKExtension.shared().scheduleBackgroundRefresh(
            withPreferredDate: targetDate,
            userInfo: nil,
            scheduledCompletion: { _ in }
        )
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

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if activationState == .activated {
            WatchDataSource.shared.loadWallets()
        }
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String : Any]) {
        processData(data: applicationContext)
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String : Any] = [:]) {
        processData(data: userInfo)
    }

    func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {
        processData(data: message)
    }

    private func processData(data: [String: Any]) {
      if let preferredFiatCurrency = data[WatchDataKeys.preferredFiatCurrency.rawValue] as? String, let preferredFiatCurrencyUnit = fiatUnit(currency: preferredFiatCurrency) {
            Task {
              let marketData = MarketData(nextBlock: "", sats: "", price: "", rate: 0, dateString: "", lastUpdate: nil)
              context.insert(marketData)
                try context.save()
            }
        } else if let isWalletsInitialized = data[WatchDataKeys.isWalletsInitialized.rawValue] as? Bool {
            WatchDataSource.shared.companionWalletsInitialized = isWalletsInitialized
        } else {
            WatchDataSource.shared.processWalletsData(walletsInfo: data)
        }
    }
}
