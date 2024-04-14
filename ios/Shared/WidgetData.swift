//
//  WidgetData.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 4/14/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//

import Foundation

class WidgetData {
  
  static let WidgetDataStoreKey = "WidgetDataStoreKey"
  static let WidgetCachedDataStoreKey = "WidgetCachedDataStoreKey"
  
  static func savePriceRateAndLastUpdate(rate: String, lastUpdate: String) {
    guard let userDefaults = UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue) else { return }
    userDefaults.setValue(["rate": rate, "lastUpdate": lastUpdate], forKey: WidgetDataStoreKey)
    userDefaults.synchronize()
  }
  
}
