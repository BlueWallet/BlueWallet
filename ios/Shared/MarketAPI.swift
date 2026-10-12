//
//  MarketAPI.swift
//
//  Created by Marcos Rodriguez on 11/2/19.
//

//

import Foundation

class MarketAPI {

    private static let krakenBtcFiatPairs: [String: String] = [
        "USD": "XXBTZUSD",
        "EUR": "XXBTZEUR",
        "GBP": "XXBTZGBP",
        "CAD": "XXBTZCAD",
        "JPY": "XXBTZJPY",
        "AUD": "XBTAUD",
        "CHF": "XBTCHF",
    ]
    private static let bitstampFiatPairs: Set<String> = ["USD", "EUR", "GBP"]
    /// Our tickers that CoinGecko accepts as vs_currency — from /api/v3/simple/supported_vs_currencies
    private static let coinGeckoFiat: Set<String> = [
        "USD", "AED", "ARS", "AUD", "BDT", "BHD", "BRL", "CAD", "CHF", "CLP", "CNY", "CZK", "DKK", "EUR", "GBP", "HKD", "HUF", "IDR", "ILS", "INR", "JPY",
        "KRW", "KWD", "LKR", "MXN", "MYR", "NGN", "NOK", "NZD", "PHP", "PKR", "PLN", "RUB", "SAR", "SEK", "SGD", "THB", "TRY", "TWD", "UAH", "VND", "ZAR",
    ]
    /// Prefer Kraken over Coinbase when both can serve the ticker.
    /// CoinGecko sits after the exchanges on purpose: the keyless tier is throttled per IP (observed 429 after ~5 calls
    /// in 10 s), so many users behind one NAT would be rate-limited if it were primary. Fine as a last resort.
    private static let universalFallbacks = ["YadioConvert", "Kraken", "Coinbase", "CoinGecko", "Bitstamp"]

    private static func canUseRateSource(source: String, endPointKey: String) -> Bool {
        let upper = endPointKey.uppercased()
        switch source {
        case "Kraken":
            return krakenBtcFiatPairs[upper] != nil
        case "Bitstamp":
            return bitstampFiatPairs.contains(upper)
        case "CoinGecko":
            return coinGeckoFiat.contains(upper)
        case "Exir":
            return upper == "IRR" || upper == "IRT"
        case "coinpaprika":
            return upper == "INR"
        default:
            return true
        }
    }

    private static func krakenPair(for endPointKey: String) -> String? {
        return krakenBtcFiatPairs[endPointKey.uppercased()]
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

    private static func buildURLString(source: String, endPointKey: String) throws -> String {
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
            return "https://api.coinbase.com/v2/prices/BTC-\(endPointKey.uppercased())/spot"
        case "CoinGecko":
            return "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=\(endPointKey.lowercased())"
        case "Kraken":
            guard let pair = krakenPair(for: endPointKey) else {
                throw CurrencyError(errorDescription: "No Kraken BTC pair for \(endPointKey)")
            }
            return "https://api.kraken.com/0/public/Ticker?pair=\(pair)"
        default:
            throw CurrencyError(errorDescription: "Unknown rate source: \(source)")
        }
    }

    private static func handleDefaultData(data: Data, source: String, endPointKey: String) throws -> WidgetDataStore {
        guard let json = (try? JSONSerialization.jsonObject(with: data, options: [])) as? [String: Any] else {
            throw CurrencyError(errorDescription: "JSON parsing error.")
        }

        let store = try parseJSONBasedOnSource(json: json, source: source, endPointKey: endPointKey)
        // Reject 0 / NaN / Inf so a broken provider falls through to the next source instead of ending the chain
        guard store.rateDouble.isFinite, store.rateDouble > 0 else {
            throw CurrencyError(errorDescription: "Invalid rate '\(store.rate)' from source: \(source)")
        }
        return store
    }

    private static func parseJSONBasedOnSource(json: [String: Any], source: String, endPointKey: String) throws -> WidgetDataStore {
        switch source {
        case "Yadio":
            // Yadio puts `timestamp` at the top level, not inside the currency object
            if let rateDict = json[endPointKey] as? [String: Any],
               let rateDouble = rateDict["price"] as? Double,
               let lastUpdated = json["timestamp"] as? Int {
                let unix = Double(lastUpdated / 1_000)
                let lastUpdatedString = ISO8601DateFormatter().string(from: Date(timeIntervalSince1970: unix))
                return WidgetDataStore(rate: String(rateDouble), lastUpdate: lastUpdatedString, rateDouble: rateDouble)
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
            return WidgetDataStore(rate: String(rateDouble), lastUpdate: lastUpdatedString, rateDouble: rateDouble)
        case "Exir":
            if let rateDouble = json["last"] as? Double {
                let lastUpdatedString = ISO8601DateFormatter().string(from: Date())
                return WidgetDataStore(rate: String(rateDouble), lastUpdate: lastUpdatedString, rateDouble: rateDouble)
            } else {
                throw CurrencyError(errorDescription: "Data formatting error for source: \(source)")
            }
        case "Bitstamp":
            if let rateString = json["last"] as? String, let rateDouble = Double(rateString) {
                let lastUpdatedString = ISO8601DateFormatter().string(from: Date())
                return WidgetDataStore(rate: rateString, lastUpdate: lastUpdatedString, rateDouble: rateDouble)
            } else {
                throw CurrencyError(errorDescription: "Data formatting error for source: \(source)")
            }
        case "coinpaprika":
            if let quotesDict = json["quotes"] as? [String: Any],
               let currencyDict = quotesDict[endPointKey.uppercased()] as? [String: Any],
               let rateDouble = currencyDict["price"] as? Double {
                let rateString = String(rateDouble)
                let lastUpdatedString = ISO8601DateFormatter().string(from: Date())
                return WidgetDataStore(rate: rateString, lastUpdate: lastUpdatedString, rateDouble: rateDouble)
            } else {
                throw CurrencyError(errorDescription: "Data formatting error for source: \(source)")
            }
        case "Coinbase":
            if let data = json["data"] as? [String: Any],
               let rateString = data["amount"] as? String,
               let rateDouble = Double(rateString) {
                let lastUpdatedString = ISO8601DateFormatter().string(from: Date())
                return WidgetDataStore(rate: rateString, lastUpdate: lastUpdatedString, rateDouble: rateDouble)
            } else {
                throw CurrencyError(errorDescription: "Data formatting error for source: \(source)")
            }
        case "CoinGecko":
            if let bitcoinDict = json["bitcoin"] as? [String: Any],
               let rateDouble = bitcoinDict[endPointKey.lowercased()] as? Double {
                let lastUpdatedString = ISO8601DateFormatter().string(from: Date())
                return WidgetDataStore(rate: String(rateDouble), lastUpdate: lastUpdatedString, rateDouble: rateDouble)
            } else {
                throw CurrencyError(errorDescription: "Data formatting error for source: \(source)")
            }
        case "Kraken":
            guard let pair = krakenPair(for: endPointKey) else {
                throw CurrencyError(errorDescription: "No Kraken BTC pair for \(endPointKey)")
            }
            if let result = json["result"] as? [String: Any],
               let tickerData = result[pair] as? [String: Any],
               let c = tickerData["c"] as? [String],
               let rateString = c.first,
               let rateDouble = Double(rateString) {
                let lastUpdatedString = ISO8601DateFormatter().string(from: Date())
                return WidgetDataStore(rate: rateString, lastUpdate: lastUpdatedString, rateDouble: rateDouble)
            } else {
                if let errorMessage = json["error"] as? [String] {
                    throw CurrencyError(errorDescription: "Kraken API error: \(errorMessage.joined(separator: ", "))")
                } else {
                    throw CurrencyError(errorDescription: "Data formatting error for source: \(source)")
                }
            }
        default:
            throw CurrencyError(errorDescription: "Unknown rate source: \(source)")
        }
    }

    private static func fetchFromSource(source: String, endPointKey: String) async throws -> WidgetDataStore {
        let urlString = try buildURLString(source: source, endPointKey: endPointKey)
        guard let url = URL(string: urlString) else {
            throw CurrencyError(errorDescription: "Invalid URL.")
        }

        let (data, _) = try await URLSession.shared.data(from: url)
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
                return try await fetchFromSource(source: source, endPointKey: endPointKey)
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
