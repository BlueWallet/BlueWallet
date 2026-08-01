import Foundation
import React
import UIKit
import WidgetKit

// Lightweight helper used by the app target to refresh widget timelines from native code.
class WidgetHelper {
    func reloadAllWidgets() {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
    }
}

@objc(WidgetHelperModule)
class WidgetHelperModule: NSObject, NativeWidgetHelperSpec {
    static func moduleName() -> String! { "WidgetHelper" }
    static func requiresMainQueueSetup() -> Bool { false }

    @objc
    func reloadAllWidgets() {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
    }

    @objc
    func refreshPendingTransactionsLiveActivity() {
        #if canImport(ActivityKit) && canImport(BackgroundTasks) && os(iOS) && !targetEnvironment(macCatalyst)
        guard #available(iOS 16.1, *) else { return }
        Task {
            // Calls through this bridge happen while React Native is running in
            // the foreground. They may update or start an activity, but a
            // transient zero must not clear one that is already visible.
            await PendingTransactionsLiveActivityCoordinator.refresh(
                allowStart: true,
                endExistingActivityOnZero: false
            )
        }
        #endif
    }

    @objc
    func previewPendingTransactionsLiveActivity(
        _ pendingTransactionCount: Double,
        totalPendingSats: Double
    ) {
        #if DEBUG && canImport(ActivityKit) && canImport(BackgroundTasks) && os(iOS) && !targetEnvironment(macCatalyst)
        guard #available(iOS 16.1, *) else { return }
        NSLog(
            "[PendingLiveActivity] Preview requested: count=\(pendingTransactionCount), sats=\(totalPendingSats)"
        )
        Task {
            await PendingTransactionsLiveActivityCoordinator.preview(
                pendingTransactionCount: pendingTransactionCount,
                totalPendingSats: totalPendingSats
            )
        }
        #endif
    }

    @objc
    func showcasePendingTransactionsLiveActivity() {
        #if DEBUG && canImport(ActivityKit) && canImport(BackgroundTasks) && os(iOS) && !targetEnvironment(macCatalyst)
        guard #available(iOS 16.1, *) else { return }
        NSLog("[PendingLiveActivity] Five-second showcase requested")
        Task { @MainActor in
            let backgroundTask = UIApplication.shared.beginBackgroundTask(
                withName: "PendingTransactionsLiveActivityShowcase",
                expirationHandler: nil
            )
            await PendingTransactionsLiveActivityCoordinator.showcase()
            if backgroundTask != .invalid {
                UIApplication.shared.endBackgroundTask(backgroundTask)
            }
        }
        #endif
    }
}
