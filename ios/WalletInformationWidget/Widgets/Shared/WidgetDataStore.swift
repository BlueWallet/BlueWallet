//
//  TodayDataStore.swift
//  TodayExtension
//
//  Created by Marcos Rodriguez on 11/3/19.
//  Copyright © 2019 Facebook. All rights reserved.
//

import Foundation

struct WidgetDataStore {
  let rate: String
  let lastUpdate: String
  
  var rateDoubleValue: Double? {
    let numberFormatter = NumberFormatter()
    numberFormatter.numberStyle = .decimal
    if let rateDoubleValue =  numberFormatter.number(from: rate) {
      return rateDoubleValue.doubleValue
    }
    
    return nil
  }
  
  var formattedRate: String? {
    let numberFormatter = NumberFormatter()
    numberFormatter.locale = Locale(identifier: WidgetAPI.getUserPreferredCurrencyLocale())
    numberFormatter.numberStyle = .decimal
    numberFormatter.maximumFractionDigits = 0
    numberFormatter.minimumFractionDigits = 0
    if let rateNumber = numberFormatter.number(from: rate) {
      numberFormatter.numberStyle = .currency
      return numberFormatter.string(from: rateNumber);
    }
    return rate
  }
}

class WidgetData {
  
  static let WidgetDataStoreKey = "WidgetDataStoreKey"
  static let WidgetCachedDataStoreKey = "WidgetCachedDataStoreKey"
  
  static func savePriceRateAndLastUpdate(rate: String, lastUpdate: String) {    
    UserDefaults.standard.setValue(["rate": rate, "lastUpdate": lastUpdate], forKey: WidgetDataStoreKey)
    UserDefaults.standard.synchronize()
  }
  
  static func getPriceRateAndLastUpdate() -> WidgetDataStore? {
    guard let dataStore = UserDefaults.standard.value(forKey: WidgetDataStoreKey) as? [String: String], let rate = dataStore["rate"], let lastUpdate = dataStore["lastUpdate"] else {
      return nil
    }
    return WidgetDataStore(rate: rate, lastUpdate: lastUpdate)
  }
  
  static func saveCachePriceRateAndLastUpdate(rate: String, lastUpdate: String) {
    UserDefaults.standard.setValue(["rate": rate, "lastUpdate": lastUpdate], forKey: WidgetCachedDataStoreKey)
    UserDefaults.standard.synchronize()
  }
  
  static func getCachedPriceRateAndLastUpdate() -> WidgetDataStore? {
    guard let dataStore = UserDefaults.standard.value(forKey: WidgetCachedDataStoreKey) as? [String: String], var rate = dataStore["rate"], let lastUpdate = dataStore["lastUpdate"] else {
      return nil
    }
    rate = rate.replacingOccurrences(of: ",", with: "");
    return WidgetDataStore(rate: rate, lastUpdate: lastUpdate)
  }
  
  
  
  
}
