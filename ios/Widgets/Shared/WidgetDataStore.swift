//
//  TodayDataStore.swift
//  TodayExtension
//
//  Created by Marcos Rodriguez on 11/3/19.
//  Copyright © 2019 Facebook. All rights reserved.
//

import Foundation

extension Numeric {
    
    var abbreviated: String {
      let bytecountFormatter = ByteCountFormatter()
      bytecountFormatter.zeroPadsFractionDigits = true
      bytecountFormatter.countStyle = .decimal
      bytecountFormatter.isAdaptive = false
      let bytesString = bytecountFormatter.string(fromByteCount: (self as! NSNumber).int64Value)
      
        let numericString = bytesString
            .replacingOccurrences(of: "bytes", with: "")
            .replacingOccurrences(of: "B", with: "") // removes B (bytes) in 'KB'/'MB'/'GB'
            .replacingOccurrences(of: "G", with: "B") // replace G (Giga) to just B (billions)
        return numericString.replacingOccurrences(of: " ", with: "")
    }
}

struct WidgetDataStore: Codable {
  let rate: String
  let lastUpdate: String
  let rateDouble: Double
  var formattedRate: String? {
    let numberFormatter = NumberFormatter()
    numberFormatter.locale = Locale(identifier: WidgetAPI.getUserPreferredCurrencyLocale())
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
    numberFormatter.locale = Locale(identifier: WidgetAPI.getUserPreferredCurrencyLocale())
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
    
    return  isoDateFormatter.date(from: lastUpdate)
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

class WidgetData {
  
  static let WidgetDataStoreKey = "WidgetDataStoreKey"
  static let WidgetCachedDataStoreKey = "WidgetCachedDataStoreKey"
  
  static func savePriceRateAndLastUpdate(rate: String, lastUpdate: String) {    
    UserDefaults.standard.setValue(["rate": rate, "lastUpdate": lastUpdate], forKey: WidgetDataStoreKey)
    UserDefaults.standard.synchronize()
  }
  
}
