//
//  FiatUnit.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 11/20/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//
import Foundation

typealias FiatUnits = [FiatUnit]
struct FiatUnit: Codable {
  let endPointKey: String
  let symbol: String
  let locale: String
  let dataSource: String?
  let rateKey: String?
  
  var rateURL: URL? {
    if let dataSource = dataSource {
         return URL(string: "\(dataSource)/\(endPointKey)")
       } else {
        return URL(string:"https://api.coindesk.com/v1/bpi/currentprice/\(endPointKey).json");
       }
  }
  func currentRate(json: Dictionary<String, Any>) -> WidgetDataStore? {
    if dataSource == nil {
      guard let bpi = json["bpi"] as? Dictionary<String, Any>, let preferredCurrency = bpi[endPointKey] as? Dictionary<String, Any>, let rateString = preferredCurrency["rate"] as? String, let rateDouble = preferredCurrency["rate_float"] as? Double, let time = json["time"] as? Dictionary<String, Any>, let lastUpdatedString = time["updatedISO"] as? String else {
        return nil
      }
      return WidgetDataStore(rate: rateString, lastUpdate: lastUpdatedString, rateDouble: rateDouble)
  } else {
    guard let rateKey = rateKey, let rateDouble = json[rateKey] as? Double, let lastUpdated = json["timestamp"] as? Int else {
      return nil
    }
    return WidgetDataStore(rate: String(rateDouble), lastUpdate: String(lastUpdated), rateDouble: rateDouble)
    }
  }
}


func fiatUnit(currency: String) -> FiatUnit? {
  guard let file = Bundle.main.path(forResource: "FiatUnits", ofType: "plist") else {
    return nil
  }
  let fileURL: URL = URL(fileURLWithPath: file)
  var fiatUnits: FiatUnits?

  if let data = try? Data(contentsOf: fileURL) {
    let decoder = PropertyListDecoder()
    fiatUnits = try? decoder.decode(FiatUnits.self, from: data)
  }
  return fiatUnits?.first(where: {$0.endPointKey == currency})

}
