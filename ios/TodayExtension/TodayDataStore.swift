//
//  TodayDataStore.swift
//  TodayExtension
//
//  Created by Marcos Rodriguez on 11/3/19.
//  Copyright © 2019 Facebook. All rights reserved.
//

import Foundation

struct TodayDataStore {
  let rate: String
  let lastUpdate: String
  
  var formattedDate: String? {
    let isoDateFormatter = ISO8601DateFormatter()
    let dateFormatter = DateFormatter()
    dateFormatter.timeStyle = .short
    dateFormatter.dateStyle = .short
    
    if let date = isoDateFormatter.date(from: lastUpdate) {
      return dateFormatter.string(from: date)
    }
    return nil
  }
  
  var rateDoubleValue: Double? {
    let rateDigits = rate.replacingOccurrences(of: ",", with: "");
    let numberFormatter = NumberFormatter()
    numberFormatter.numberStyle = .decimal
    numberFormatter.maximumFractionDigits = 2
    numberFormatter.minimumFractionDigits = 2
    
    if let rateDoubleValue =  numberFormatter.number(from: rateDigits) {
      return rateDoubleValue.doubleValue
    }
    
    return nil
  }
  
  var formattedRate: String? {
    let rateDigits = rate.replacingOccurrences(of: ",", with: "");
    let numberFormatter = NumberFormatter()
    numberFormatter.numberStyle = .decimal
    numberFormatter.maximumFractionDigits = 2
    numberFormatter.minimumFractionDigits = 2
    if let rateNumber = numberFormatter.number(from: rateDigits) {
      numberFormatter.numberStyle = .currency
      numberFormatter.locale = Locale(identifier: API.getUserPreferredCurrencyLocale())
      return numberFormatter.string(from: rateNumber);
    }
    return nil
  }
}

class TodayData {
  
  static let TodayDataStoreKey = "TodayDataStoreKey"
  static let TodayCachedDataStoreKey = "TodayCachedDataStoreKey"
  
  static func savePriceRateAndLastUpdate(rate: String, lastUpdate: String) {    
    UserDefaults.standard.setValue(["rate": rate, "lastUpdate": lastUpdate], forKey: TodayDataStoreKey)
    UserDefaults.standard.synchronize()
  }
  
  static func getPriceRateAndLastUpdate() -> TodayDataStore? {
    guard let dataStore = UserDefaults.standard.value(forKey: TodayDataStoreKey) as? [String: String], let rate = dataStore["rate"], let lastUpdate = dataStore["lastUpdate"] else {
      return nil
    }
    return TodayDataStore(rate: rate, lastUpdate: lastUpdate)
  }
  
  static func saveCachePriceRateAndLastUpdate(rate: String, lastUpdate: String) {
    UserDefaults.standard.setValue(["rate": rate, "lastUpdate": lastUpdate], forKey: TodayCachedDataStoreKey)
    UserDefaults.standard.synchronize()
  }
  
  static func getCachedPriceRateAndLastUpdate() -> TodayDataStore? {
    guard let dataStore = UserDefaults.standard.value(forKey: TodayCachedDataStoreKey) as? [String: String], var rate = dataStore["rate"], let lastUpdate = dataStore["lastUpdate"] else {
      return nil
    }
    rate = rate.replacingOccurrences(of: ",", with: "");
    return TodayDataStore(rate: rate, lastUpdate: lastUpdate)
  }
  
  
  
  
}
