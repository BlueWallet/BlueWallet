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
        let settings = userElectrumSettings
        let portToUse = settings.sslPort ?? settings.port
        let isSSLSupported = settings.sslPort != nil

        DispatchQueue.global(qos: .background).async {
            let client = SwiftTCPClient()

            defer {
                print("Closing connection to \(String(describing: settings.host)):\(String(describing: portToUse)).")
                client.close()
            }

            guard let host = settings.host, let portToUse = portToUse else { return }

            print("Attempting to connect to \(String(describing: settings.host)):\(portToUse) with SSL supported: \(isSSLSupported).")

            if client.connect(to: host, port: UInt32(portToUse), useSSL: isSSLSupported) {
                print("Successfully connected to \(String(describing: settings.host)):\(portToUse) with SSL:\(isSSLSupported).")
            } else {
                print("Failed to connect to \(String(describing: settings.host)):\(portToUse) with SSL:\(isSSLSupported).")
                completion(nil, APIError())
                return
            }

            let message = "{\"id\": 1, \"method\": \"mempool.get_fee_histogram\", \"params\": []}\n"
            guard let data = message.data(using: .utf8), client.send(data: data) else {
                print("Message sending failed to \(String(describing: settings.host)):\(portToUse) with SSL supported: \(isSSLSupported).")
                completion(nil, APIError())
                return
            }
            print("Message sent successfully to \(String(describing: settings.host)):\(portToUse) with SSL:\(isSSLSupported).")

            do {
                let receivedData = try client.receive()
                print("Data received. Parsing...")
                guard let responseString = String(data: receivedData, encoding: .utf8),
                      let responseData = responseString.data(using: .utf8),
                      let json = try JSONSerialization.jsonObject(with: responseData, options: .allowFragments) as? [String: AnyObject],
                      let feeHistogram = json["result"] as? [[Double]] else {
                    print("Failed to parse response from \(String(describing: settings.host)).")
                    completion(nil, APIError())
                    return
                }

                let fastestFee = calcEstimateFeeFromFeeHistogram(numberOfBlocks: 1, feeHistogram: feeHistogram)
                let marketData = MarketData(nextBlock: String(format: "%.0f", fastestFee), sats: "0", price: "0", rate: 0)
                completion(marketData, nil) // Successfully fetched data, return it
            } catch {
                print("Error receiving data from \(String(describing: settings.host)): \(error.localizedDescription)")
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
