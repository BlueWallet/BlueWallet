#if canImport(ActivityKit) && os(iOS) && !targetEnvironment(macCatalyst)
import ActivityKit
import Foundation

@available(iOS 16.1, *)
struct PendingTransactionsAttributes: ActivityAttributes {
    struct FiatQuote: Codable, Hashable {
        let currencyCode: String
        let localeIdentifier: String
        let rate: Double
    }

    struct ContentState: Codable, Hashable {
        let pendingTransactionCount: Int
        let totalPendingSats: Int64
        let lastUpdated: Date
        let fiatQuote: FiatQuote?
    }
}

@available(iOS 16.1, *)
enum PendingTransactionsLiveActivityAction: Equatable {
    case start
    case update
    case end
}

@available(iOS 16.1, *)
enum PendingTransactionsLiveActivityStateBuilder {
    static func make(
        pendingTransactionCount: Double,
        totalPendingSats: Double,
        fiatQuote: PendingTransactionsAttributes.FiatQuote? = nil,
        now: Date = Date()
    ) -> PendingTransactionsAttributes.ContentState? {
        guard pendingTransactionCount.isFinite, totalPendingSats.isFinite else { return nil }

        let normalizedCount = max(0, pendingTransactionCount.rounded(.towardZero))
        let normalizedSats = max(0, totalPendingSats.rounded())
        guard normalizedCount <= Double(Int.max), normalizedSats <= Double(Int64.max) else { return nil }

        return PendingTransactionsAttributes.ContentState(
            pendingTransactionCount: Int(normalizedCount),
            totalPendingSats: Int64(normalizedSats),
            lastUpdated: now,
            fiatQuote: fiatQuote
        )
    }

    static func action(
        for state: PendingTransactionsAttributes.ContentState,
        hasActiveActivity: Bool
    ) -> PendingTransactionsLiveActivityAction {
        if state.pendingTransactionCount == 0 {
            return .end
        }

        return hasActiveActivity ? .update : .start
    }
}

@available(iOS 16.1, *)
enum PendingTransactionsFiatFormatter {
    static func format(
        sats: Int64,
        quote: PendingTransactionsAttributes.FiatQuote?
    ) -> String? {
        guard let quote,
              !quote.currencyCode.isEmpty,
              quote.rate.isFinite,
              quote.rate > 0 else { return nil }

        let bitcoin = Decimal(max(0, sats)) / Decimal(100_000_000)
        let value = NSDecimalNumber(decimal: bitcoin)
            .multiplying(by: NSDecimalNumber(value: quote.rate))

        let formatter = NumberFormatter()
        formatter.locale = Locale(identifier: quote.localeIdentifier)
        formatter.numberStyle = .currency
        formatter.currencyCode = quote.currencyCode
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = value.doubleValue < 0.01 ? 8 : 2

        guard let formatted = formatter.string(from: value) else { return nil }
        return "≈ \(formatted) \(quote.currencyCode)"
    }
}

#if DEBUG
@available(iOS 16.1, *)
struct PendingTransactionsLiveActivityShowcaseStep: Equatable {
    let pendingTransactionCount: Int
    let totalPendingSats: Int64
}

@available(iOS 16.1, *)
enum PendingTransactionsLiveActivityShowcase {
    static let interval: TimeInterval = 5
    static let steps: [PendingTransactionsLiveActivityShowcaseStep] = [
        .init(pendingTransactionCount: 1, totalPendingSats: 0),
        .init(pendingTransactionCount: 1, totalPendingSats: 1),
        .init(pendingTransactionCount: 1, totalPendingSats: 100_000),
        .init(pendingTransactionCount: 2, totalPendingSats: 175_000),
        .init(pendingTransactionCount: 12, totalPendingSats: 123_456_789),
        .init(pendingTransactionCount: 999, totalPendingSats: 2_100_000_000_000_000),
    ]
}
#endif
#endif
