import UIKit

// UIKit state is owned by the main thread; React Native owns the event emitter.
@objc(MenuActionsController)
final class MenuActionsController: NSObject {
    struct RecentItem: Decodable {
        let id: String
        let title: String
        let kind: String
    }

    @objc static let shared = MenuActionsController()
    private(set) var availableActions = Set<String>()
    private(set) var actionStates = [String: ActionState]()
    private(set) var menuTitles = [String: String]()
    private(set) var recentItems = [RecentItem]()

    struct ActionState: Decodable, Equatable {
        let disabled: Bool?
        let checked: Bool?
    }

    @objc func setAvailableActions(_ actions: [String]) {
        let updated = Set(actions)
        guard updated != availableActions else { return }
        availableActions = updated
        UIMenuSystem.main.setNeedsRebuild()
    }

    @objc func setActionStates(_ statesJSON: String) {
        guard let data = statesJSON.data(using: .utf8),
              let updated = try? JSONDecoder().decode([String: ActionState].self, from: data),
              updated != actionStates else { return }
        actionStates = updated
        UIMenuSystem.main.setNeedsRebuild()
    }

    @objc func setMenuTitles(_ titlesJSON: String) {
        guard let data = titlesJSON.data(using: .utf8),
              let updated = try? JSONDecoder().decode([String: String].self, from: data),
              updated != menuTitles else { return }
        menuTitles = updated
        UIMenuSystem.main.setNeedsRebuild()
    }

    func title(for action: String, fallback: String) -> String {
        menuTitles[action] ?? fallback
    }

    @objc func setRecentItems(_ itemsJSON: String) {
        guard let data = itemsJSON.data(using: .utf8),
              let updated = try? JSONDecoder().decode([RecentItem].self, from: data) else { return }
        guard updated.map(\.id) != recentItems.map(\.id) || updated.map(\.title) != recentItems.map(\.title) else { return }
        recentItems = updated
        UIMenuSystem.main.setNeedsRebuild()
    }

    func perform(_ action: String) {
        let isRecentItem = action.hasPrefix("openRecent:") && recentItems.contains { "openRecent:\($0.id)" == action }
        guard (availableActions.contains(action) || isRecentItem), actionStates[action]?.disabled != true else { return }
        NotificationCenter.default.post(
            name: Notification.Name("BlueWalletMenuAction"), object: self,
            userInfo: ["action": action]
        )
    }
}
