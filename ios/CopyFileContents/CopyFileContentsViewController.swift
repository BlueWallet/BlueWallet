import UIKit
import SwiftUI

/// A Files share-sheet action. Files' own Copy action remains system-owned.
final class CopyFileContentsViewController: UIViewController {
    private var started = false
    override func viewDidLoad() {
        super.viewDidLoad()
        show(CopyContentsStatus(error: nil, close: finish))
    }
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        guard !started else { return }
        started = true
        let items = extensionContext?.inputItems as? [NSExtensionItem] ?? []
        let providers = items.flatMap { $0.attachments ?? [] }
        guard providers.count == 1, let provider = providers.first,
              let type = FileContents.supportedTypes.first(where: { provider.hasItemConformingToTypeIdentifier($0) }) else {
            fail(FileContents.Failure.unsupported); return
        }
        // Read inside the callback; the provider owns this temporary URL's lifetime.
        provider.loadFileRepresentation(forTypeIdentifier: type) { [weak self] url, error in
            let result: Result<String, Error> = Result {
                if let error { throw error }
                guard let url else { throw FileContents.Failure.unreadable }
                return try FileContents.read(url, type: type)
            }
            DispatchQueue.main.async {
                guard let self else { return }
                switch result {
                case .success(let text):
                    UIPasteboard.general.string = text
                    self.finish()
                case .failure(let error): self.fail(error)
                }
            }
        }
    }
    private func finish() { extensionContext?.completeRequest(returningItems: nil) }
    private func fail(_ error: Error) {
        let message = error as? FileContents.Failure == .tooLarge
            ? "This file is too large to copy. Open it in BlueWallet."
            : "The file could not be copied. Try downloading it in Files first."
        show(CopyContentsStatus(error: message, close: finish))
    }
    private func show<Content: View>(_ content: Content) {
        for child in children { child.willMove(toParent: nil); child.view.removeFromSuperview(); child.removeFromParent() }
        let host = UIHostingController(rootView: content)
        addChild(host); host.view.translatesAutoresizingMaskIntoConstraints = false; view.addSubview(host.view)
        NSLayoutConstraint.activate([
            host.view.topAnchor.constraint(equalTo: view.topAnchor), host.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            host.view.leadingAnchor.constraint(equalTo: view.leadingAnchor), host.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])
        host.didMove(toParent: self)
    }
}
private struct CopyContentsStatus: View {
    let error: String?
    let close: () -> Void
    var body: some View {
        VStack(spacing: 20) {
            if let error {
                Image(systemName: "doc.badge.ellipsis").font(.largeTitle).accessibilityHidden(true)
                Text(VaultLocalization.text(error)).multilineTextAlignment(.center)
                Button(VaultLocalization.text("Close"), action: close)
            } else {
                ProgressView()
                Text(VaultLocalization.text("Copying file contents…"))
            }
        }.padding(24).frame(maxWidth: .infinity, maxHeight: .infinity).background(Color(uiColor: .systemBackground))
    }
}
