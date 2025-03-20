//
//  ExtensionDelegate.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 3/6/19.
//

import WatchKit
import ClockKit
import Bugsnag
import WatchConnectivity

// WatchKit 2 uses WKExtensionDelegate, not WKApplicationDelegate
class ExtensionDelegate: NSObject, WKExtensionDelegate {
  
  let groupUserDefaults = UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue)

  func applicationDidFinishLaunching() {
    // Initialize WatchDataSource in the application lifecycle
    initializeWCSession()
    
    scheduleNextReload()
    updatePreferredFiatCurrency()
    if let isDoNotTrackEnabled = groupUserDefaults?.bool(forKey: "donottrack"), !isDoNotTrackEnabled {
      Bugsnag.start()
    }
  }
  
  private func initializeWCSession() {
    // Ensure WatchDataSource is initialized and session is started
    WatchDataSource.shared.startSession()
    
    // Log session state for debugging
    if WCSession.isSupported() {
      let session = WCSession.default
      print("WCSession initialized with state: \(session.activationState.rawValue)")
      print("Is WCSession reachable: \(session.isReachable)")
    } else {
      print("WCSession is not supported on this device")
    }
  }
  
  func applicationDidBecomeActive() {
    // Request data when app becomes active
    WatchDataSource.shared.requestDataFromiOS()
  }
  
  func applicationWillResignActive() {
    // Perform any cleanup before app goes inactive
    print("Watch app will resign active")
  }
  
  func updatePreferredFiatCurrency() {
    guard let fiatUnitUserDefaults = fetchPreferredFiatUnit() else { return }
    updateMarketData(for: fiatUnitUserDefaults)
  }
  
  private func fetchPreferredFiatUnit() -> FiatUnit? {
    if let preferredFiatCurrency = groupUserDefaults?.string(forKey: "preferredCurrency"), let preferredFiatUnit = fiatUnit(currency: preferredFiatCurrency) {
      return preferredFiatUnit
    } else {
      return fiatUnit(currency: "USD")
    }
  }
  
  private func updateMarketData(for fiatUnit: FiatUnit) {
    MarketAPI.fetchPrice(currency: fiatUnit.endPointKey) { (data, error) in
      guard let data = data, let encodedData = try? PropertyListEncoder().encode(data) else { return }
      let groupUserDefaults = UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue)
      groupUserDefaults?.set(encodedData, forKey: MarketData.string)
      groupUserDefaults?.synchronize()
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
  
  // Update to use the correct API for scheduling background tasks in WatchKit 2
  func scheduleNextReload() {
    let targetDate = nextReloadTime(after: Date())
    // Use scheduleBackgroundRefresh instead of newer API
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
        case let snapshotTask as WKSnapshotRefreshBackgroundTask:
          // Handle snapshot generation
          snapshotTask.setTaskCompleted(restoredDefaultState: true, estimatedSnapshotExpiration: Date.distantFuture, userInfo: nil)
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
      
      // Request updated wallet data during background refresh
      WatchDataSource.shared.requestDataFromiOS()
      
      backgroundTask.setTaskCompletedWithSnapshot(false)
  }
  
}
