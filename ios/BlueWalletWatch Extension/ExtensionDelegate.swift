//
//  ExtensionDelegate.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 3/6/19.
//  Copyright © 2019 Facebook. All rights reserved.
//

import WatchKit
import ClockKit

class ExtensionDelegate: NSObject, WKExtensionDelegate {
  
  func applicationDidFinishLaunching() {
    // Perform any final initialization of your application.
    scheduleNextReload()
    ExtensionDelegate.preferredFiatCurrencyChanged()
  }
  
  static func preferredFiatCurrencyChanged() {
    let fiatUnitUserDefaults: FiatUnit
    let groupUserDefaults = UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue)
    if let preferredFiatCurrency = groupUserDefaults?.string(forKey: "preferredFiatCurrency"), let preferredFiatUnit = fiatUnit(currency: preferredFiatCurrency) {
      fiatUnitUserDefaults = preferredFiatUnit
    } else {
      fiatUnitUserDefaults = fiatUnit(currency: "USD")!
    }
    WidgetAPI.fetchPrice(currency: fiatUnitUserDefaults.endPointKey) { (data, error) in
      if let data = data, let encodedData = try? PropertyListEncoder().encode(data) {
        groupUserDefaults?.set(encodedData, forKey: MarketData.string)
        groupUserDefaults?.synchronize()
        let server = CLKComplicationServer.sharedInstance()
        
        for complication in server.activeComplications ?? [] {
          server.reloadTimeline(for: complication)
        }
      }
    }
  }
  
  func nextReloadTime(after date: Date) -> Date {
    let calendar = Calendar(identifier: .gregorian)
    return calendar.date(byAdding: .minute, value: 10, to: date)!
  }
  
  func scheduleNextReload() {
    let targetDate = nextReloadTime(after: Date())
    
    NSLog("ExtensionDelegate: scheduling next update at %@", "\(targetDate)")
    
    WKExtension.shared().scheduleBackgroundRefresh(
      withPreferredDate: targetDate,
      userInfo: nil,
      scheduledCompletion: { _ in }
    )
  }
  
  func reloadActiveComplications() {
    let server = CLKComplicationServer.sharedInstance()
    
    for complication in server.activeComplications ?? [] {
      server.reloadTimeline(for: complication)
    }
  }
  
  
  func applicationDidBecomeActive() {
    // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
  }
  
  func applicationWillResignActive() {
    // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
    // Use this method to pause ongoing tasks, disable timers, etc.
  }
  
  func handle(_ backgroundTasks: Set<WKRefreshBackgroundTask>) {
    for task in backgroundTasks {
      switch task {
        case let backgroundTask as WKApplicationRefreshBackgroundTask:
        NSLog("ExtensionDelegate: handling WKApplicationRefreshBackgroundTask")
        
        scheduleNextReload()
          let fiatUnitUserDefaults: FiatUnit
        if let preferredFiatCurrency = WatchDataSource.shared.groupUserDefaults?.string(forKey: "preferredFiatCurrency"), let preferredFiatUnit = fiatUnit(currency: preferredFiatCurrency) {
            fiatUnitUserDefaults = preferredFiatUnit
          } else {
            fiatUnitUserDefaults = fiatUnit(currency: "USD")!
          }
          WidgetAPI.fetchPrice(currency: fiatUnitUserDefaults.endPointKey) { [weak self] (data, error) in
          if let data = data, let encodedData = try? PropertyListEncoder().encode(data) {
            WatchDataSource.shared.groupUserDefaults?.set(encodedData, forKey: MarketData.string)
            WatchDataSource.shared.groupUserDefaults?.synchronize()
            self?.reloadActiveComplications()
            backgroundTask.setTaskCompletedWithSnapshot(false)
          }
        }
        
      default:
        task.setTaskCompletedWithSnapshot(false)
      }
    }
  }
  
  
  
}
