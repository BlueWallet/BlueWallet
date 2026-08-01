import Foundation

struct PendingTransactionsWatchConfiguration: Codable, Equatable {
    let version: Int
    let isEnabled: Bool
    let scriptHashes: [String]

    static let disabled = PendingTransactionsWatchConfiguration(
        version: 1,
        isEnabled: false,
        scriptHashes: []
    )
}

struct PendingTransactionsSharedSnapshot: Codable, Equatable {
    let pendingTransactionCount: Int
    let totalPendingSats: Int64
    let updatedAt: Date

    static func empty(at date: Date = Date()) -> PendingTransactionsSharedSnapshot {
        PendingTransactionsSharedSnapshot(
            pendingTransactionCount: 0,
            totalPendingSats: 0,
            updatedAt: date
        )
    }
}

enum PendingTransactionsLiveActivityStore {
    static let suiteName = "group.io.bluewallet.bluewallet"
    static let enabledKey = "PendingTransactionsLiveActivityEnabled"
    static let snapshotKey = "PendingTransactionsLiveActivitySnapshot"
    static let watchConfigurationKey = "PendingTransactionsLiveActivityWatchConfiguration"
    static let preferredCurrencyKey = UserDefaultsGroupKey.PreferredCurrency.rawValue
    static let preferredCurrencyLocaleKey = UserDefaultsGroupKey.PreferredCurrencyLocale.rawValue
    static let exchangeRatesKey = UserDefaultsGroupKey.ExchangeRates.rawValue

    private static var defaults: UserDefaults? {
        UserDefaults(suiteName: suiteName)
    }

    private static func makeDecoder() -> JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let value = try container.decode(String.self)
            let fractionalFormatter = ISO8601DateFormatter()
            fractionalFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

            if let date = fractionalFormatter.date(from: value) ?? ISO8601DateFormatter().date(from: value) {
                return date
            }
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Invalid ISO 8601 date"
            )
        }
        return decoder
    }

    private static let encoder: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }()

    static func loadWatchConfiguration() -> PendingTransactionsWatchConfiguration {
        guard isLiveActivityEnabled() else { return .disabled }
        guard let json = defaults?.string(forKey: watchConfigurationKey) else { return .disabled }
        guard let configuration = decodeWatchConfiguration(json),
              configuration.version == 1,
              configuration.scriptHashes.allSatisfy(isValidScriptHash) else { return .disabled }
        return configuration
    }

    static func isLiveActivityEnabled() -> Bool {
        isLiveActivityEnabled(preferenceValue: defaults?.string(forKey: enabledKey))
    }

    static func isLiveActivityEnabled(preferenceValue: String?) -> Bool {
        preferenceValue != "0"
    }

    static func loadSnapshot() -> PendingTransactionsSharedSnapshot {
        guard let json = defaults?.string(forKey: snapshotKey) else { return .empty() }
        return decodeSnapshot(json) ?? .empty()
    }

    @available(iOS 16.1, *)
    static func loadFiatQuote() -> PendingTransactionsAttributes.FiatQuote? {
        makeFiatQuote(
            preferredCurrency: defaults?.string(forKey: preferredCurrencyKey),
            preferredLocale: defaults?.string(forKey: preferredCurrencyLocaleKey),
            exchangeRatesJSON: defaults?.string(forKey: exchangeRatesKey)
        )
    }

    @available(iOS 16.1, *)
    static func makeFiatQuote(
        preferredCurrency: String?,
        preferredLocale: String?,
        exchangeRatesJSON: String?
    ) -> PendingTransactionsAttributes.FiatQuote? {
        let currencyCode = preferredCurrency?
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .uppercased() ?? "USD"
        guard !currencyCode.isEmpty,
              currencyCode.count <= 12,
              currencyCode.unicodeScalars.allSatisfy(CharacterSet.alphanumerics.contains),
              let exchangeRatesJSON,
              let data = exchangeRatesJSON.data(using: .utf8),
              let jsonObject = try? JSONSerialization.jsonObject(with: data),
              let rates = jsonObject as? [String: Any],
              let rawRate = rates["BTC_\(currencyCode)"],
              !(rawRate is Bool),
              let rate = (rawRate as? NSNumber)?.doubleValue,
              rate.isFinite,
              rate > 0 else { return nil }

        let localeIdentifier = preferredLocale?
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "-", with: "_") ?? "en_US"

        return PendingTransactionsAttributes.FiatQuote(
            currencyCode: currencyCode,
            localeIdentifier: localeIdentifier.isEmpty ? "en_US" : localeIdentifier,
            rate: rate
        )
    }

    static func decodeWatchConfiguration(_ json: String) -> PendingTransactionsWatchConfiguration? {
        decode(PendingTransactionsWatchConfiguration.self, from: json)
    }

    static func decodeSnapshot(_ json: String) -> PendingTransactionsSharedSnapshot? {
        decode(PendingTransactionsSharedSnapshot.self, from: json)
    }

    @discardableResult
    static func saveSnapshot(_ snapshot: PendingTransactionsSharedSnapshot) -> Bool {
        guard let data = try? encoder.encode(snapshot),
              let json = String(data: data, encoding: .utf8),
              let defaults else { return false }

        defaults.set(json, forKey: snapshotKey)
        return true
    }

    private static func decode<Value: Decodable>(_ type: Value.Type, from json: String) -> Value? {
        guard let data = json.data(using: .utf8) else { return nil }

        return try? makeDecoder().decode(type, from: data)
    }

    private static func isValidScriptHash(_ scriptHash: String) -> Bool {
        scriptHash.count == 64 && scriptHash.unicodeScalars.allSatisfy {
            ("0"..."9").contains(Character($0)) || ("a"..."f").contains(Character($0))
        }
    }
}
