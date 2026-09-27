import React
import React_RCTAppDelegate
import UIKit
import UniformTypeIdentifiers

class SceneDelegate: UIResponder, UIWindowSceneDelegate, UIDropInteractionDelegate {
    var window: UIWindow?
    private var dropOverlay: UIView?

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

        window.addInteraction(UIDropInteraction(delegate: self))

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

    func dropInteraction(_ interaction: UIDropInteraction, canHandle session: UIDropSession) -> Bool {
        guard !DragAndDropState.isScreenProtected else { return false }
        // The window-level interaction imports external content. Local exports remain
        // ordinary drag sessions and are not re-opened by BlueWallet itself.
        guard session.localDragSession == nil else { return false }
        return session.hasItemsConforming(toTypeIdentifiers: [
            UTType.fileURL.identifier,
            UTType.url.identifier,
            UTType.text.identifier,
            UTType.image.identifier,
        ])
    }

    func dropInteraction(_ interaction: UIDropInteraction, sessionDidEnter session: UIDropSession) {
        guard dropInteraction(interaction, canHandle: session) else { return }
        showDropOverlay(itemCount: session.items.count)
    }

    func dropInteraction(_ interaction: UIDropInteraction, sessionDidExit session: UIDropSession) {
        hideDropOverlay()
    }

    func dropInteraction(_ interaction: UIDropInteraction, sessionDidEnd session: UIDropSession) {
        hideDropOverlay()
    }

    func dropInteraction(_ interaction: UIDropInteraction, sessionDidUpdate session: UIDropSession) -> UIDropProposal {
        guard !DragAndDropState.isScreenProtected else {
            hideDropOverlay()
            return UIDropProposal(operation: .forbidden)
        }
        guard session.localDragSession == nil else { return UIDropProposal(operation: .forbidden) }
        return UIDropProposal(operation: .copy)
    }

    func dropInteraction(_ interaction: UIDropInteraction, performDrop session: UIDropSession) {
        guard !DragAndDropState.isScreenProtected else { return }
        hideDropOverlay()
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        for item in session.items {
            let provider = item.itemProvider
            if provider.hasItemConformingToTypeIdentifier(UTType.fileURL.identifier), provider.canLoadObject(ofClass: NSURL.self) {
                provider.loadObject(ofClass: NSURL.self) { [weak self] object, _ in
                    guard !DragAndDropState.isScreenProtected, let nsURL = object as? NSURL else { return }
                    let url = nsURL as URL
                    self?.openDroppedURL(self?.localCopyIfNeeded(url) ?? url)
                }
            } else if let type = preferredFileRepresentation(for: provider) {
                provider.loadFileRepresentation(forTypeIdentifier: type.identifier) { [weak self] url, error in
                    guard !DragAndDropState.isScreenProtected else { return }
                    guard let url else {
                        if type.conforms(to: .image) { self?.loadImageFallback(from: provider) }
                        if let error { NSLog("[DragAndDrop] Could not load representation: %@", error.localizedDescription) }
                        return
                    }
                    // Item-provider file URLs are temporary and valid only during this
                    // callback. Copy synchronously before forwarding to React Native.
                    self?.openDroppedURL(self?.copyProviderFile(url, contentType: type) ?? url)
                }
            } else if provider.canLoadObject(ofClass: UIImage.self) {
                loadImageFallback(from: provider)
            } else if provider.canLoadObject(ofClass: NSString.self) {
                provider.loadObject(ofClass: NSString.self) { [weak self] object, _ in
                    guard !DragAndDropState.isScreenProtected,
                          let value = object as? String,
                          let url = URL(string: value.trimmingCharacters(in: .whitespacesAndNewlines)) else {
                        return
                    }
                    self?.openDroppedURL(url)
                }
            }
        }
    }

    private func preferredFileRepresentation(for provider: NSItemProvider) -> UTType? {
        let types = provider.registeredTypeIdentifiers.compactMap(UTType.init)
        return types.first { $0.conforms(to: .image) }
          ?? types.first { $0.conforms(to: .data) && !$0.conforms(to: .text) && !$0.conforms(to: .url) }
    }

    private func copyProviderFile(_ url: URL, contentType: UTType) -> URL? {
        let originalExtension = url.pathExtension
        let fileExtension = originalExtension.isEmpty ? contentType.preferredFilenameExtension : originalExtension
        let baseName = url.deletingPathExtension().lastPathComponent
        let name = fileExtension.map { "\(baseName).\($0)" } ?? baseName
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent("DroppedItems", isDirectory: true)
        let destination = directory.appendingPathComponent("\(UUID().uuidString)-\(name)")
        do {
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            try FileManager.default.copyItem(at: url, to: destination)
            return destination
        } catch {
            NSLog("[DragAndDrop] Could not copy provider file: %@", error.localizedDescription)
            return nil
        }
    }

    private func loadImageFallback(from provider: NSItemProvider) {
        provider.loadObject(ofClass: UIImage.self) { [weak self] object, _ in
            guard !DragAndDropState.isScreenProtected,
                  let image = object as? UIImage,
                  let data = image.pngData() else { return }
            let url = FileManager.default.temporaryDirectory
                .appendingPathComponent("DroppedItems", isDirectory: true)
                .appendingPathComponent("\(UUID().uuidString).png")
            do {
                try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
                try data.write(to: url, options: .atomic)
                self?.openDroppedURL(url)
            } catch {
                NSLog("[DragAndDrop] Could not save dropped image: %@", error.localizedDescription)
            }
        }
    }

    private func showDropOverlay(itemCount: Int) {
        guard dropOverlay == nil, let window else { return }

        let overlay = UIView(frame: window.bounds)
        overlay.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        overlay.isUserInteractionEnabled = false
        overlay.backgroundColor = UIColor.systemBlue.withAlphaComponent(0.12)
        overlay.layer.borderColor = UIColor.systemBlue.cgColor
        overlay.layer.borderWidth = 3
        overlay.layer.cornerRadius = 18

        let effect = UIBlurEffect(style: .systemMaterial)
        let message = UIVisualEffectView(effect: effect)
        message.translatesAutoresizingMaskIntoConstraints = false
        message.layer.cornerRadius = 16
        message.clipsToBounds = true

        let image = UIImageView(image: UIImage(systemName: "square.and.arrow.down.fill"))
        image.tintColor = .systemBlue
        image.preferredSymbolConfiguration = UIImage.SymbolConfiguration(pointSize: 30, weight: .semibold)

        let label = UILabel()
        label.font = .preferredFont(forTextStyle: .headline)
        label.textColor = .label
        label.text = itemCount == 1 ? "Drop to open in BlueWallet" : "Drop \(itemCount) items to open"

        let stack = UIStackView(arrangedSubviews: [image, label])
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 12
        message.contentView.addSubview(stack)
        overlay.addSubview(message)
        NSLayoutConstraint.activate([
            message.centerXAnchor.constraint(equalTo: overlay.centerXAnchor),
            message.centerYAnchor.constraint(equalTo: overlay.centerYAnchor),
            stack.leadingAnchor.constraint(equalTo: message.contentView.leadingAnchor, constant: 24),
            stack.trailingAnchor.constraint(equalTo: message.contentView.trailingAnchor, constant: -24),
            stack.topAnchor.constraint(equalTo: message.contentView.topAnchor, constant: 20),
            stack.bottomAnchor.constraint(equalTo: message.contentView.bottomAnchor, constant: -20),
        ])

        overlay.alpha = 0
        window.addSubview(overlay)
        dropOverlay = overlay
        UIView.animate(withDuration: 0.18) { overlay.alpha = 1 }
        UIAccessibility.post(notification: .announcement, argument: label.text)
    }

    private func hideDropOverlay() {
        guard let overlay = dropOverlay else { return }
        dropOverlay = nil
        UIView.animate(withDuration: 0.12, animations: { overlay.alpha = 0 }) { _ in overlay.removeFromSuperview() }
    }

    private func localCopyIfNeeded(_ url: URL) -> URL {
        guard url.isFileURL else { return url }

        let didAccess = url.startAccessingSecurityScopedResource()
        defer {
            if didAccess { url.stopAccessingSecurityScopedResource() }
        }

        let directory = FileManager.default.temporaryDirectory.appendingPathComponent("DroppedItems", isDirectory: true)
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let destination = directory.appendingPathComponent("\(UUID().uuidString)-\(url.lastPathComponent)")
        do {
            try FileManager.default.copyItem(at: url, to: destination)
            return destination
        } catch {
            NSLog("[DragAndDrop] Could not copy dropped file: %@", error.localizedDescription)
            return url
        }
    }

    private func openDroppedURL(_ url: URL) {
        DispatchQueue.main.async {
            guard !DragAndDropState.isScreenProtected else { return }
            if DragAndDropState.hasFocusedDropConsumer {
                let mimeType = UTType(filenameExtension: url.pathExtension)?.preferredMIMEType
                DragAndDropModule.emitFileDrop(url.absoluteString, mimeType: mimeType)
                return
            }
            guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
            _ = appDelegate.application(UIApplication.shared, open: url, options: [:])
        }
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
