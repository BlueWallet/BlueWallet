import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import UIKit

class SceneDelegate: RCTDefaultReactNativeFactoryDelegate, UIWindowSceneDelegate {
    var window: UIWindow?
    var reactNativeFactory: RCTReactNativeFactory?

    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard let windowScene = scene as? UIWindowScene else {
            return
        }
        dependencyProvider = RCTAppDependencyProvider()
        reactNativeFactory = RCTReactNativeFactory(delegate: self)
        window = UIWindow(windowScene: windowScene)
        reactNativeFactory?.startReactNative(
            withModuleName: "BlueWallet",
            in: window,
            connectionOptions: connectionOptions
        )

        if let shortcutItem = connectionOptions.shortcutItem,
           let appDelegate = UIApplication.shared.delegate as? AppDelegate {
            appDelegate.openShortcutLink(shortcutItem, in: windowScene, completionHandler: { _ in })
        }

        if let appDelegate = UIApplication.shared.delegate as? AppDelegate {
            for userActivity in connectionOptions.userActivities where userActivity.activityType != NSUserActivityTypeBrowsingWeb {
                _ = appDelegate.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
            }
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        RCTLinkingManager.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        if userActivity.activityType == NSUserActivityTypeBrowsingWeb {
            RCTLinkingManager.scene(scene, continue: userActivity)
        } else if let appDelegate = UIApplication.shared.delegate as? AppDelegate {
            _ = appDelegate.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
        }
    }

    func windowScene(
        _ windowScene: UIWindowScene,
        performActionFor shortcutItem: UIApplicationShortcutItem,
        completionHandler: @escaping (Bool) -> Void
    ) {
        guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else {
            completionHandler(false)
            return
        }
        appDelegate.openShortcutLink(shortcutItem, in: windowScene, completionHandler: completionHandler)
    }

    override func bundleURL() -> URL? {
        #if DEBUG
        RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
        #else
        Bundle.main.url(forResource: "main", withExtension: "jsbundle")
        #endif
    }
}
