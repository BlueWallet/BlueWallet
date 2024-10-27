//
//  MarketAPI.swift
//
//  Created by Marcos Rodriguez on 11/2/19.
//

//

import Foundation

class MarketAPI {
    
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
        case "CoinGecko":
            return "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=\(endPointKey.lowercased())"
        case "BNR":
            return "https://www.bnr.ro/nbrfxrates.xml"
        case "Kraken":
            return "https://api.kraken.com/0/public/Ticker?pair=XXBTZ\(endPointKey.uppercased())"
        default:
            return "https://api.coindesk.com/v1/bpi/currentprice/\(endPointKey).json"
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
        case "CoinGecko":
            if let bitcoinDict = json["bitcoin"] as? [String: Any],
               let rateDouble = bitcoinDict[endPointKey.lowercased()] as? Double {
                let lastUpdatedString = ISO8601DateFormatter().string(from: Date())
                latestRateDataStore = WidgetDataStore(rate: String(rateDouble), lastUpdate: lastUpdatedString, rateDouble: rateDouble)
                return latestRateDataStore
            } else {
                throw CurrencyError(errorDescription: "Data formatting error for source: \(source)")
            }
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
        case "BNR":
            throw CurrencyError(errorDescription: "BNR data source is not yet implemented")
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
        default:
            throw CurrencyError(errorDescription: "Unsupported data source \(source)")
        }
    }
    
    private static func handleBNRData(data: Data) async throws -> WidgetDataStore? {
        let parser = XMLParser(data: data)
        let delegate = BNRXMLParserDelegate()
        parser.delegate = delegate
        if parser.parse(), let usdToRonRate = delegate.usdRate {
            let coinGeckoUrl = URL(string: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd")!
            let (data, _) = try await URLSession.shared.data(from: coinGeckoUrl)
            if let json = try JSONSerialization.jsonObject(with: data, options: []) as? [String: Any],
               let bitcoinDict = json["bitcoin"] as? [String: Double],
               let btcToUsdRate = bitcoinDict["usd"] {
                let btcToRonRate = btcToUsdRate * usdToRonRate
                let lastUpdatedString = ISO8601DateFormatter().string(from: Date())
                let latestRateDataStore = WidgetDataStore(rate: String(btcToRonRate), lastUpdate: lastUpdatedString, rateDouble: btcToRonRate)
                return latestRateDataStore
            } else {
                throw CurrencyError()
            }
        } else {
            throw CurrencyError(errorDescription: "XML parsing error.")
        }
    }

     
  static func fetchPrice(currency: String) async throws -> WidgetDataStore? {
         let currencyToFiatUnit = fiatUnit(currency: currency)
         guard let source = currencyToFiatUnit?.source, let endPointKey = currencyToFiatUnit?.endPointKey else {
             throw CurrencyError(errorDescription: "Invalid currency unit or endpoint.")
         }

         let urlString = buildURLString(source: source, endPointKey: endPointKey)
         guard let url = URL(string: urlString) else {
             throw CurrencyError(errorDescription: "Invalid URL.")
         }

         return try await fetchData(url: url, source: source, endPointKey: endPointKey)
     }

     private static func fetchData(url: URL, source: String, endPointKey: String, retries: Int = 3) async throws -> WidgetDataStore? {
         do {
             let (data, _) = try await URLSession.shared.data(from: url)
             if source == "BNR" {
                 return try await handleBNRData(data: data)
             } else {
                 return try handleDefaultData(data: data, source: source, endPointKey: endPointKey)
             }
         } catch {
             if retries > 0 {
                 return try await fetchData(url: url, source: source, endPointKey: endPointKey, retries: retries - 1)
             } else {
                 throw error
             }
         }
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
