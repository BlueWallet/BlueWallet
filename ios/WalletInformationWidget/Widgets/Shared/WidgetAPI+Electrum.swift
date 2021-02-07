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
          guard let data = client.read(1024*10, timeout: 1) else {
            client.close()
            completion(nil, APIError())
            return
          }
          let characterSet = Set("0123456789.")
          if let response = String(bytes: data, encoding: .utf8), let nextBlockResponse = response.components(separatedBy: #"result":"#).last?.components(separatedBy: ",").first, let nextBlockResponseDouble = Double(nextBlockResponse.filter({characterSet.contains($0)}).trimmingCharacters(in: .whitespacesAndNewlines)) {
            print("Successfully obtained response from Electrum sever")
            print(userElectrumSettings)
            client.close()
            let marketData = MarketData(nextBlock: String(format: "%.0f", (nextBlockResponseDouble / 1024) * 100000000), sats: "0", price: "0", rate: 0)
            completion(marketData, nil)
          } else {
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
  
  static func percentile(array: [Double], percentage: Double) -> Double {
    if array.isEmpty {
      return 0
    } else if percentage <= 0 {
      return array.first ?? 0
     } else if percentage >= 1 {
      return array.last ?? 0
    }
    let index = Double(array.count - 1) * percentage
    let lower = Int(floor(index))
    let upper = Int(lower + 1)
    let weight = index.truncatingRemainder(dividingBy: 1)

    if upper >= array.count {
      return array[lower]
      
    };
    return array[lower] * (1 - weight) + array[upper] * weight
  }
  
  static func calcEstimateFeeFromFeeHistorgam(numberOfBlocks: Int, feeHistorgram: [[Int]]) -> Double {
    // first, transforming histogram:
    var totalVsize = 0;
    var histogramToUse =  [[Int]]()
    for history in feeHistorgram {
      let fee = history[0]
      var vsize = history[1]
      var timeToStop = false

      if totalVsize + vsize >= 1000000 * numberOfBlocks {
        vsize = 1000000 * numberOfBlocks - totalVsize; // only the difference between current summarized sige to tip of the block
        timeToStop = true;
      }

      histogramToUse.append([fee, vsize])
      totalVsize = totalVsize + vsize
      if timeToStop {
        break
      }
    }

    // now we have histogram of precisely size for numberOfBlocks.
    // lets spread it into flat array so its easier to calculate percentile:
    var histogramFlat = [Double]()
    for history in histogramToUse {
      let calc = round(Double(history[0]) / 25000)
      histogramFlat.append(contentsOf: [calc])
      
      // division is needed so resulting flat array is not too huge
    }

    
//    histogramFlat = histogramFlat.sorted { $0[ - $1 }
    return round(percentile(array: histogramFlat, percentage: 0.5))
  };
  
}
