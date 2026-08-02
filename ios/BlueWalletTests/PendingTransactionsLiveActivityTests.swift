import Foundation
import Testing

#if canImport(ActivityKit) && os(iOS) && !targetEnvironment(macCatalyst)
@Suite("Pending Transactions Live Activity")
struct PendingTransactionsLiveActivityTests {
    @Test("Live Activity localization formats singular and plural English fallbacks")
    func liveActivityLocalizationFallbacks() {
        #expect(PendingTransactionsLocalization.pendingDescription(count: 1) == "1 transaction awaiting confirmation")
        #expect(PendingTransactionsLocalization.pendingDescription(count: 2) == "2 transactions awaiting confirmation")
        #expect(PendingTransactionsLocalization.pendingCountAccessibilityLabel(count: 1) == "1 pending transaction")
        #expect(PendingTransactionsLocalization.pendingCountAccessibilityLabel(count: 2) == "2 pending transactions")
        #expect(
            PendingTransactionsLocalization.lockScreenAccessibilityLabel(
                bitcoinAmount: "0.00175 BTC",
                count: 2,
                direction: .receiving
            ) == "Receiving. Unconfirmed amount: 0.00175 BTC in 2 pending transactions"
        )
    }

    @Test("Electrum connection completion can only be claimed once")
    func electrumConnectionCompletionIsOneShot() async {
        let gate = SwiftTCPClientCompletionGate()
        let claims = await withTaskGroup(of: Bool.self, returning: [Bool].self) { group in
            for _ in 0..<20 {
                group.addTask {
                    gate.claim()
                }
            }

            var results: [Bool] = []
            for await result in group {
                results.append(result)
            }
            return results
        }

        #expect(claims.filter { $0 }.count == 1)
        #expect(claims.filter { !$0 }.count == 19)
    }

    @Test("State values are normalized for ActivityKit")
    func stateBuilderNormalizesValues() throws {
        let date = Date(timeIntervalSince1970: 1_700_000_000)
        let quote = PendingTransactionsAttributes.FiatQuote(
            currencyCode: "USD",
            localeIdentifier: "en_US",
            rate: 67_500
        )
        let state = try #require(
            PendingTransactionsLiveActivityStateBuilder.make(
                pendingTransactionCount: 2.9,
                totalPendingSats: 123_456.6,
                direction: .mixed,
                fiatQuote: quote,
                now: date
            )
        )

        #expect(state.pendingTransactionCount == 2)
        #expect(state.totalPendingSats == 123_457)
        #expect(state.direction == .mixed)
        #expect(state.lastUpdated == date)
        #expect(state.fiatQuote == quote)
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

    @Test("Developer showcase covers every content edge at five-second intervals")
    func showcaseCoversContentEdges() {
        let steps = PendingTransactionsLiveActivityShowcase.steps

        #expect(PendingTransactionsLiveActivityShowcase.interval == 5)
        #expect(steps.map(\.pendingTransactionCount) == [1, 1, 1, 2, 12, 999])
        #expect(steps.contains { $0.totalPendingSats == 0 })
        #expect(steps.contains { $0.totalPendingSats == 1 })
        #expect(steps.contains { $0.totalPendingSats == 2_100_000_000_000_000 })
        #expect(Set(steps.map(\.direction)) == Set(PendingTransactionDirection.allPreviewCases))
        #expect(steps.allSatisfy { $0.pendingTransactionCount > 0 && $0.totalPendingSats >= 0 })
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
        #expect(snapshot.direction == nil)
        #expect(abs(snapshot.updatedAt.timeIntervalSince1970 - 1_785_501_296.789) < 0.001)
    }

    @Test("Preferred fiat quote is validated and formatted from App Group currency data")
    func preferredFiatQuoteIsValidatedAndFormatted() throws {
        let quote = try #require(
            PendingTransactionsLiveActivityStore.makeFiatQuote(
                preferredCurrency: "usd",
                preferredLocale: "en-US",
                exchangeRatesJSON: #"{"BTC_USD":67500,"LAST_UPDATED":1785501296789}"#
            )
        )

        #expect(quote.currencyCode == "USD")
        #expect(quote.localeIdentifier == "en_US")
        #expect(quote.rate == 67_500)

        let formatted = try #require(PendingTransactionsFiatFormatter.format(sats: 175_000, quote: quote))
        #expect(formatted.hasPrefix("≈ "))
        #expect(formatted.contains("118"))
        #expect(formatted.hasSuffix(" USD"))

        #expect(PendingTransactionsLiveActivityStore.makeFiatQuote(
            preferredCurrency: "USD",
            preferredLocale: "en_US",
            exchangeRatesJSON: #"{"BTC_USD":true}"#
        ) == nil)
        #expect(PendingTransactionsLiveActivityStore.makeFiatQuote(
            preferredCurrency: "USD",
            preferredLocale: "en_US",
            exchangeRatesJSON: #"{"BTC_USD":-1}"#
        ) == nil)
    }

    @Test("Dynamic Island privacy preference defaults to enabled")
    func liveActivityPreferenceDefaultsToEnabled() {
        #expect(PendingTransactionsLiveActivityStore.isLiveActivityEnabled(preferenceValue: nil))
        #expect(PendingTransactionsLiveActivityStore.isLiveActivityEnabled(preferenceValue: "1"))
        #expect(!PendingTransactionsLiveActivityStore.isLiveActivityEnabled(preferenceValue: "0"))
    }

    @Test("Only a current watch configuration may publish an Electrum result")
    func refreshPolicyRejectsStaleElectrumResults() {
        let original = PendingTransactionsWatchConfiguration(
            version: 1,
            isEnabled: true,
            scriptHashes: [String(repeating: "a", count: 64)]
        )
        let changed = PendingTransactionsWatchConfiguration(
            version: 1,
            isEnabled: true,
            scriptHashes: [String(repeating: "b", count: 64)]
        )

        #expect(PendingTransactionsLiveActivityRefreshPolicy.canApplyFetchedSnapshot(
            requestedConfiguration: original,
            currentConfiguration: original
        ))
        #expect(!PendingTransactionsLiveActivityRefreshPolicy.canApplyFetchedSnapshot(
            requestedConfiguration: original,
            currentConfiguration: changed
        ))
        #expect(!PendingTransactionsLiveActivityRefreshPolicy.canApplyFetchedSnapshot(
            requestedConfiguration: original,
            currentConfiguration: .disabled
        ))
    }

    @Test("A stale zero fallback cannot end an active Live Activity")
    func refreshPolicyOnlyAppliesPositiveFallbacks() {
        #expect(PendingTransactionsLiveActivityRefreshPolicy.shouldApplyFallback(
            PendingTransactionsSharedSnapshot(
                pendingTransactionCount: 1,
                totalPendingSats: 50_000,
                updatedAt: .now
            )
        ))
        #expect(!PendingTransactionsLiveActivityRefreshPolicy.shouldApplyFallback(.empty()))
    }

    @Test("A foreground zero refresh preserves an existing Live Activity")
    func foregroundZeroRefreshCannotEndActivity() {
        let empty = PendingTransactionsSharedSnapshot.empty()

        #expect(!PendingTransactionsLiveActivityRefreshPolicy.canEndExistingActivity(
            for: empty,
            endExistingActivityOnZero: false
        ))
        #expect(PendingTransactionsLiveActivityRefreshPolicy.canEndExistingActivity(
            for: empty,
            endExistingActivityOnZero: true
        ))
        #expect(PendingTransactionsLiveActivityRefreshPolicy.canEndExistingActivity(
            for: PendingTransactionsSharedSnapshot(
                pendingTransactionCount: 1,
                totalPendingSats: 50_000,
                updatedAt: .now
            ),
            endExistingActivityOnZero: false
        ))

        #expect(!PendingTransactionsLiveActivityRefreshPolicy.shouldEndWhenConfigurationIsUnavailable(
            configuration: .disabled,
            liveActivityPreferenceEnabled: true,
            endExistingActivityOnZero: false
        ))
        #expect(PendingTransactionsLiveActivityRefreshPolicy.shouldEndWhenConfigurationIsUnavailable(
            configuration: .disabled,
            liveActivityPreferenceEnabled: false,
            endExistingActivityOnZero: false
        ))
        #expect(PendingTransactionsLiveActivityRefreshPolicy.shouldEndWhenConfigurationIsUnavailable(
            configuration: PendingTransactionsWatchConfiguration(version: 1, isEnabled: true, scriptHashes: []),
            liveActivityPreferenceEnabled: true,
            endExistingActivityOnZero: false
        ))
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

    @Test("Pending transaction direction classifies native wallet impact")
    func nativeDirectionClassification() {
        #expect(PendingTransactionDirection.classify(hasIncoming: true, hasOutgoing: false) == .receiving)
        #expect(PendingTransactionDirection.classify(hasIncoming: false, hasOutgoing: true) == .sending)
        #expect(PendingTransactionDirection.classify(hasIncoming: true, hasOutgoing: true) == .mixed)
        #expect(PendingTransactionDirection.classify(hasIncoming: false, hasOutgoing: false) == .unknown)
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
            direction: .receiving,
            updatedAt: now
        ))
    }
}

private extension PendingTransactionDirection {
    static let allPreviewCases: [PendingTransactionDirection] = [
        .receiving,
        .sending,
        .mixed,
        .unknown,
    ]
}
#endif
