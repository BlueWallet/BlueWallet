import Foundation
import WidgetKit
#if canImport(React_Codegen)
import React
#endif

// Lightweight helper used by the app target to refresh widget timelines from native code.
class WidgetHelper {
    func reloadAllWidgets() {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
    }
}

#if canImport(React_Codegen)
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
            await PendingTransactionsLiveActivityCoordinator.refresh(allowStart: true)
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
        Task {
            await PendingTransactionsLiveActivityCoordinator.preview(
                pendingTransactionCount: pendingTransactionCount,
                totalPendingSats: totalPendingSats
            )
        }
        #endif
    }
}
#else
// Fallback for targets (e.g., widget extension) that do not pull in React codegen modules.
@objc(WidgetHelperModule)
class WidgetHelperModule: NSObject {
    func reloadAllWidgets() {
        // WidgetsExtension does not link the app's WidgetHelper; invoke WidgetKit directly.
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
    }

    func refreshPendingTransactionsLiveActivity() {}

    func previewPendingTransactionsLiveActivity(
        _ pendingTransactionCount: Double,
        totalPendingSats: Double
    ) {}
}
#endif
