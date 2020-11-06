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
  let rateDouble: Double
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
  
}
