import UIKit

// UIKit state is owned by the main thread; React Native owns the event emitter.
@objc(MenuElementsController)
final class MenuElementsController: NSObject {
    @objc static let shared = MenuElementsController()
    private(set) var availableActions = Set<String>()

    @objc func setAvailableActions(_ actions: [String]) {
        let updated = Set(actions)
        guard updated != availableActions else { return }
        availableActions = updated
        UIMenuSystem.main.setNeedsRebuild()
    }

    func perform(_ action: String) {
        guard availableActions.contains(action) else { return }
        NotificationCenter.default.post(
            name: Notification.Name("BlueWalletMenuAction"), object: self,
            userInfo: ["action": action]
        )
    }
}
