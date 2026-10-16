import Foundation
import Testing

@Suite("Widget rate API client")
struct WidgetRateAPIClientTests {
    private let fixedDate = Date(timeIntervalSince1970: 1_700_000_000)

    @Test("Builds a bounded JSON request and decodes Coinbase")
    func fetchesCoinbase() async throws {
        let client = WidgetRateAPIClient(load: { request in
            #expect(request.url?.absoluteString == "https://api.coinbase.com/v2/prices/BTC-USD/spot")
            #expect(request.value(forHTTPHeaderField: "Accept") == "application/json")
            #expect(request.timeoutInterval == 10)
            return (
                Data(#"{"data":{"amount":"67234.50"}}"#.utf8),
                try #require(HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil))
            )
        }, now: { fixedDate })

        let result = try await client.fetch(source: "Coinbase", currency: "usd")

        #expect(result.rate == 67_234.5)
        #expect(result.lastUpdate == fixedDate)
    }

    @Test("Decodes provider timestamps without integer truncation")
    func decodesYadioTimestamp() async throws {
        let client = client(json: #"{"USD":{"price":65000.25},"timestamp":1700000000123}"#)

        let result = try await client.fetch(source: "Yadio", currency: "USD")

        #expect(result.rate == 65_000.25)
        #expect(result.lastUpdate.timeIntervalSince1970 == 1_700_000_000.123)
    }

    @Test("Decodes dynamic Kraken pair responses")
    func decodesKraken() async throws {
        let client = client(json: #"{"error":[],"result":{"XXBTZUSD":{"c":["70123.4","1"]}}}"#)

        let result = try await client.fetch(source: "Kraken", currency: "USD")

        #expect(result.rate == 70_123.4)
    }

    @Test("Rejects unsuccessful HTTP responses before parsing")
    func rejectsHTTPFailure() async {
        let client = WidgetRateAPIClient(load: { request in
            (
                Data(#"{"data":{"amount":"1"}}"#.utf8),
                HTTPURLResponse(url: request.url!, statusCode: 429, httpVersion: nil, headerFields: nil)!
            )
        })

        await #expect(throws: WidgetRateAPIError.self) {
            try await client.fetch(source: "Coinbase", currency: "USD")
        }
    }

    @Test("Rejects zero, negative, and malformed rates")
    func rejectsInvalidRates() async {
        for value in ["0", "-1", "not-a-number"] {
            let client = client(json: "{\"data\":{\"amount\":\"\(value)\"}}")
            await #expect(throws: Error.self) {
                try await client.fetch(source: "Coinbase", currency: "USD")
            }
        }
    }

    @Test("Propagates cancellation")
    func propagatesCancellation() async {
        let client = WidgetRateAPIClient(load: { _ in throw CancellationError() })

        await #expect(throws: CancellationError.self) {
            try await client.fetch(source: "Coinbase", currency: "USD")
        }
    }

    private func client(json: String, statusCode: Int = 200) -> WidgetRateAPIClient {
        WidgetRateAPIClient(load: { request in
            (
                Data(json.utf8),
                HTTPURLResponse(url: request.url!, statusCode: statusCode, httpVersion: nil, headerFields: nil)!
            )
        }, now: { fixedDate })
    }
}
