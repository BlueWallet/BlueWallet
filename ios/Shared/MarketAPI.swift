//
//  MarketAPI.swift
//
//  Created by Marcos Rodriguez on 11/2/19.
//

//

import Foundation

class MarketAPI {

    private static let rateClient = WidgetRateAPIClient.live

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

    private static func buildRateSourceOrder(primary: String, endPointKey: String) -> [String] {
        var order = [primary]
        for fallback in universalFallbacks {
            if fallback == primary { continue }
            if !canUseRateSource(source: fallback, endPointKey: endPointKey) { continue }
            order.append(fallback)
        }
        return order
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
                try Task.checkCancellation()
                let result = try await rateClient.fetch(source: source, currency: endPointKey)
                return WidgetDataStore(
                    rate: String(result.rate),
                    lastUpdate: ISO8601DateFormatter().string(from: result.lastUpdate),
                    rateDouble: result.rate
                )
            } catch {
                if error is CancellationError { throw error }
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
