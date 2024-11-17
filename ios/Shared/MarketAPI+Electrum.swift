//
//  MarketAPI+Electrum.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 11/8/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//

import Foundation

struct APIError: LocalizedError {
  var errorDescription: String = "Failed to fetch Electrum data..."
}

extension MarketAPI {

  static func fetchNextBlockFee(completion: @escaping ((MarketData?, Error?) -> Void), userElectrumSettings: UserDefaultsElectrumSettings = UserDefaultsGroup.getElectrumSettings()) {
         Task {
             let client = SwiftTCPClient()
             defer {
                 print("Closing connection to \(userElectrumSettings.host ?? "unknown"):\(userElectrumSettings.sslPort ?? userElectrumSettings.port ?? 0).")
                 client.close()
             }

             guard let host = userElectrumSettings.host, let portToUse = userElectrumSettings.sslPort ?? userElectrumSettings.port else {
                 completion(nil, APIError())
                 return
             }

             let isSSLSupported = userElectrumSettings.sslPort != nil
             print("Attempting to connect to \(host):\(portToUse) with SSL supported: \(isSSLSupported).")

             let connected = await client.connect(to: host, port: portToUse, useSSL: isSSLSupported)
             if connected {
                 print("Successfully connected to \(host):\(portToUse) with SSL: \(isSSLSupported).")
             } else {
                 print("Failed to connect to \(host):\(portToUse) with SSL: \(isSSLSupported).")
                 completion(nil, APIError())
                 return
             }

             let message = "{\"id\": 1, \"method\": \"mempool.get_fee_histogram\", \"params\": []}\n"
             guard let data = message.data(using: .utf8), await client.send(data: data) else {
                 print("Message sending failed to \(host):\(portToUse) with SSL supported: \(isSSLSupported).")
                 completion(nil, APIError())
                 return
             }
             print("Message sent successfully to \(host):\(portToUse) with SSL: \(isSSLSupported).")

             do {
                 let receivedData = try await client.receive()
                 print("Data received. Parsing...")
                 guard let responseString = String(data: receivedData, encoding: .utf8),
                       let responseData = responseString.data(using: .utf8),
                       let json = try JSONSerialization.jsonObject(with: responseData, options: .allowFragments) as? [String: AnyObject],
                       let feeHistogram = json["result"] as? [[Double]] else {
                     print("Failed to parse response from \(host).")
                     completion(nil, APIError())
                     return
                 }

                 let fastestFee = calcEstimateFeeFromFeeHistogram(numberOfBlocks: 1, feeHistogram: feeHistogram)
                 let marketData = MarketData(nextBlock: String(format: "%.0f", fastestFee), sats: "0", price: "0", rate: 0, dateString: "")
                 print("Parsed MarketData: \(marketData)")
                 completion(marketData, nil)
             } catch {
                 print("Error receiving data from \(host): \(error.localizedDescription)")
                 completion(nil, APIError())
             }
         }
     }

    static func fetchMarketData(currency: String, completion: @escaping ((MarketData?, Error?) -> Void)) {
        var marketDataEntry = MarketData(nextBlock: "...", sats: "...", price: "...", rate: 0)
        MarketAPI.fetchPrice(currency: currency, completion: { (result, error) in
            if let result = result {
                marketDataEntry.rate = result.rateDouble
                marketDataEntry.price = result.formattedRate ?? "!"
            }
            MarketAPI.fetchNextBlockFee { (marketData, error) in
                if let nextBlock = marketData?.nextBlock {
                    marketDataEntry.nextBlock = nextBlock
                } else {
                    marketDataEntry.nextBlock = "!"
                }
                if let rateDouble = result?.rateDouble {
                    marketDataEntry.sats = numberFormatter.string(from: NSNumber(value: Double(10 / rateDouble) * 10000000)) ?? "!"
                }
                completion(marketDataEntry, nil)
            }
        })
    }
}
