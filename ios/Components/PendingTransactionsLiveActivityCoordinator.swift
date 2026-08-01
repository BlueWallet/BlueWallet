#if canImport(ActivityKit) && canImport(BackgroundTasks) && os(iOS) && !targetEnvironment(macCatalyst)
import ActivityKit
import BackgroundTasks
import Foundation

@available(iOS 16.1, *)
enum PendingTransactionsLiveActivityCoordinator {
    static let backgroundTaskIdentifier = "io.bluewallet.bluewallet.pendingLiveActivityRefresh"
    private static let refreshInterval: TimeInterval = 15 * 60

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

    @discardableResult
    static func refresh(allowStart: Bool, queryElectrum: Bool = true) async -> Bool {
        let configuration = PendingTransactionsLiveActivityStore.loadWatchConfiguration()
        let fallbackSnapshot = configuration.isEnabled
            ? PendingTransactionsLiveActivityStore.loadSnapshot()
            : .empty()

        await apply(snapshot: fallbackSnapshot, allowStart: allowStart)

        guard configuration.isEnabled, !configuration.scriptHashes.isEmpty else {
            BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: backgroundTaskIdentifier)
            return true
        }

        scheduleBackgroundRefresh()
        guard queryElectrum else { return true }

        do {
            let snapshot = try await PendingTransactionsElectrumService().fetchSnapshot(configuration: configuration)
            PendingTransactionsLiveActivityStore.saveSnapshot(snapshot)
            await apply(snapshot: snapshot, allowStart: allowStart)
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
    static func preview(pendingTransactionCount: Double, totalPendingSats: Double) async {
        guard let state = PendingTransactionsLiveActivityStateBuilder.make(
            pendingTransactionCount: pendingTransactionCount,
            totalPendingSats: totalPendingSats
        ) else { return }

        let snapshot = PendingTransactionsSharedSnapshot(
            pendingTransactionCount: state.pendingTransactionCount,
            totalPendingSats: state.totalPendingSats,
            updatedAt: state.lastUpdated
        )
        await apply(snapshot: snapshot, allowStart: true)
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
    private static func apply(snapshot: PendingTransactionsSharedSnapshot, allowStart: Bool) async {
        let state = PendingTransactionsAttributes.ContentState(
            pendingTransactionCount: max(0, snapshot.pendingTransactionCount),
            totalPendingSats: max(0, snapshot.totalPendingSats),
            lastUpdated: snapshot.updatedAt
        )
        let activities = Activity<PendingTransactionsAttributes>.activities
        let action = PendingTransactionsLiveActivityStateBuilder.action(
            for: state,
            hasActiveActivity: !activities.isEmpty
        )

        switch action {
        case .end:
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
        case .start:
            guard allowStart, ActivityAuthorizationInfo().areActivitiesEnabled else { return }

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
        }
    }
}
#endif
