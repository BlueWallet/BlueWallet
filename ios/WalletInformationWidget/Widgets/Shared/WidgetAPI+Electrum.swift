//
//  WidgetAPI+Electrum.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 11/8/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//


import SwiftSocket

struct APIError: LocalizedError {
  var errorDescription: String = "Failed to fetch Electrum data..."
}

extension WidgetAPI {
  
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
          guard let data = client.read(1024*10, timeout: 1),  let response = String(bytes: data, encoding: .utf8)?.data(using: .utf8) else {
            client.close()
            completion(nil, APIError())
            return
          }
          do {
            if let json = try JSONSerialization.jsonObject(with: response, options: .allowFragments) as? [String: AnyObject], let nextBlockResponseDouble = json["result"] as? Double {
              print("Successfully obtained response from Electrum sever")
              print(userElectrumSettings)
              client.close()
              let marketData = MarketData(nextBlock: String(format: "%.0f", (nextBlockResponseDouble / 1024) * 100000000), sats: "0", price: "0", rate: 0)
              completion(marketData, nil)
            }
          } catch {
            client.close()
            completion(nil, APIError())
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
        marketDataEntry.rate = result.rateDouble
        marketDataEntry.price = result.formattedRate ?? "!"
      }
      WidgetAPI.fetchNextBlockFee { (marketData, error) in
        if let nextBlock = marketData?.nextBlock {
          marketDataEntry.nextBlock = nextBlock
        } else {
          marketDataEntry.nextBlock = "!"
        }
        if let rateDouble = result?.rateDouble {
          marketDataEntry.sats = numberFormatter.string(from:  NSNumber(value: Double(10 / rateDouble) * 10000000)) ?? "!"
        }
        completion(marketDataEntry, nil)
      }
    })
  }
  
}
