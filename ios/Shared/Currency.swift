//
//  Currency.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 4/14/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//

import Foundation

struct CurrencyError: LocalizedError {
  var errorDescription: String = "Failed to parse response"
}

class Currency {
  
  static func getUserPreferredCurrency() -> String {

    guard let userDefaults = UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue),
          let preferredCurrency = userDefaults.string(forKey: "preferredCurrency")
    else {
      return "USD"
    }

    if preferredCurrency != Currency.getLastSelectedCurrency() {
      if let groupUserDefaults = UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue) {
        groupUserDefaults.removeObject(forKey: WidgetData.WidgetCachedDataStoreKey)
        groupUserDefaults.removeObject(forKey: WidgetData.WidgetDataStoreKey)
        groupUserDefaults.synchronize()
      }
    }

    return preferredCurrency
  }

  static func getUserPreferredCurrencyLocale() -> String {
    guard let userDefaults = UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue),
          let preferredCurrency = userDefaults.string(forKey: "preferredCurrencyLocale")
    else {
      return "en_US"
    }
    return preferredCurrency
  }

  static func getLastSelectedCurrency() -> String {
    guard let userDefaults = UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue), let dataStore = userDefaults.string(forKey: "currency") else {
      return "USD"
    }

    return dataStore
  }

  static func saveNewSelectedCurrency() {
    if let groupUserDefaults = UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue) {
      groupUserDefaults.setValue(Currency.getUserPreferredCurrency(), forKey: "currency")
      groupUserDefaults.synchronize()
    } else {
      UserDefaults.standard.setValue(Currency.getUserPreferredCurrency(), forKey: "currency")
    }
  }

  
}

