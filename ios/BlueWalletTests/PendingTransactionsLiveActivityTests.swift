import Foundation
import Testing

#if canImport(ActivityKit) && os(iOS) && !targetEnvironment(macCatalyst)
@Suite("Pending Transactions Live Activity")
struct PendingTransactionsLiveActivityTests {
    @Test("State values are normalized for ActivityKit")
    func stateBuilderNormalizesValues() throws {
        let date = Date(timeIntervalSince1970: 1_700_000_000)
        let state = try #require(
            PendingTransactionsLiveActivityStateBuilder.make(
                pendingTransactionCount: 2.9,
                totalPendingSats: 123_456.6,
                now: date
            )
        )

        #expect(state.pendingTransactionCount == 2)
        #expect(state.totalPendingSats == 123_457)
        #expect(state.lastUpdated == date)
    }

    @Test("Negative bridge values are clamped to zero")
    func stateBuilderClampsNegativeValues() throws {
        let state = try #require(
            PendingTransactionsLiveActivityStateBuilder.make(
                pendingTransactionCount: -2,
                totalPendingSats: -50
            )
        )

        #expect(state.pendingTransactionCount == 0)
        #expect(state.totalPendingSats == 0)
    }

    @Test("Invalid and overflowing bridge values are rejected")
    func stateBuilderRejectsInvalidValues() {
        #expect(
            PendingTransactionsLiveActivityStateBuilder.make(
                pendingTransactionCount: .nan,
                totalPendingSats: 1
            ) == nil
        )
        #expect(
            PendingTransactionsLiveActivityStateBuilder.make(
                pendingTransactionCount: 1,
                totalPendingSats: .infinity
            ) == nil
        )
        #expect(
            PendingTransactionsLiveActivityStateBuilder.make(
                pendingTransactionCount: .greatestFiniteMagnitude,
                totalPendingSats: 1
            ) == nil
        )
    }

    @Test("Lifecycle starts, updates, and ends from pending state")
    func lifecycleActionStartsUpdatesAndEnds() throws {
        let pending = try #require(
            PendingTransactionsLiveActivityStateBuilder.make(
                pendingTransactionCount: 2,
                totalPendingSats: 50_000
            )
        )
        let complete = try #require(
            PendingTransactionsLiveActivityStateBuilder.make(
                pendingTransactionCount: 0,
                totalPendingSats: 0
            )
        )

        #expect(
            PendingTransactionsLiveActivityStateBuilder.action(for: pending, hasActiveActivity: false) == .start
        )
        #expect(
            PendingTransactionsLiveActivityStateBuilder.action(for: pending, hasActiveActivity: true) == .update
        )
        #expect(
            PendingTransactionsLiveActivityStateBuilder.action(for: complete, hasActiveActivity: true) == .end
        )
    }

    @Test("Activity content state round-trips through Codable")
    func contentStateRoundTripsThroughJSON() throws {
        let original = try #require(
            PendingTransactionsLiveActivityStateBuilder.make(
                pendingTransactionCount: 3,
                totalPendingSats: 210_000,
                now: Date(timeIntervalSince1970: 1_700_000_000)
            )
        )

        let data = try JSONEncoder().encode(original)
        let decoded = try JSONDecoder().decode(PendingTransactionsAttributes.ContentState.self, from: data)

        #expect(decoded == original)
    }

    @Test("App Group payloads decode JavaScript ISO dates")
    func appGroupPayloadsDecodeJavaScriptDates() throws {
        let configuration = try #require(
            PendingTransactionsLiveActivityStore.decodeWatchConfiguration(
                #"{"version":1,"isEnabled":true,"scriptHashes":["abc"]}"#
            )
        )
        let snapshot = try #require(
            PendingTransactionsLiveActivityStore.decodeSnapshot(
                #"{"pendingTransactionCount":2,"totalPendingSats":175000,"updatedAt":"2026-07-31T12:34:56.789Z"}"#
            )
        )

        #expect(configuration == PendingTransactionsWatchConfiguration(version: 1, isEnabled: true, scriptHashes: ["abc"]))
        #expect(snapshot.pendingTransactionCount == 2)
        #expect(snapshot.totalPendingSats == 175_000)
        #expect(abs(snapshot.updatedAt.timeIntervalSince1970 - 1_785_501_296.789) < 0.001)
    }

    @Test("Dynamic Island privacy preference defaults to enabled")
    func liveActivityPreferenceDefaultsToEnabled() {
        #expect(PendingTransactionsLiveActivityStore.isLiveActivityEnabled(preferenceValue: nil))
        #expect(PendingTransactionsLiveActivityStore.isLiveActivityEnabled(preferenceValue: "1"))
        #expect(!PendingTransactionsLiveActivityStore.isLiveActivityEnabled(preferenceValue: "0"))
    }

    @Test("Bitcoin parser reads inputs, values, and output scripts")
    func bitcoinParserReadsLegacyTransaction() throws {
        let transaction = try BitcoinTransactionParser.parse(
            hex: "0100000001" + String(repeating: "11", count: 32) +
                "0000000000ffffffff011027000000000000015100000000"
        )

        #expect(transaction.inputs.count == 1)
        #expect(transaction.inputs[0].previousTransactionID == String(repeating: "11", count: 32))
        #expect(transaction.inputs[0].previousOutputIndex == 0)
        #expect(transaction.outputs == [.init(value: 10_000, script: Data([0x51]))])
        #expect(BitcoinTransactionParser.electrumScriptHash(for: Data([0x51])) == "6032c38c0bc0e91e726f1e55e1832e434509001a7aed5cfd881b6ef07215e84a")
    }

    @Test("Bitcoin parser rejects truncated raw transactions")
    func bitcoinParserRejectsTruncatedTransaction() {
        #expect(throws: BitcoinTransactionParserError.self) {
            try BitcoinTransactionParser.parse(hex: "01000000")
        }
    }

    @Test("Native snapshot calculator totals wallet impact from raw Electrum transactions")
    func snapshotCalculatorTotalsRawTransactions() throws {
        let previousTransactionID = String(repeating: "11", count: 32)
        let previousTransaction = "0100000001" + String(repeating: "00", count: 32) +
            "ffffffff00ffffffff01983a000000000000015200000000"
        let pendingTransaction = "0100000001" + previousTransactionID +
            "0000000000ffffffff011027000000000000015100000000"
        let now = Date(timeIntervalSince1970: 1_700_000_000)

        let snapshot = try PendingTransactionsSnapshotCalculator.calculate(
            mempoolTransactionIDs: ["pending"],
            rawTransactions: [
                "pending": pendingTransaction,
                previousTransactionID: previousTransaction,
            ],
            ownedScriptHashes: [BitcoinTransactionParser.electrumScriptHash(for: Data([0x51]))],
            now: now
        )

        #expect(snapshot == PendingTransactionsSharedSnapshot(
            pendingTransactionCount: 1,
            totalPendingSats: 10_000,
            updatedAt: now
        ))
    }
}
#endif
