//
//  MarketAPI+Electrum.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 11/8/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//

import Foundation

struct APIError: LocalizedError {
    var errorDescription: String = "Failed to fetch Electrum data."
}

private struct FeeHistogramResponse: Decodable {
    let result: [[Double]]
}
extension MarketAPI {

    static func fetchNextBlockFee() async throws -> MarketData {
        let client = SwiftTCPClient(hosts: hardcodedPeers)
        defer { client.close() }

        guard await client.connectToNextAvailable(validateCertificates: false) else {
            throw APIError()
        }

        let request = ElectrumRequest(id: 1, method: "mempool.get_fee_histogram", params: [String]())
        let data = try JSONEncoder().encodeElectrumMessage(request)

        guard await client.send(data: data) else {
            throw APIError()
        }

        let receivedData = try await receiveElectrumResponse(
            useStreaming: client.shouldUseStreaming(isLowPowerModeEnabled: ProcessInfo.processInfo.isLowPowerModeEnabled),
            stream: client.messages,
            oneShot: client.receive,
            fallback: { streamError in
                client.close()
                guard await client.connectToNextAvailable(validateCertificates: false),
                      await client.send(data: data) else {
                    throw streamError
                }
                return try await client.receive()
            }
        )
        guard let feeHistogram = try? JSONDecoder().decode(FeeHistogramResponse.self, from: receivedData).result else {
            throw APIError()
        }

        let fastestFee = calcEstimateFeeFromFeeHistogram(numberOfBlocks: 1, feeHistogram: feeHistogram)
        return MarketData(nextBlock: String(format: "%.0f", fastestFee), sats: "0", price: "0", rate: 0, dateString: "")
    }

    static func fetchMarketData(currency: String) async throws -> MarketData {
        var marketDataEntry = MarketData(nextBlock: "...", sats: "...", price: "...", rate: 0)

        async let priceResult = fetchPriceForWidget(currency: currency)
        async let nextBlockResult = fetchNextBlockFeeForWidget()

        if let price = try await priceResult {
            marketDataEntry.rate = price.rateDouble
            marketDataEntry.price = price.formattedRate ?? "!"
        }

        if let nextBlockData = try await nextBlockResult {
            marketDataEntry.nextBlock = nextBlockData.nextBlock
        } else {
            marketDataEntry.nextBlock = "!"
        }

        if marketDataEntry.rate > 0 {
            let sats = (10 / marketDataEntry.rate) * 100_000_000
            marketDataEntry.sats = numberFormatter.string(from: NSNumber(value: sats)) ?? "!"
        } else {
            marketDataEntry.sats = "!"
        }

        return marketDataEntry
    }

    private static func fetchPriceForWidget(currency: String) async throws -> WidgetDataStore? {
        do {
            return try await fetchPrice(currency: currency)
        } catch is CancellationError {
            throw CancellationError()
        } catch {
            return nil
        }
    }

    private static func fetchNextBlockFeeForWidget() async throws -> MarketData? {
        do {
            return try await fetchNextBlockFee()
        } catch is CancellationError {
            throw CancellationError()
        } catch {
            return nil
        }
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

