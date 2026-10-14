#if DEBUG
import CoreImage
import UIKit
import UniformTypeIdentifiers

private final class PNGActivityItemSource: NSObject, UIActivityItemSource {
    let image: UIImage
    let url: URL

    init(image: UIImage, url: URL) {
        self.image = image
        self.url = url
    }

    func activityViewControllerPlaceholderItem(_ activityViewController: UIActivityViewController) -> Any { image }

    func activityViewController(
        _ activityViewController: UIActivityViewController,
        itemForActivityType activityType: UIActivity.ActivityType?
    ) -> Any? { url }

    func activityViewController(
        _ activityViewController: UIActivityViewController,
        dataTypeIdentifierForActivityType activityType: UIActivity.ActivityType?
    ) -> String { UTType.png.identifier }
}

final class ShareExtensionUITestHostViewController: UIViewController {
    private let statusLabel = UILabel()
    private var temporaryFiles: [URL] = []
    private var activityItems: [PNGActivityItemSource] = []

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        title = "Share Extension Test Host"
        let buttons = [
            makeButton(title: "Single Bitcoin QR", identifier: "share-test.single-bitcoin", action: #selector(shareSingleBitcoin)),
            makeButton(title: "Multiple Bitcoin QRs", identifier: "share-test.multiple-bitcoin", action: #selector(shareMultipleBitcoin)),
            makeButton(title: "Mixed QR Codes", identifier: "share-test.mixed", action: #selector(shareMixed)),
            makeButton(title: "Image Without QR", identifier: "share-test.no-qr", action: #selector(shareNoQRCode)),
        ]
        statusLabel.text = "Ready"
        statusLabel.textAlignment = .center
        statusLabel.accessibilityIdentifier = "share-test.status"
        let stack = UIStackView(arrangedSubviews: buttons + [statusLabel])
        stack.axis = .vertical
        stack.spacing = 16
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 24),
            stack.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -24),
            stack.centerYAnchor.constraint(equalTo: view.centerYAnchor),
        ])
    }

    func receivedSharedPayload() { statusLabel.text = "Opened shared QR payload" }

    func refreshSharedPayloadStatus() {
        guard UserDefaults(suiteName: "group.io.bluewallet.bluewallet")?
            .stringArray(forKey: "pendingSharedQRValues")?.isEmpty == false else { return }
        receivedSharedPayload()
    }

    @objc private func shareSingleBitcoin() {
        presentShareSheet(values: ["bitcoin:1BoatSLRHtKNngkdXEeobR76b53LETtpyT"])
    }

    @objc private func shareMultipleBitcoin() {
        presentShareSheet(values: [
            "bitcoin:1BoatSLRHtKNngkdXEeobR76b53LETtpyT",
            "bitcoin:3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy",
        ])
    }

    @objc private func shareMixed() {
        presentShareSheet(values: [
            "bitcoin:1BoatSLRHtKNngkdXEeobR76b53LETtpyT",
            "https://bluewallet.io/share-extension-test",
        ])
    }

    @objc private func shareNoQRCode() {
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: 480, height: 320))
        let image = renderer.image { context in
            UIColor.systemTeal.setFill()
            context.fill(CGRect(origin: .zero, size: CGSize(width: 480, height: 320)))
        }
        presentShareSheet(images: [image])
    }

    private func presentShareSheet(values: [String]) {
        presentShareSheet(images: values.compactMap(makeQRCode))
    }

    private func presentShareSheet(images: [UIImage]) {
        statusLabel.text = "Sharing \(images.count) image(s)"
        removeTemporaryFiles()
        activityItems = images.enumerated().compactMap { index, image in
            guard let data = image.pngData() else { return nil }
            let url = FileManager.default.temporaryDirectory
                .appendingPathComponent("share-extension-ui-test-\(UUID().uuidString)-\(index).png")
            do {
                try data.write(to: url, options: .atomic)
                temporaryFiles.append(url)
                return PNGActivityItemSource(image: image, url: url)
            } catch {
                return nil
            }
        }
        let controller = UIActivityViewController(activityItems: activityItems, applicationActivities: nil)
        controller.popoverPresentationController?.sourceView = view
        controller.popoverPresentationController?.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 1, height: 1)
        present(controller, animated: false)
    }

    private func removeTemporaryFiles() {
        for url in temporaryFiles {
            try? FileManager.default.removeItem(at: url)
        }
        temporaryFiles.removeAll()
        activityItems.removeAll()
    }

    private func makeQRCode(_ value: String) -> UIImage? {
        guard let data = value.data(using: .utf8),
              let output = CIFilter(name: "CIQRCodeGenerator", parameters: [
                  "inputMessage": data,
                  "inputCorrectionLevel": "M",
              ])?.outputImage else { return nil }
        let quietZone: CGFloat = 48
        let scaled = output
            .transformed(by: CGAffineTransform(scaleX: 12, y: 12))
            .transformed(by: CGAffineTransform(translationX: quietZone, y: quietZone))
        let extent = CGRect(
            x: 0,
            y: 0,
            width: scaled.extent.width + quietZone * 2,
            height: scaled.extent.height + quietZone * 2
        )
        let rendered = scaled.composited(over: CIImage(color: .white).cropped(to: extent))
        let context = CIContext(options: [.cacheIntermediates: false])
        guard let image = context.createCGImage(rendered, from: extent) else { return nil }
        context.clearCaches()
        return UIImage(cgImage: image)
    }

    private func makeButton(title: String, identifier: String, action: Selector) -> UIButton {
        var configuration = UIButton.Configuration.filled()
        configuration.title = title
        let button = UIButton(configuration: configuration)
        button.accessibilityIdentifier = identifier
        button.addTarget(self, action: action, for: .touchUpInside)
        return button
    }
}
#endif
