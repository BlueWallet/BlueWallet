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

    static func fetchNextBlockFee() async throws -> MarketData {
        let client = SwiftTCPClient(hosts: hardcodedPeers)
        defer {
            client.close()
            print("Closed SwiftTCPClient connection.") 
        }

        guard await client.connectToNextAvailable(validateCertificates: false) else {
            print("Failed to connect to any Electrum peer.") 
            throw APIError()
        }

        let message = "{\"id\": 1, \"method\": \"mempool.get_fee_histogram\", \"params\": []}\n"
        guard let data = message.data(using: .utf8) else {
            print("Failed to encode message to data.") 
            throw APIError()
        }

        print("Sending fee histogram request: \(message)") 

        guard await client.send(data: data) else {
            print("Failed to send fee histogram request.") 
            throw APIError()
        }

        do {
            let receivedData = try await client.receive()
            print("Received data: \(receivedData)") 

            guard let json = try JSONSerialization.jsonObject(with: receivedData, options: .allowFragments) as? [String: AnyObject],
                  let feeHistogram = json["result"] as? [[Double]] else {
                print("Invalid JSON structure in response.") 
                throw APIError()
            }

            let fastestFee = calcEstimateFeeFromFeeHistogram(numberOfBlocks: 1, feeHistogram: feeHistogram)
            print("Calculated fastest fee: \(fastestFee)") 
            return MarketData(nextBlock: String(format: "%.0f", fastestFee), sats: "0", price: "0", rate: 0, dateString: "")
        } catch {
            print("Error during fetchNextBlockFee: \(error.localizedDescription)") 
            throw APIError()
        }
    }

    static func fetchMarketData(currency: String) async throws -> MarketData {
        var marketDataEntry = MarketData(nextBlock: "...", sats: "...", price: "...", rate: 0)
        
        do {
            if let priceResult = try await fetchPrice(currency: currency) {
                marketDataEntry.rate = priceResult.rateDouble
                let formatter = NumberFormatter()
                formatter.numberStyle = .currency
                formatter.currencyCode = currency
                formatter.locale = Locale(identifier: fiatUnit(currency: currency)?.locale ?? Currency.getUserPreferredCurrencyLocale())
                formatter.maximumFractionDigits = 0
                marketDataEntry.price = formatter.string(from: NSNumber(value: priceResult.rateDouble)) ?? priceResult.rate
                marketDataEntry.dateString = priceResult.lastUpdate
                print("Fetched price data: rateDouble=\(priceResult.rateDouble), formattedRate=\(priceResult.formattedRate ?? "nil")") 
            }
        } catch {
            print("Error fetching price: \(error.localizedDescription)")
        }

        do {
            let nextBlockData = try await fetchNextBlockFee()
            marketDataEntry.nextBlock = nextBlockData.nextBlock
            print("Fetched next block fee data: nextBlock=\(nextBlockData.nextBlock)")
        } catch {
            print("Error fetching next block fee: \(error.localizedDescription)") 
            marketDataEntry.nextBlock = "!"
        }

        guard marketDataEntry.rate.isFinite, marketDataEntry.rate > 0 else {
            throw APIError(errorDescription: "No valid market price available.")
        }
        marketDataEntry.sats = numberFormatter.string(from: NSNumber(value: 100000000 / marketDataEntry.rate)) ?? "..."
        print("Calculated sats: \(marketDataEntry.sats)") 
        
        return marketDataEntry
    }

    static func fetchMarketData(currency: String, completion: @escaping (Result<MarketData, Error>) -> ()) {
        Task {
            do {
                let marketData = try await fetchMarketData(currency: currency)
                completion(.success(marketData))
            } catch {
                completion(.failure(error))
            }
        }
    }
}

