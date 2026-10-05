import UIKit

// UIKit state is owned by the main thread; React Native owns the event emitter.
@objc(MenuElementsController)
final class MenuElementsController: NSObject {
    @objc static let shared = MenuElementsController()
    private(set) var availableActions = Set<String>()

    private(set) var headerItems: [[String: Any]] = []
    private var headerJSON = "[]"
    private var headerActionIDs = Set<String>()

    @objc func setHeaderMenu(_ json: String) {
        guard json != headerJSON,
              let data = json.data(using: .utf8),
              let items = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else { return }
        headerJSON = json
        headerItems = items
        func enabledIDs(_ items: [[String: Any]]) -> [String] {
            items.flatMap { item -> [String] in
                guard item["disabled"] as? Bool != true else { return [] }
                if let children = item["children"] as? [[String: Any]], !children.isEmpty { return enabledIDs(children) }
                return (item["id"] as? String).map { [$0] } ?? []
            }
        }
        headerActionIDs = Set(enabledIDs(items))
        UIMenuSystem.main.setNeedsRebuild()
    }

    func isHeaderActionEnabled(_ id: String) -> Bool {
        headerActionIDs.contains(id)
    }

    func closeKeyCommands() -> [UIKeyCommand] {
        func closeID(_ items: [[String: Any]]) -> String? {
            for item in items {
                if let children = item["children"] as? [[String: Any]], let id = closeID(children) { return id }
                if let id = item["id"] as? String, id.hasSuffix(":NavigationCloseButton"), headerActionIDs.contains(id) { return id }
            }
            return nil
        }
        guard let id = closeID(headerItems) else { return [] }
        let command = UIKeyCommand(title: "Close", action: NSSelectorFromString("performHeaderMenuAction:"),
                                   input: UIKeyCommand.inputEscape, modifierFlags: [], propertyList: id)
        if #available(iOS 26.0, *) { command.repeatBehavior = .nonRepeatable }
        return [command]
    }

    func headerMenuElements() -> [UIMenuElement] {
        func menuOptions(_ item: [String: Any]) -> UIMenu.Options {
            var options: UIMenu.Options = []
            if item["inline"] as? Bool == true { options.insert(.displayInline) }
            if item["destructive"] as? Bool == true { options.insert(.destructive) }
            if item["singleSelection"] as? Bool == true { options.insert(.singleSelection) }
            if #available(iOS 17.0, *), item["displayAsPalette"] as? Bool == true { options.insert(.displayAsPalette) }
            return options
        }

        func configure(_ element: UIMenuElement, from item: [String: Any]) {
            if #available(iOS 27.0, *), let visibility = item["preferredImageVisibility"] as? String {
                element.preferredImageVisibility = visibility == "visible" ? .visible : visibility == "hidden" ? .hidden : .automatic
            }
        }

        func configure(_ menu: UIMenu, from item: [String: Any]) {
            menu.subtitle = item["subtitle"] as? String
            if #available(iOS 16.0, *), let size = item["preferredElementSize"] as? String {
                switch size {
                case "small": menu.preferredElementSize = .small
                case "medium": menu.preferredElementSize = .medium
                case "large": menu.preferredElementSize = .large
                default:
                    if #available(iOS 17.0, *) { menu.preferredElementSize = .automatic }
                }
            }
            if #available(iOS 17.4, *), let lineCount = item["maximumNumberOfTitleLines"] as? Int {
                let preferences = UIMenuDisplayPreferences()
                preferences.maximumNumberOfTitleLines = max(0, lineCount)
                menu.displayPreferences = preferences
            }
            configure(menu as UIMenuElement, from: item)
        }

        func configure(_ command: UICommand, from item: [String: Any]) {
            command.discoverabilityTitle = item["discoverabilityTitle"] as? String ?? command.title
            if #available(iOS 26.0, *), let behavior = item["repeatBehavior"] as? String {
                command.repeatBehavior = behavior == "repeatable" ? .repeatable : behavior == "nonRepeatable" ? .nonRepeatable : .automatic
            }
            configure(command as UIMenuElement, from: item)
        }

        func elements(_ items: [[String: Any]]) -> [UIMenuElement] {
            items.compactMap { item in
                guard let id = item["id"] as? String, let title = item["title"] as? String else { return nil }
                if let children = item["children"] as? [[String: Any]], !children.isEmpty {
                    let menu = UIMenu(title: title, image: (item["icon"] as? String).flatMap { UIImage(systemName: $0) },
                                      identifier: UIMenu.Identifier(id), options: menuOptions(item), children: elements(children))
                    configure(menu, from: item)
                    return menu
                }
                var attributes: UIMenuElement.Attributes = []
                if item["disabled"] as? Bool == true { attributes.insert(.disabled) }
                if item["destructive"] as? Bool == true { attributes.insert(.destructive) }
                if #available(iOS 16.0, *), item["keepsMenuPresented"] as? Bool == true { attributes.insert(.keepsMenuPresented) }
                let state: UIMenuElement.State = item["state"] as? String == "mixed" ? .mixed : item["state"] as? Bool == true ? .on : .off
                let image = (item["icon"] as? String).flatMap { UIImage(systemName: $0) }
                if let shortcut = item["shortcut"] as? [String: Any], let input = shortcut["input"] as? String {
                    let modifiers = shortcut["modifiers"] as? [String] ?? []
                    var flags: UIKeyModifierFlags = []
                    if modifiers.contains("command") { flags.insert(.command) }
                    if modifiers.contains("shift") { flags.insert(.shift) }
                    if modifiers.contains("alternate") { flags.insert(.alternate) }
                    let command = UIKeyCommand(title: title, image: image,
                                               action: NSSelectorFromString("performHeaderMenuAction:"),
                                               input: input, modifierFlags: flags, propertyList: id)
                    command.attributes = attributes
                    command.state = state
                    configure(command, from: item)
                    return command
                }
                let action = UIAction(title: title, image: image, identifier: UIAction.Identifier(id),
                                      discoverabilityTitle: item["discoverabilityTitle"] as? String,
                                      attributes: attributes, state: state) { [weak self] _ in self?.perform(id) }
                if #available(iOS 16.0, *) { action.subtitle = item["subtitle"] as? String }
                if #available(iOS 26.0, *), let behavior = item["repeatBehavior"] as? String {
                    action.repeatBehavior = behavior == "repeatable" ? .repeatable : behavior == "nonRepeatable" ? .nonRepeatable : .automatic
                }
                configure(action as UIMenuElement, from: item)
                return action
            }
        }
        return elements(headerItems)
    }

    @objc func setAvailableActions(_ actions: [String]) {
        let updated = Set(actions)
        guard updated != availableActions else { return }
        availableActions = updated
        UIMenuSystem.main.setNeedsRebuild()
    }

    func perform(_ action: String) {
        guard availableActions.contains(action) || headerActionIDs.contains(action) else { return }
        NotificationCenter.default.post(
            name: Notification.Name("BlueWalletMenuAction"), object: self,
            userInfo: ["action": action]
        )
    }
}
