//
//  ExtensionDelegate.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 3/6/19.
//

import WatchKit
import ClockKit
import Bugsnag

class ExtensionDelegate: NSObject, WKExtensionDelegate {
  
  let groupUserDefaults = UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue)

  func applicationDidFinishLaunching() {
    scheduleNextReload()
    updatePreferredFiatCurrency()
    
    // Initialize Bugsnag based on user preference
    if let isDoNotTrackEnabled = groupUserDefaults?.bool(forKey: "donottrack"), !isDoNotTrackEnabled {
      Bugsnag.start()
    }
  }
  
  func updatePreferredFiatCurrency() {
    guard let fiatUnitUserDefaults = fetchPreferredFiatUnit() else { return }
    updateMarketData(for: fiatUnitUserDefaults)
  }
  
  private func fetchPreferredFiatUnit() -> FiatUnit? {
    // Fetch the preferred fiat currency unit from user defaults, default to USD
    if let preferredFiatCurrency = groupUserDefaults?.string(forKey: "preferredCurrency"),
       let preferredFiatUnit = fiatUnit(currency: preferredFiatCurrency) {
      return preferredFiatUnit
    } else {
      return fiatUnit(currency: "USD")
    }
  }
  
  private func updateMarketData(for fiatUnit: FiatUnit) {
    MarketAPI.fetchPrice(currency: fiatUnit.endPointKey) { (data, error) in
      guard let data = data, let encodedData = try? PropertyListEncoder().encode(data) else {
        print("Failed to fetch market data or encode it: \(String(describing: error))")
        return
      }
      
      // Store the market data in user defaults
      let groupUserDefaults = UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue)
      groupUserDefaults?.set(encodedData, forKey: MarketData.string)
      groupUserDefaults?.synchronize()
      
      // Reload complications to reflect the updated market data
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
    // Calculate the next reload time (every 10 minutes)
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
}
