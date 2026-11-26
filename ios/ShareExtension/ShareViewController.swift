import UIKit
import UniformTypeIdentifiers

final class ShareViewController: UIViewController {
    private var hasStartedImport = false

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        guard !hasStartedImport else { return }
        hasStartedImport = true
        importSharedImage()
    }

    private func importSharedImage() {
        guard let provider = extensionContext?.inputItems
            .compactMap({ $0 as? NSExtensionItem })
            .flatMap({ $0.attachments ?? [] })
            .first(where: { $0.hasItemConformingToTypeIdentifier(UTType.image.identifier) }) else {
            finish(with: CocoaError(.fileReadUnknown))
            return
        }

        provider.loadFileRepresentation(forTypeIdentifier: UTType.image.identifier) { [weak self] sourceURL, error in
            guard let self, let sourceURL, error == nil else {
                self?.finish(with: error ?? CocoaError(.fileReadUnknown))
                return
            }

            do {
                guard let store = SharedImageStore.appGroupStore() else {
                    throw CocoaError(.fileWriteNoPermission)
                }
                try store.importImage(at: sourceURL)
                CFNotificationCenterPostNotification(
                    CFNotificationCenterGetDarwinNotifyCenter(),
                    SharedImageStore.notificationName,
                    nil,
                    nil,
                    true
                )
                DispatchQueue.main.async {
                    self.extensionContext?.completeRequest(returningItems: nil)
                }
            } catch {
                self.finish(with: error)
            }
        }
    }

    private func finish(with error: Error) {
        DispatchQueue.main.async {
            self.extensionContext?.cancelRequest(withError: error)
        }
    }
}
