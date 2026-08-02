import Foundation

enum PendingTransactionDirection: String, Codable, Hashable {
    case receiving
    case sending
    case mixed
    case unknown

    static func classify(hasIncoming: Bool, hasOutgoing: Bool) -> PendingTransactionDirection {
        switch (hasIncoming, hasOutgoing) {
        case (true, true):
            return .mixed
        case (true, false):
            return .receiving
        case (false, true):
            return .sending
        case (false, false):
            return .unknown
        }
    }
}

#if canImport(ActivityKit) && os(iOS) && !targetEnvironment(macCatalyst)
import ActivityKit

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
        let direction: PendingTransactionDirection?
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
        direction: PendingTransactionDirection = .unknown,
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
            direction: direction,
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

@available(iOS 16.1, *)
enum PendingTransactionsLocalization {
    static var unconfirmedAmount: String {
        localized(
            "live_activity.label.unconfirmed_amount",
            defaultValue: "Unconfirmed amount"
        )
    }

    static var pendingOnChain: String {
        localized(
            "live_activity.label.pending_onchain",
            defaultValue: "Pending on-chain"
        )
    }

    static var awaitingNetworkConfirmation: String {
        localized(
            "live_activity.status.awaiting_confirmation",
            defaultValue: "Awaiting network confirmation"
        )
    }

    static var compactAccessibilityLabel: String {
        localized(
            "live_activity.accessibility.compact",
            defaultValue: "BlueWallet Bitcoin"
        )
    }

    static func directionLabel(_ direction: PendingTransactionDirection) -> String {
        switch direction {
        case .receiving:
            return localized("live_activity.direction.receiving", defaultValue: "Receiving")
        case .sending:
            return localized("live_activity.direction.sending", defaultValue: "Sending")
        case .mixed:
            return localized("live_activity.direction.mixed", defaultValue: "Receiving and sending")
        case .unknown:
            return localized("live_activity.direction.unknown", defaultValue: "Pending")
        }
    }

    static func compactAccessibilityLabel(direction: PendingTransactionDirection) -> String {
        "\(compactAccessibilityLabel), \(directionLabel(direction))"
    }

    static func pendingDescription(count: Int) -> String {
        localizedCount(
            count,
            singularKey: "live_activity.pending_description.one",
            singularValue: "%lld transaction awaiting confirmation",
            pluralKey: "live_activity.pending_description.other",
            pluralValue: "%lld transactions awaiting confirmation"
        )
    }

    static func pendingCountAccessibilityLabel(count: Int) -> String {
        localizedCount(
            count,
            singularKey: "live_activity.accessibility.pending_count.one",
            singularValue: "%lld pending transaction",
            pluralKey: "live_activity.accessibility.pending_count.other",
            pluralValue: "%lld pending transactions"
        )
    }

    static func lockScreenAccessibilityLabel(
        bitcoinAmount: String,
        count: Int,
        direction: PendingTransactionDirection
    ) -> String {
        let key = count == 1
            ? "live_activity.accessibility.summary.one"
            : "live_activity.accessibility.summary.other"
        let defaultValue = count == 1
            ? "Unconfirmed amount: %1$@ in %2$lld pending transaction"
            : "Unconfirmed amount: %1$@ in %2$lld pending transactions"
        let format = localized(key, defaultValue: defaultValue)
        let summary = String(format: format, locale: .current, bitcoinAmount, Int64(count))
        return "\(directionLabel(direction)). \(summary)"
    }

    private static func localizedCount(
        _ count: Int,
        singularKey: String,
        singularValue: String,
        pluralKey: String,
        pluralValue: String
    ) -> String {
        let format = count == 1
            ? localized(singularKey, defaultValue: singularValue)
            : localized(pluralKey, defaultValue: pluralValue)
        return String(format: format, locale: .current, Int64(count))
    }

    private static func localized(_ key: String, defaultValue: String) -> String {
        NSLocalizedString(
            key,
            tableName: nil,
            bundle: .main,
            value: defaultValue,
            comment: "Pending transactions Live Activity"
        )
    }
}

#if DEBUG
@available(iOS 16.1, *)
struct PendingTransactionsLiveActivityShowcaseStep: Equatable {
    let pendingTransactionCount: Int
    let totalPendingSats: Int64
    let direction: PendingTransactionDirection
}

@available(iOS 16.1, *)
enum PendingTransactionsLiveActivityShowcase {
    static let interval: TimeInterval = 5
    static let steps: [PendingTransactionsLiveActivityShowcaseStep] = [
        .init(pendingTransactionCount: 1, totalPendingSats: 0, direction: .unknown),
        .init(pendingTransactionCount: 1, totalPendingSats: 1, direction: .receiving),
        .init(pendingTransactionCount: 1, totalPendingSats: 100_000, direction: .sending),
        .init(pendingTransactionCount: 2, totalPendingSats: 175_000, direction: .mixed),
        .init(pendingTransactionCount: 12, totalPendingSats: 123_456_789, direction: .receiving),
        .init(pendingTransactionCount: 999, totalPendingSats: 2_100_000_000_000_000, direction: .sending),
    ]
}
#endif
#endif
