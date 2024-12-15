//
//  WidgetDataStore.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 4/14/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//

import Foundation

struct WidgetDataStore: Codable {
  let rate: String
  let lastUpdate: String
  let rateDouble: Double
  var formattedRate: String? {
    let numberFormatter = NumberFormatter()
    numberFormatter.locale = Locale(identifier: Currency.getUserPreferredCurrencyLocale())
    numberFormatter.numberStyle = .currency
    numberFormatter.maximumFractionDigits = 0
    numberFormatter.minimumFractionDigits = 0
    if let rateString = numberFormatter.string(from: NSNumber(value: rateDouble)) {
      return rateString
    }
    return rate
  }
  var formattedRateForSmallComplication: String? {
    return rateDouble.abbreviated
  }
  
  var formattedRateForComplication: String? {
    let numberFormatter = NumberFormatter()
    numberFormatter.locale = Locale(identifier: Currency.getUserPreferredCurrencyLocale())
    numberFormatter.numberStyle = .currency
    numberFormatter.currencySymbol = ""
    if let rateString = numberFormatter.string(from: NSNumber(value: rateDouble)) {
      return rateString
    }
    return rate
  }
  
  var date: Date? {
    let isoDateFormatter = ISO8601DateFormatter()
    let dateFormatter = DateFormatter()
    dateFormatter.locale = Locale.current
    dateFormatter.timeStyle = .short
    
    return isoDateFormatter.date(from: lastUpdate)
  }
  var formattedDate: String? {
    let isoDateFormatter = ISO8601DateFormatter()
    let dateFormatter = DateFormatter()
    dateFormatter.locale = Locale.current
    dateFormatter.timeStyle = .short
    
    if let date = isoDateFormatter.date(from: lastUpdate) {
      return dateFormatter.string(from: date)
    }
    return nil
  }
}


