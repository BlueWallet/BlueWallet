import UIKit

// UIKit state is owned by the main thread; React Native owns the event emitter.
@objc(MenuElementsController)
final class MenuElementsController: NSObject {
    @objc static let shared = MenuElementsController()
    private static let titleMetadataPrefix = "__menu_title__"
    private(set) var availableActions = Set<String>()
    private var actionTitles: [String: String] = [:]

    @objc func setAvailableActions(_ actions: [String]) {
        var updated = Set<String>()
        var updatedTitles: [String: String] = [:]
        for value in actions {
            guard value.hasPrefix(Self.titleMetadataPrefix) else {
                updated.insert(value)
                continue
            }
            let json = String(value.dropFirst(Self.titleMetadataPrefix.count))
            guard let data = json.data(using: .utf8),
                  let object = try? JSONSerialization.jsonObject(with: data),
                  let metadata = object as? [String: String],
                  let action = metadata["action"],
                  let title = metadata["title"],
                  !title.isEmpty else { continue }
            updatedTitles[action] = title
        }
        guard updated != availableActions || updatedTitles != actionTitles else { return }
        availableActions = updated
        actionTitles = updatedTitles
        UIMenuSystem.main.setNeedsRebuild()
    }

    func title(for action: String, fallback: String) -> String {
        actionTitles[action] ?? fallback
    }

    func perform(_ action: String) {
        guard availableActions.contains(action) else { return }
        NotificationCenter.default.post(
            name: Notification.Name("BlueWalletMenuAction"), object: self,
            userInfo: ["action": action]
        )
    }
}
