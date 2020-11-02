//
//  WidgetAPI.swift
//  TodayExtension
//
//  Created by Marcos Rodriguez on 11/2/19.
//  Copyright © 2019 Facebook. All rights reserved.
//

import Foundation
import SwiftSocket

struct APIError: LocalizedError {
  var errorDescription: String = "Failed to fetch Electrum data..."
}

var numberFormatter: NumberFormatter {
  let formatter = NumberFormatter()
  formatter.numberStyle = .decimal
  formatter.maximumFractionDigits = 0
  formatter.locale = Locale.current
  formatter.groupingSeparator = " "
  return formatter
}

class WidgetAPI {
  
  static func fetchNextBlockFee(completion: @escaping ((MarketData?, Error?) -> Void), userElectrumSettings: UserDefaultsElectrumSettings = UserDefaultsGroup.getElectrumSettings()) {
    guard let host = userElectrumSettings.host, let _ = userElectrumSettings.sslPort, let port = userElectrumSettings.port else {
      print("No valid UserDefaultsElectrumSettings found");
      return
    }
    DispatchQueue.global(qos: .background).async {
      let client = TCPClient(address: host, port: port)
      let send =  "{\"id\": 1, \"method\": \"blockchain.estimatefee\", \"params\": [1]}\n"
      switch client.connect(timeout: 1) {
      case .success:
        switch client.send(string: send) {
        case .success:
          guard let data = client.read(1024*10, timeout: 1) else {
            client.close()
            completion(nil, APIError())
            return
          }
          if let response = String(bytes: data, encoding: .utf8), let nextBlockResponse = response.components(separatedBy: #"result":"#).last?.components(separatedBy: ",").first, let nextBlockResponseDouble = Double(nextBlockResponse.trimmingCharacters(in: .whitespacesAndNewlines)) {
            print("Successfully obtained response from Electrum sever")
            print(userElectrumSettings)
            client.close()
            completion(MarketData(nextBlock: String(format: "%.0f", (nextBlockResponseDouble / 1024) * 100000000), sats: "0", price: "0", rate: 0), nil)
          }
        case .failure(let error):
          print(error)
          client.close()
          completion(nil, APIError())
        }
      case .failure(let error):
        print(error)
        client.close()
        if userElectrumSettings.host == DefaultElectrumPeers.last?.host {
          completion(nil, APIError())
        } else if let currentIndex = DefaultElectrumPeers.firstIndex(where: {$0.host == userElectrumSettings.host}) {
            fetchNextBlockFee(completion: completion, userElectrumSettings: DefaultElectrumPeers[DefaultElectrumPeers.index(after: currentIndex)])
        } else {
          if let first = DefaultElectrumPeers.first {
            fetchNextBlockFee(completion: completion, userElectrumSettings: first)
          }
        }
      }
    }
  }
  
  static func fetchMarketData(currency: String, completion: @escaping ((MarketData?, Error?) -> Void)) {
    var marketDataEntry = MarketData(nextBlock: "...", sats: "...", price: "...", rate: 0)
    WidgetAPI.fetchPrice(currency: currency, completion: { (result, error) in
      if let result = result {
        marketDataEntry.rate = result.rateDoubleValue ?? 0
        marketDataEntry.price = result.formattedRate ?? "!"
      }
      WidgetAPI.fetchNextBlockFee { (marketData, error) in
        if let nextBlock = marketData?.nextBlock {
          marketDataEntry.nextBlock = nextBlock
        } else {
          marketDataEntry.nextBlock = "!"
        }
        if let rateDoubleValue = result?.rateDoubleValue {
          marketDataEntry.sats = numberFormatter.string(from:  NSNumber(value: Double(10 / rateDoubleValue) * 10000000)) ?? "!"
        }
        completion(marketDataEntry, nil)
      }
    })
  }
  
  static func fetchPrice(currency: String, completion: @escaping ((WidgetDataStore?, Error?) -> Void)) {
    guard let url = URL(string: "https://api.coindesk.com/v1/bpi/currentPrice/\(currency).json") else {return}
    
    URLSession.shared.dataTask(with: url) { (data, response, error) in
      guard let dataResponse = data,
            let json = ((try? JSONSerialization.jsonObject(with: dataResponse, options: .mutableContainers) as? Dictionary<String, Any>) as Dictionary<String, Any>??),
            error == nil else {
        print(error?.localizedDescription ?? "Response Error")
        completion(nil, error)
        return }
      
      guard let bpi = json?["bpi"] as? Dictionary<String, Any>, let preferredCurrency = bpi[currency] as? Dictionary<String, Any>, let rateString = preferredCurrency["rate"] as? String else {
        print(error?.localizedDescription ?? "Response Error")
        completion(nil, error)
        return }
      let latestRateDataStore = WidgetDataStore(rate: rateString, lastUpdate: "")
      completion(latestRateDataStore, nil)
    }.resume()
  }
  
  static func getUserPreferredCurrency() -> String {
    guard let userDefaults = UserDefaults(suiteName: "group.io.bluewallet.bluewallet"),
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
    guard let userDefaults = UserDefaults(suiteName: "group.io.bluewallet.bluewallet"),
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
