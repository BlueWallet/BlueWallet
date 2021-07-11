//
//  WidgetAPI.swift
//  TodayExtension
//
//  Created by Marcos Rodriguez on 11/2/19.
//  Copyright © 2019 Facebook. All rights reserved.
//

import Foundation

struct CurrencyError: LocalizedError {
  var errorDescription: String = "Failed to parse response"
}

var numberFormatter: NumberFormatter {
  let formatter = NumberFormatter()
  formatter.numberStyle = .decimal
  formatter.maximumFractionDigits = 0
  formatter.locale = Locale.current
  return formatter
}

class WidgetAPI {
  static func fetchPrice(currency: String, completion: @escaping ((WidgetDataStore?, Error?) -> Void)) {
    let currencyToFiatUnit = fiatUnit(currency: currency)
    guard let source = currencyToFiatUnit?.source, let endPointKey = currencyToFiatUnit?.endPointKey else { return }

    var urlString: String
    switch source {
    case "Yadio":
      urlString = "https://api.yadio.io/json/\(endPointKey)"
    case "BitcoinduLiban":
      urlString = "https://bitcoinduliban.org/api.php?key=lbpusd"
    case "Exir":
      urlString = "https://api.exir.io/v1/ticker?symbol=btc-irt"
    default:
      urlString = "https://api.coindesk.com/v1/bpi/currentprice/\(endPointKey).json"
    }

    guard let url = URL(string:urlString) else { return }

    URLSession.shared.dataTask(with: url) { (data, response, error) in
      guard let dataResponse = data,
            let json = (try? JSONSerialization.jsonObject(with: dataResponse, options: .mutableContainers) as? Dictionary<String, Any>),
            error == nil
      else {
        print(error?.localizedDescription ?? "Response Error")
        completion(nil, error)
        return
      }

      var latestRateDataStore: WidgetDataStore?
      switch source {
      case "Yadio":
        guard let rateDict = json[endPointKey] as? [String: Any],
              let rateDouble = rateDict["price"] as? Double,
              let lastUpdated = json["timestamp"] as? Int
        else { break }
        let unix = Double(lastUpdated / 1_000)
        let lastUpdatedString = ISO8601DateFormatter().string(from: Date(timeIntervalSince1970: unix))
        latestRateDataStore = WidgetDataStore(rate: String(rateDouble), lastUpdate: lastUpdatedString, rateDouble: rateDouble)
      case "BitcoinduLiban":
        guard let rateString = json["BTC/LBP"] as? String else { break }
        guard let rateDouble = Double(rateString) else { break }
        let lastUpdatedString = ISO8601DateFormatter().string(from: Date())
        latestRateDataStore = WidgetDataStore(rate: rateString, lastUpdate: lastUpdatedString, rateDouble: rateDouble)
      case "Exir":
        guard let rateDouble = json["last"] as? Double else { break }
        let rateString = String(rateDouble)
        let lastUpdatedString = ISO8601DateFormatter().string(from: Date())
        latestRateDataStore = WidgetDataStore(rate: rateString, lastUpdate: lastUpdatedString, rateDouble: rateDouble)
      default:
        guard let bpi = json["bpi"] as? Dictionary<String, Any>,
              let preferredCurrency = bpi[endPointKey] as? Dictionary<String, Any>,
              let rateString = preferredCurrency["rate"] as? String,
              let rateDouble = preferredCurrency["rate_float"] as? Double,
              let time = json["time"] as? Dictionary<String, Any>,
              let lastUpdatedString = time["updatedISO"] as? String
        else { break }
        latestRateDataStore = WidgetDataStore(rate: rateString, lastUpdate: lastUpdatedString, rateDouble: rateDouble)
      }

      if (latestRateDataStore == nil) {
        completion(nil, CurrencyError())
        return
      }

      completion(latestRateDataStore, nil)
    }.resume()
  }

  static func getUserPreferredCurrency() -> String {

    guard let userDefaults = UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue),
          let preferredCurrency = userDefaults.string(forKey: "preferredCurrency")
    else {
      return "USD"
    }

    if preferredCurrency != WidgetAPI.getLastSelectedCurrency() {
      UserDefaults.standard.removeObject(forKey: WidgetData.WidgetCachedDataStoreKey)
      UserDefaults.standard.removeObject(forKey: WidgetData.WidgetDataStoreKey)
      UserDefaults.standard.synchronize()
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
    guard let dataStore = UserDefaults.standard.string(forKey: "currency") else {
      return "USD"
    }

    return dataStore
  }

  static func saveNewSelectedCurrency() {
    UserDefaults.standard.setValue(WidgetAPI.getUserPreferredCurrency(), forKey: "currency")
  }

}
