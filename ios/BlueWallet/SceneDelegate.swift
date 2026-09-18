import React
import React_RCTAppDelegate
import UIKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard let windowScene = scene as? UIWindowScene else {
            return
        }
        guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else {
            return
        }

        let window = UIWindow(windowScene: windowScene)
        self.window = window
        appDelegate.window = window

        appDelegate.reactNativeFactory.startReactNative(
            withModuleName: appDelegate.moduleName ?? "BlueWallet",
            in: window,
            initialProperties: appDelegate.initialProps,
            launchOptions: launchOptions(from: connectionOptions, fallback: appDelegate.sceneLaunchOptions)
        )

        // Custom Handoff activities are stored for JS; Linking cold-starts use launchOptions above.
        for userActivity in connectionOptions.userActivities {
            _ = appDelegate.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else {
            return
        }
        for context in URLContexts {
            _ = appDelegate.application(UIApplication.shared, open: context.url, options: [:])
        }
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else {
            return
        }
        _ = appDelegate.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
    }

    func windowScene(
        _ windowScene: UIWindowScene,
        performActionFor shortcutItem: UIApplicationShortcutItem,
        completionHandler: @escaping (Bool) -> Void
    ) {
        RNQuickActionManager.onQuickActionPress(shortcutItem, completionHandler: completionHandler)
    }

    private func launchOptions(
        from connectionOptions: UIScene.ConnectionOptions,
        fallback: [UIApplication.LaunchOptionsKey: Any]?
    ) -> [UIApplication.LaunchOptionsKey: Any]? {
        var options = fallback ?? [:]

        if let url = connectionOptions.urlContexts.first?.url {
            options[.url] = url
        }

        if let activity = connectionOptions.userActivities.first {
            options[.userActivityType] = activity.activityType
            options[.userActivityDictionary] = [
                UIApplication.LaunchOptionsKey.userActivityType: activity.activityType,
                "UIApplicationLaunchOptionsUserActivityKey": activity,
            ]
        }

        if let shortcutItem = connectionOptions.shortcutItem {
            options[.shortcutItem] = shortcutItem
        }

        return options.isEmpty ? nil : options
    }
}
