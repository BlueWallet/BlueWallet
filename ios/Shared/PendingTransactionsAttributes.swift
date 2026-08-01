#if canImport(ActivityKit) && os(iOS) && !targetEnvironment(macCatalyst)
import ActivityKit
import Foundation

@available(iOS 16.1, *)
struct PendingTransactionsAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        let pendingTransactionCount: Int
        let totalPendingSats: Int64
        let lastUpdated: Date
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
        now: Date = Date()
    ) -> PendingTransactionsAttributes.ContentState? {
        guard pendingTransactionCount.isFinite, totalPendingSats.isFinite else { return nil }

        let normalizedCount = max(0, pendingTransactionCount.rounded(.towardZero))
        let normalizedSats = max(0, totalPendingSats.rounded())
        guard normalizedCount <= Double(Int.max), normalizedSats <= Double(Int64.max) else { return nil }

        return PendingTransactionsAttributes.ContentState(
            pendingTransactionCount: Int(normalizedCount),
            totalPendingSats: Int64(normalizedSats),
            lastUpdated: now
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
#endif
