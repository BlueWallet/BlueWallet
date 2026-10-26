import Foundation

enum WidgetRateAPIError: Error, LocalizedError {
    case invalidURL
    case invalidResponse
    case httpStatus(Int)
    case invalidRate(String)
    case provider(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "The rate provider URL is invalid."
        case .invalidResponse: return "The rate provider returned an invalid response."
        case .httpStatus(let status): return "The rate provider returned HTTP \(status)."
        case .invalidRate(let source): return "The rate provider \(source) returned an invalid rate."
        case .provider(let message): return message
        }
    }
}

struct WidgetRateResult: Equatable {
    let rate: Double
    let lastUpdate: Date
}

struct WidgetRateAPIClient {
    typealias Loader = (URLRequest) async throws -> (Data, URLResponse)

    private let load: Loader
    private let now: () -> Date
    private let decoder = JSONDecoder()

    init(load: @escaping Loader, now: @escaping () -> Date = Date.init) {
        self.load = load
        self.now = now
    }

    static let live: WidgetRateAPIClient = {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.waitsForConnectivity = false
        configuration.timeoutIntervalForRequest = 10
        configuration.timeoutIntervalForResource = 15
        configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
        configuration.httpMaximumConnectionsPerHost = 2
        let session = URLSession(configuration: configuration)
        return WidgetRateAPIClient(load: { request in try await session.data(for: request) })
    }()

    func fetch(source: String, currency: String) async throws -> WidgetRateResult {
        let url = try endpoint(source: source, currency: currency)
        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 10)
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("BlueWallet-Widget", forHTTPHeaderField: "User-Agent")

        let (data, response) = try await load(request)
        guard let response = response as? HTTPURLResponse else { throw WidgetRateAPIError.invalidResponse }
        guard (200...299).contains(response.statusCode) else { throw WidgetRateAPIError.httpStatus(response.statusCode) }

        let result = try decode(data, source: source, currency: currency)
        guard result.rate.isFinite, result.rate > 0 else {
            throw WidgetRateAPIError.invalidRate(source)
        }
        return result
    }

    func endpoint(source: String, currency: String) throws -> URL {
        let currency = currency.uppercased()
        let value: String
        switch source {
        case "Yadio": value = "https://api.yadio.io/json/\(currency)"
        case "YadioConvert": value = "https://api.yadio.io/convert/1/BTC/\(currency)"
        case "Exir": value = "https://api.exir.io/v1/ticker?symbol=btc-irt"
        case "coinpaprika": value = "https://api.coinpaprika.com/v1/tickers/btc-bitcoin?quotes=INR"
        case "Bitstamp": value = "https://www.bitstamp.net/api/v2/ticker/btc\(currency.lowercased())"
        case "Coinbase": value = "https://api.coinbase.com/v2/prices/BTC-\(currency)/spot"
        case "CoinGecko": value = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=\(currency.lowercased())"
        case "Kraken":
            guard let pair = Self.krakenPairs[currency] else {
                throw WidgetRateAPIError.provider("No Kraken BTC pair for \(currency).")
            }
            value = "https://api.kraken.com/0/public/Ticker?pair=\(pair)"
        default: throw WidgetRateAPIError.provider("Unknown rate source: \(source).")
        }
        guard let url = URL(string: value) else { throw WidgetRateAPIError.invalidURL }
        return url
    }

    private func decode(_ data: Data, source: String, currency: String) throws -> WidgetRateResult {
        let currency = currency.uppercased()
        let rate: Double
        let date: Date

        switch source {
        case "Yadio":
            let response = try decoder.decode(YadioResponse.self, from: data)
            guard let price = response.prices[currency]?.price else { throw WidgetRateAPIError.invalidRate(source) }
            rate = price.value
            date = Date(timeIntervalSince1970: TimeInterval(response.timestamp) / 1_000)
        case "YadioConvert":
            let response = try decoder.decode(YadioConvertResponse.self, from: data)
            rate = response.rate.value
            date = Date(timeIntervalSince1970: TimeInterval(response.timestamp) / 1_000)
        case "Exir":
            rate = try decoder.decode(ExirResponse.self, from: data).last.value
            date = now()
        case "Bitstamp":
            rate = try decoder.decode(BitstampResponse.self, from: data).last.value
            date = now()
        case "coinpaprika":
            let response = try decoder.decode(CoinpaprikaResponse.self, from: data)
            guard let price = response.quotes[currency]?.price.value else { throw WidgetRateAPIError.invalidRate(source) }
            rate = price
            date = now()
        case "Coinbase":
            rate = try decoder.decode(CoinbaseResponse.self, from: data).data.amount.value
            date = now()
        case "CoinGecko":
            let response = try decoder.decode(CoinGeckoResponse.self, from: data)
            guard let price = response.bitcoin[currency.lowercased()]?.value else { throw WidgetRateAPIError.invalidRate(source) }
            rate = price
            date = now()
        case "Kraken":
            let response = try decoder.decode(KrakenResponse.self, from: data)
            guard response.error.isEmpty else { throw WidgetRateAPIError.provider(response.error.joined(separator: ", ")) }
            guard let price = response.result.values.first?.close.first?.value else { throw WidgetRateAPIError.invalidRate(source) }
            rate = price
            date = now()
        default: throw WidgetRateAPIError.provider("Unknown rate source: \(source).")
        }

        return WidgetRateResult(rate: rate, lastUpdate: date)
    }

    private static let krakenPairs = [
        "USD": "XXBTZUSD", "EUR": "XXBTZEUR", "GBP": "XXBTZGBP", "CAD": "XXBTZCAD",
        "JPY": "XXBTZJPY", "AUD": "XBTAUD", "CHF": "XBTCHF",
    ]
}

private struct FlexibleDouble: Decodable {
    let value: Double

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let value = try? container.decode(Double.self) { self.value = value; return }
        let string = try container.decode(String.self)
        guard let value = Double(string) else {
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Expected a numeric value.")
        }
        self.value = value
    }
}

private struct DynamicKey: CodingKey {
    let stringValue: String
    let intValue: Int? = nil
    init?(stringValue: String) { self.stringValue = stringValue }
    init?(intValue: Int) { return nil }
}

private struct YadioResponse: Decodable {
    struct Price: Decodable { let price: FlexibleDouble }
    let timestamp: Int64
    let prices: [String: Price]

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: DynamicKey.self)
        timestamp = try container.decode(Int64.self, forKey: DynamicKey(stringValue: "timestamp")!)
        var prices: [String: Price] = [:]
        for key in container.allKeys where key.stringValue != "timestamp" {
            if let price = try? container.decode(Price.self, forKey: key) { prices[key.stringValue.uppercased()] = price }
        }
        self.prices = prices
    }
}

private struct YadioConvertResponse: Decodable { let rate: FlexibleDouble; let timestamp: Int64 }
private struct ExirResponse: Decodable { let last: FlexibleDouble }
private struct BitstampResponse: Decodable { let last: FlexibleDouble }
private struct CoinpaprikaResponse: Decodable {
    struct Quote: Decodable { let price: FlexibleDouble }
    let quotes: [String: Quote]
}
private struct CoinbaseResponse: Decodable {
    struct Price: Decodable { let amount: FlexibleDouble }
    let data: Price
}
private struct CoinGeckoResponse: Decodable { let bitcoin: [String: FlexibleDouble] }
private struct KrakenResponse: Decodable {
    struct Ticker: Decodable {
        let close: [FlexibleDouble]
        enum CodingKeys: String, CodingKey { case close = "c" }
    }
    let error: [String]
    let result: [String: Ticker]
}
