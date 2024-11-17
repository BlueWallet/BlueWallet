//
//  MarketAPI+ExchangeRate.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 11/17/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//

extension MarketAPI {
  
  
  static func fetchExchangeRateData(currency: String, completion: @escaping ((MarketData?, Error?) -> Void)) {
    var marketDataEntry = MarketData(nextBlock: "...", sats: "...", price: "...", rate: 0)
    MarketAPI.fetchPrice(currency: currency, completion: { (result, error) in
      if let result = result {
        marketDataEntry.rate = result.rateDouble
        marketDataEntry.price = result.formattedRate ?? "!"
      }
        completion(marketDataEntry, nil)
    })}
  }
