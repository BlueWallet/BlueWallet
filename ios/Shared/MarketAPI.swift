//
//  MarketAPI.swift
//
//  Created by Marcos Rodriguez on 11/2/19.
//

//

import Foundation

class MarketAPI {

    private static let krakenBtcFiatPairs: Set<String> = ["USD", "EUR", "GBP", "CAD", "JPY"]
    private static let bitstampFiatPairs: Set<String> = ["USD", "EUR", "GBP"]
    private static let universalFallbacks = ["YadioConvert", "Coinbase", "Kraken", "CoinDesk", "Bitstamp"]

    private static func canUseRateSource(source: String, endPointKey: String) -> Bool {
        let upper = endPointKey.uppercased()
        switch source {
        case "Kraken":
            return krakenBtcFiatPairs.contains(upper)
        case "Bitstamp":
            return bitstampFiatPairs.contains(upper)
        case "BNR":
            return upper == "RON"
        case "Exir":
            return upper == "IRR" || upper == "IRT"
        case "coinpaprika":
            return upper == "INR"
        default:
            return true
        }
    }

    private static func buildRateSourceOrder(primary: String, endPointKey: String) -> [String] {
        var order = [primary]
        for fallback in universalFallbacks {
            if fallback == primary { continue }
            if !canUseRateSource(source: fallback, endPointKey: endPointKey) { continue }
            order.append(fallback)
        }
        return order
    }

    private static func buildURLString(source: String, endPointKey: String) -> String {
        switch source {
        case "Yadio":
            return "https://api.yadio.io/json/\(endPointKey)"
        case "YadioConvert":
            return "https://api.yadio.io/convert/1/BTC/\(endPointKey)"
        case "Exir":
            return "https://api.exir.io/v1/ticker?symbol=btc-irt"
        case "coinpaprika":
            return "https://api.coinpaprika.com/v1/tickers/btc-bitcoin?quotes=INR"
        case "Bitstamp":
            return "https://www.bitstamp.net/api/v2/ticker/btc\(endPointKey.lowercased())"
        case "Coinbase":
            return "https://api.coinbase.com/v2/prices/BTC-\(endPointKey.uppercased())/buy"
        case "BNR":
            return "https://www.bnr.ro/nbrfxrates.xml"
        case "Kraken":
            return "https://api.kraken.com/0/public/Ticker?pair=XXBTZ\(endPointKey.uppercased())"
        default: // CoinDesk
            return "https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=\(endPointKey)"
        }
    }

    private static func handleDefaultData(data: Data, source: String, endPointKey: String) throws -> WidgetDataStore? {
        guard let json = (try? JSONSerialization.jsonObject(with: data, options: [])) as? [String: Any] else {
            throw CurrencyError(errorDescription: "JSON parsing error.")
        }

        return try parseJSONBasedOnSource(json: json, source: source, endPointKey: endPointKey)
    }

    private static func parseJSONBasedOnSource(json: [String: Any], source: String, endPointKey: String) throws -> WidgetDataStore? {
        var latestRateDataStore: WidgetDataStore?

        switch source {
        case "Yadio":
            if let rateDict = json[endPointKey] as? [String: Any],
               let rateDouble = rateDict["price"] as? Double,
               let lastUpdated = rateDict["timestamp"] as? Int {
                let unix = Double(lastUpdated / 1_000)
                let lastUpdatedString = ISO8601DateFormatter().string(from: Date(timeIntervalSince1970: unix))
                latestRateDataStore = WidgetDataStore(rate: String(rateDouble), lastUpdate: lastUpdatedString, rateDouble: rateDouble)
                return latestRateDataStore
            } else {
                throw CurrencyError(errorDescription: "Data formatting error for source: \(source)")
            }
        case "YadioConvert":
            guard let rateDouble = json["rate"] as? Double,
                  let lastUpdated = json["timestamp"] as? Int else {
                throw CurrencyError(errorDescription: "Data formatting error for source: \(source)")
            }
            let unix = Double(lastUpdated / 1_000)
            let lastUpdatedString = ISO8601DateFormatter().string(from: Date(timeIntervalSince1970: unix))
            latestRateDataStore = WidgetDataStore(rate: String(rateDouble), lastUpdate: lastUpdatedString, rateDouble: rateDouble)
            return latestRateDataStore
        case "Exir":
            if let rateDouble = json["last"] as? Double {
                let lastUpdatedString = ISO8601DateFormatter().string(from: Date())
                latestRateDataStore = WidgetDataStore(rate: String(rateDouble), lastUpdate: lastUpdatedString, rateDouble: rateDouble)
                return latestRateDataStore
            } else {
                throw CurrencyError(errorDescription: "Data formatting error for source: \(source)")
            }
        case "Bitstamp":
            if let rateString = json["last"] as? String, let rateDouble = Double(rateString) {
                let lastUpdatedString = ISO8601DateFormatter().string(from: Date())
                latestRateDataStore = WidgetDataStore(rate: rateString, lastUpdate: lastUpdatedString, rateDouble: rateDouble)
                return latestRateDataStore
            } else {
                throw CurrencyError(errorDescription: "Data formatting error for source: \(source)")
            }
        case "coinpaprika":
            if let quotesDict = json["quotes"] as? [String: Any],
               let currencyDict = quotesDict[endPointKey.uppercased()] as? [String: Any],
               let rateDouble = currencyDict["price"] as? Double {
                let rateString = String(rateDouble)
                let lastUpdatedString = ISO8601DateFormatter().string(from: Date())
                latestRateDataStore = WidgetDataStore(rate: rateString, lastUpdate: lastUpdatedString, rateDouble: rateDouble)
                return latestRateDataStore
            } else {
                throw CurrencyError(errorDescription: "Data formatting error for source: \(source)")
            }
        case "Coinbase":
            if let data = json["data"] as? [String: Any],
               let rateString = data["amount"] as? String,
               let rateDouble = Double(rateString) {
                let lastUpdatedString = ISO8601DateFormatter().string(from: Date())
                latestRateDataStore = WidgetDataStore(rate: rateString, lastUpdate: lastUpdatedString, rateDouble: rateDouble)
                return latestRateDataStore
            } else {
                throw CurrencyError(errorDescription: "Data formatting error for source: \(source)")
            }
        case "Kraken":
            if let result = json["result"] as? [String: Any],
               let tickerData = result["XXBTZ\(endPointKey.uppercased())"] as? [String: Any],
               let c = tickerData["c"] as? [String],
               let rateString = c.first,
               let rateDouble = Double(rateString) {
                let lastUpdatedString = ISO8601DateFormatter().string(from: Date())
                latestRateDataStore = WidgetDataStore(rate: rateString, lastUpdate: lastUpdatedString, rateDouble: rateDouble)
                return latestRateDataStore
            } else {
                if let errorMessage = json["error"] as? [String] {
                    throw CurrencyError(errorDescription: "Kraken API error: \(errorMessage.joined(separator: ", "))")
                } else {
                    throw CurrencyError(errorDescription: "Data formatting error for source: \(source)")
                }
            }
        default: // CoinDesk
            if let rateDouble = json[endPointKey.uppercased()] as? Double {
                let lastUpdatedString = ISO8601DateFormatter().string(from: Date())
                latestRateDataStore = WidgetDataStore(rate: String(rateDouble), lastUpdate: lastUpdatedString, rateDouble: rateDouble)
                return latestRateDataStore
            } else {
                throw CurrencyError(errorDescription: "Data formatting error for source: \(source)")
            }
        }
    }

    private static func handleBNRData(data: Data) async throws -> WidgetDataStore? {
        let parser = XMLParser(data: data)
        let delegate = BNRXMLParserDelegate()
        parser.delegate = delegate
        if parser.parse(), let usdToRonRate = delegate.usdRate {
            guard let usdStore = try await fetchPrice(currency: "USD") else {
                throw CurrencyError(errorDescription: "Could not fetch BTC/USD for RON conversion.")
            }
            let btcToUsdRate = usdStore.rateDouble
            guard btcToUsdRate > 0 else {
                throw CurrencyError(errorDescription: "Invalid BTC/USD rate for RON conversion.")
            }
            let btcToRonRate = btcToUsdRate * usdToRonRate
            let lastUpdatedString = ISO8601DateFormatter().string(from: Date())
            let latestRateDataStore = WidgetDataStore(rate: String(btcToRonRate), lastUpdate: lastUpdatedString, rateDouble: btcToRonRate)
            return latestRateDataStore
        } else {
            throw CurrencyError(errorDescription: "XML parsing error.")
        }
    }

    private static func fetchFromSource(source: String, endPointKey: String) async throws -> WidgetDataStore? {
        let urlString = buildURLString(source: source, endPointKey: endPointKey)
        guard let url = URL(string: urlString) else {
            throw CurrencyError(errorDescription: "Invalid URL.")
        }

        let (data, _) = try await URLSession.shared.data(from: url)
        if source == "BNR" {
            return try await handleBNRData(data: data)
        }
        return try handleDefaultData(data: data, source: source, endPointKey: endPointKey)
    }

    static func fetchPrice(currency: String) async throws -> WidgetDataStore? {
        let currencyToFiatUnit = fiatUnit(currency: currency)
        guard let primarySource = currencyToFiatUnit?.source, let endPointKey = currencyToFiatUnit?.endPointKey else {
            throw CurrencyError(errorDescription: "Invalid currency unit or endpoint.")
        }

        let sources = buildRateSourceOrder(primary: primarySource, endPointKey: endPointKey)
        var lastError: Error = CurrencyError(errorDescription: "No data received.")

        for source in sources {
            do {
                if let dataStore = try await fetchFromSource(source: source, endPointKey: endPointKey) {
                    return dataStore
                }
            } catch {
                lastError = error
            }
        }

        throw lastError
    }

    static func fetchPrice(currency: String, completion: @escaping ((WidgetDataStore?, Error?) -> Void)) {
        Task {
            do {
                if let dataStore = try await fetchPrice(currency: currency) {
                    completion(dataStore, nil)
                } else {
                    completion(nil, CurrencyError(errorDescription: "No data received."))
                }
            } catch {
                completion(nil, error)
            }
        }
    }
}
