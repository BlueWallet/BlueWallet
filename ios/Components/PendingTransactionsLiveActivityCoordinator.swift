#if canImport(ActivityKit) && canImport(BackgroundTasks) && os(iOS) && !targetEnvironment(macCatalyst)
import ActivityKit
import BackgroundTasks
import Foundation

private actor PendingTransactionsLiveActivityRefreshGate {
    private var latestGeneration: UInt64 = 0

    func begin() -> UInt64 {
        latestGeneration &+= 1
        return latestGeneration
    }

    func isCurrent(_ generation: UInt64) -> Bool {
        generation == latestGeneration
    }
}

@available(iOS 16.1, *)
enum PendingTransactionsLiveActivityRefreshPolicy {
    static func canApplyFetchedSnapshot(
        requestedConfiguration: PendingTransactionsWatchConfiguration,
        currentConfiguration: PendingTransactionsWatchConfiguration
    ) -> Bool {
        requestedConfiguration.isEnabled && requestedConfiguration == currentConfiguration
    }

    static func shouldApplyFallback(_ snapshot: PendingTransactionsSharedSnapshot) -> Bool {
        snapshot.pendingTransactionCount > 0
    }

    static func canEndExistingActivity(
        for snapshot: PendingTransactionsSharedSnapshot,
        endExistingActivityOnZero: Bool
    ) -> Bool {
        snapshot.pendingTransactionCount > 0 || endExistingActivityOnZero
    }

    static func shouldEndWhenConfigurationIsUnavailable(
        configuration: PendingTransactionsWatchConfiguration,
        liveActivityPreferenceEnabled: Bool,
        endExistingActivityOnZero: Bool
    ) -> Bool {
        !liveActivityPreferenceEnabled ||
            (configuration.isEnabled && configuration.scriptHashes.isEmpty) ||
            endExistingActivityOnZero
    }
}

@available(iOS 16.1, *)
enum PendingTransactionsLiveActivityCoordinator {
    static let backgroundTaskIdentifier = "io.bluewallet.bluewallet.pendingLiveActivityRefresh"
    private static let refreshInterval: TimeInterval = 15 * 60
    private static let refreshGate = PendingTransactionsLiveActivityRefreshGate()

    static func registerBackgroundRefresh() {
        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: backgroundTaskIdentifier,
            using: nil
        ) { task in
            guard let refreshTask = task as? BGAppRefreshTask else {
                task.setTaskCompleted(success: false)
                return
            }
            handle(refreshTask)
        }
    }

    static func scheduleBackgroundRefresh() {
        let configuration = PendingTransactionsLiveActivityStore.loadWatchConfiguration()
        let hasActiveActivity = !Activity<PendingTransactionsAttributes>.activities.isEmpty
        guard configuration.isEnabled,
              !configuration.scriptHashes.isEmpty,
              ActivityAuthorizationInfo().areActivitiesEnabled,
              hasActiveActivity else {
            BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: backgroundTaskIdentifier)
            return
        }

        let request = BGAppRefreshTaskRequest(identifier: backgroundTaskIdentifier)
        request.earliestBeginDate = Date(timeIntervalSinceNow: refreshInterval)

        do {
            BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: backgroundTaskIdentifier)
            try BGTaskScheduler.shared.submit(request)
        } catch {
            NSLog("[PendingLiveActivity] Failed to schedule background refresh: \(error.localizedDescription)")
        }
    }

    /// Reconciles an already-visible activity directly from App Group state and
    /// Electrum. This is intentionally called by AppDelegate before React Native
    /// has initialized; it never creates a new activity by itself.
    static func reconcileExistingActivity() {
        guard !Activity<PendingTransactionsAttributes>.activities.isEmpty else {
            scheduleBackgroundRefresh()
            return
        }

        Task {
            _ = await refresh(
                allowStart: false,
                endExistingActivityOnZero: false
            )
        }
    }

    @discardableResult
    static func refresh(
        allowStart: Bool,
        queryElectrum: Bool = true,
        endExistingActivityOnZero: Bool = true
    ) async -> Bool {
        let refreshGeneration = await refreshGate.begin()
        let configuration = PendingTransactionsLiveActivityStore.loadWatchConfiguration()

        guard configuration.isEnabled, !configuration.scriptHashes.isEmpty else {
            guard await refreshGate.isCurrent(refreshGeneration) else { return true }
            // The privacy toggle is explicit user intent and always ends the
            // activity. An empty watch list during foreground initialization is
            // treated as transient and preserved until the native background
            // reconciler can authoritatively resolve it.
            let shouldEndExistingActivity = PendingTransactionsLiveActivityRefreshPolicy
                .shouldEndWhenConfigurationIsUnavailable(
                    configuration: configuration,
                    liveActivityPreferenceEnabled: PendingTransactionsLiveActivityStore.isLiveActivityEnabled(),
                    endExistingActivityOnZero: endExistingActivityOnZero
                )
            await apply(
                snapshot: .empty(),
                allowStart: false,
                endExistingActivityOnZero: shouldEndExistingActivity
            )
            BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: backgroundTaskIdentifier)
            return true
        }

        let hasActiveActivity = !Activity<PendingTransactionsAttributes>.activities.isEmpty
        guard allowStart || hasActiveActivity else {
            BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: backgroundTaskIdentifier)
            return true
        }

        // A positive RN snapshot gives immediate UI while Electrum is queried.
        // A zero snapshot is not allowed to end an existing activity because it
        // may simply be stale; only the native Electrum result may do that.
        let fallbackSnapshot = PendingTransactionsLiveActivityStore.loadSnapshot()
        if PendingTransactionsLiveActivityRefreshPolicy.shouldApplyFallback(fallbackSnapshot) {
            guard await refreshGate.isCurrent(refreshGeneration) else { return true }
            await apply(
                snapshot: fallbackSnapshot,
                allowStart: allowStart,
                endExistingActivityOnZero: endExistingActivityOnZero
            )
        }

        scheduleBackgroundRefresh()
        guard queryElectrum else { return true }

        do {
            let snapshot = try await PendingTransactionsElectrumService().fetchSnapshot(configuration: configuration)

            // RN may have disabled the privacy setting or replaced the public
            // watch list while the network request was in flight. Never publish
            // data fetched for obsolete user intent, and let a newer refresh own
            // the final ActivityKit state when one exists.
            guard !Task.isCancelled else { return false }
            guard await refreshGate.isCurrent(refreshGeneration) else { return true }
            let currentConfiguration = PendingTransactionsLiveActivityStore.loadWatchConfiguration()
            guard PendingTransactionsLiveActivityRefreshPolicy.canApplyFetchedSnapshot(
                requestedConfiguration: configuration,
                currentConfiguration: currentConfiguration
            ) else {
                let currentSnapshot = currentConfiguration.isEnabled && !currentConfiguration.scriptHashes.isEmpty
                    ? PendingTransactionsLiveActivityStore.loadSnapshot()
                    : .empty()
                await apply(
                    snapshot: currentSnapshot,
                    allowStart: allowStart,
                    endExistingActivityOnZero: PendingTransactionsLiveActivityRefreshPolicy
                        .shouldEndWhenConfigurationIsUnavailable(
                            configuration: currentConfiguration,
                            liveActivityPreferenceEnabled: PendingTransactionsLiveActivityStore.isLiveActivityEnabled(),
                            endExistingActivityOnZero: endExistingActivityOnZero
                        )
                )
                scheduleBackgroundRefresh()
                return true
            }

            PendingTransactionsLiveActivityStore.saveSnapshot(snapshot)
            await apply(
                snapshot: snapshot,
                allowStart: allowStart,
                endExistingActivityOnZero: endExistingActivityOnZero
            )
            scheduleBackgroundRefresh()
            return true
        } catch is CancellationError {
            return false
        } catch {
            NSLog("[PendingLiveActivity] Electrum refresh failed: \(error.localizedDescription)")
            return false
        }
    }

    #if DEBUG
    static func preview(
        pendingTransactionCount: Double,
        totalPendingSats: Double,
        direction: PendingTransactionDirection
    ) async {
        // A developer preview owns the visible state and invalidates any native
        // Electrum refresh that was already in flight.
        _ = await refreshGate.begin()
        guard let state = PendingTransactionsLiveActivityStateBuilder.make(
            pendingTransactionCount: pendingTransactionCount,
            totalPendingSats: totalPendingSats,
            direction: direction
        ) else { return }

        let snapshot = PendingTransactionsSharedSnapshot(
            pendingTransactionCount: state.pendingTransactionCount,
            totalPendingSats: state.totalPendingSats,
            direction: state.direction ?? .unknown,
            updatedAt: state.lastUpdated
        )
        await apply(
            snapshot: snapshot,
            allowStart: true,
            endExistingActivityOnZero: true
        )
    }

    static func showcase() async {
        let showcaseGeneration = await refreshGate.begin()

        for (index, step) in PendingTransactionsLiveActivityShowcase.steps.enumerated() {
            guard !Task.isCancelled else { return }
            guard await refreshGate.isCurrent(showcaseGeneration) else { return }

            let snapshot = PendingTransactionsSharedSnapshot(
                pendingTransactionCount: step.pendingTransactionCount,
                totalPendingSats: step.totalPendingSats,
                direction: step.direction,
                updatedAt: .now
            )
            await apply(
                snapshot: snapshot,
                allowStart: true,
                endExistingActivityOnZero: true
            )
            NSLog(
                "[PendingLiveActivity] Showcase step \(index + 1)/\(PendingTransactionsLiveActivityShowcase.steps.count): " +
                "count=\(step.pendingTransactionCount), sats=\(step.totalPendingSats)"
            )

            guard index < PendingTransactionsLiveActivityShowcase.steps.count - 1 else { return }
            do {
                try await Task.sleep(
                    nanoseconds: UInt64(PendingTransactionsLiveActivityShowcase.interval * 1_000_000_000)
                )
            } catch {
                return
            }
        }
    }
    #endif

    private static func handle(_ task: BGAppRefreshTask) {
        scheduleBackgroundRefresh()
        let refreshTask = Task {
            await refresh(allowStart: false)
        }

        task.expirationHandler = {
            refreshTask.cancel()
        }

        Task {
            task.setTaskCompleted(success: await refreshTask.value)
        }
    }

    @MainActor
    private static func apply(
        snapshot: PendingTransactionsSharedSnapshot,
        allowStart: Bool,
        endExistingActivityOnZero: Bool
    ) async {
        let state = PendingTransactionsAttributes.ContentState(
            pendingTransactionCount: max(0, snapshot.pendingTransactionCount),
            totalPendingSats: max(0, snapshot.totalPendingSats),
            direction: snapshot.direction ?? .unknown,
            lastUpdated: snapshot.updatedAt,
            fiatQuote: PendingTransactionsLiveActivityStore.loadFiatQuote()
        )
        let activities = Activity<PendingTransactionsAttributes>.activities
        let action = PendingTransactionsLiveActivityStateBuilder.action(
            for: state,
            hasActiveActivity: !activities.isEmpty
        )

        switch action {
        case .end:
            guard PendingTransactionsLiveActivityRefreshPolicy.canEndExistingActivity(
                for: snapshot,
                endExistingActivityOnZero: endExistingActivityOnZero
            ) else {
                NSLog("[PendingLiveActivity] Preserved existing Live Activity during foreground zero refresh")
                scheduleBackgroundRefresh()
                return
            }

            for activity in activities {
                if #available(iOS 16.2, *) {
                    await activity.end(
                        ActivityContent(state: state, staleDate: nil),
                        dismissalPolicy: .immediate
                    )
                } else {
                    await activity.end(using: state, dismissalPolicy: .immediate)
                }
            }
            NSLog("[PendingLiveActivity] Ended \(activities.count) Live Activity instance(s)")
        case .start:
            guard allowStart else {
                NSLog("[PendingLiveActivity] Start skipped because this refresh may only update an existing activity")
                return
            }
            guard ActivityAuthorizationInfo().areActivitiesEnabled else {
                NSLog("[PendingLiveActivity] Start blocked because Live Activities are disabled in system settings")
                return
            }

            do {
                if #available(iOS 16.2, *) {
                    _ = try Activity.request(
                        attributes: PendingTransactionsAttributes(),
                        content: ActivityContent(
                            state: state,
                            staleDate: Date().addingTimeInterval(refreshInterval)
                        ),
                        pushType: nil
                    )
                } else {
                    _ = try Activity.request(
                        attributes: PendingTransactionsAttributes(),
                        contentState: state,
                        pushType: nil
                    )
                }
                NSLog("[PendingLiveActivity] Started Live Activity")
            } catch {
                NSLog("[PendingLiveActivity] Failed to start: \(error.localizedDescription)")
            }
        case .update:
            for activity in activities {
                if #available(iOS 16.2, *) {
                    await activity.update(
                        ActivityContent(
                            state: state,
                            staleDate: Date().addingTimeInterval(refreshInterval)
                        )
                    )
                } else {
                    await activity.update(using: state)
                }
            }
            NSLog("[PendingLiveActivity] Updated \(activities.count) Live Activity instance(s)")
        }
    }
}
#endif
