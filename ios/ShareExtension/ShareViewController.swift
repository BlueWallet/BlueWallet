import UIKit
import UniformTypeIdentifiers

final class ShareViewController: UIViewController {
    private static let appGroup = "group.io.bluewallet.bluewallet"
    private static let pendingImageKey = "pendingSharedImageFilename"
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
                guard let container = FileManager.default.containerURL(
                    forSecurityApplicationGroupIdentifier: Self.appGroup
                ) else {
                    throw CocoaError(.fileNoSuchFile)
                }

                let directory = container.appendingPathComponent("shared-images", isDirectory: true)
                try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
                guard let defaults = UserDefaults(suiteName: Self.appGroup) else {
                    throw CocoaError(.fileWriteNoPermission)
                }
                if let previousName = defaults.string(forKey: Self.pendingImageKey),
                   previousName == (previousName as NSString).lastPathComponent {
                    try? FileManager.default.removeItem(at: directory.appendingPathComponent(previousName))
                }
                guard let image = UIImage(contentsOfFile: sourceURL.path),
                      let imageData = image.pngData() else {
                    throw CocoaError(.fileReadCorruptFile)
                }
                let fileName = "\(UUID().uuidString).png"
                let destinationURL = directory.appendingPathComponent(fileName)
                try imageData.write(to: destinationURL, options: .atomic)
                defaults.set(fileName, forKey: Self.pendingImageKey)
                defaults.synchronize()
                DispatchQueue.main.async { self.extensionContext?.completeRequest(returningItems: nil) }
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
