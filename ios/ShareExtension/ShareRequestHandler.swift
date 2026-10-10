import CoreImage
import Foundation
import ImageIO
import OSLog
import SwiftUI
import UIKit
import UniformTypeIdentifiers

private enum SharePhase {
    case processing
    case decision
    case failure(ShareImportError)
}

private final class ShareViewModel: ObservableObject {
    @Published private(set) var phase: SharePhase = .processing
    @Published private(set) var previewImage: UIImage?
    @Published private(set) var openDestination: URL?
    @Published private(set) var decodedValue: String?

    private let logger = Logger(
        subsystem: Bundle.main.bundleIdentifier ?? "io.bluewallet.bluewallet.ShareExtension",
        category: "ShareRequest"
    )
    private weak var context: NSExtensionContext?
    private var isFinished = false

    func begin(with context: NSExtensionContext?) {
        guard let context else {
            logger.error("Share extension context is unavailable")
            showFailure(.importFailed)
            return
        }

        self.context = context
        UserDefaults(suiteName: "group.io.bluewallet.bluewallet")?.removeObject(forKey: "pendingSharedQRCode")
        logger.notice("Share request started")
        let providers = context.inputItems
            .compactMap { $0 as? NSExtensionItem }
            .flatMap { $0.attachments ?? [] }
        logger.info("Found \(providers.count, privacy: .public) attachment provider(s)")

        guard providers.count == 1, let provider = providers.first else {
            logger.error("Expected exactly one attachment provider")
            showFailure(.unsupportedImage)
            return
        }

        let registeredTypes = provider.registeredTypeIdentifiers.joined(separator: ", ")
        logger.info("Provider registered types: \(registeredTypes, privacy: .public)")
        guard let imageTypeIdentifier = provider.registeredTypeIdentifiers.first(where: { identifier in
            UTType(identifier)?.conforms(to: .image) == true
        }) else {
            logger.error("No registered provider type conforms to public.image")
            showFailure(.unsupportedImage)
            return
        }

        logger.info("Loading image representation as \(imageTypeIdentifier, privacy: .public)")
        provider.loadFileRepresentation(forTypeIdentifier: imageTypeIdentifier) { [weak self] sourceURL, error in
            guard let self else { return }
            if let error = error as NSError? {
                self.logger.error("Image provider load failed: domain=\(error.domain, privacy: .public) code=\(error.code, privacy: .public)")
            }
            guard error == nil, let sourceURL else {
                self.logger.error("Image provider returned no readable file URL")
                self.showFailure(.unreadableImage)
                return
            }

            self.logger.info("Image file representation loaded")
            do {
                guard let size = try sourceURL.resourceValues(forKeys: [.fileSizeKey]).fileSize else {
                    self.logger.error("Image file representation has no file size")
                    self.showFailure(.unreadableImage)
                    return
                }

                self.logger.info("Validating image with \(size, privacy: .public) encoded bytes")
                try self.validateImage(at: sourceURL, encodedBytes: Int64(size))
                let preview = self.makeThumbnail(at: sourceURL)
                self.logger.info("Image validation succeeded; previewCreated=\(preview != nil, privacy: .public)")
                DispatchQueue.main.async {
                    guard !self.isFinished else { return }
                    self.previewImage = preview
                }

                self.logger.info("Starting QR decode")
                guard let value = try QRCodeImageDecoder.decode(at: sourceURL) else {
                    self.logger.error("QR decode completed without a result")
                    self.showFailure(.qrCodeNotFound, preview: preview)
                    return
                }
                self.logger.info("QR decode succeeded; payload length=\(value.utf8.count, privacy: .public)")
                guard let defaults = UserDefaults(suiteName: "group.io.bluewallet.bluewallet") else {
                    self.logger.error("Could not open the shared app-group defaults")
                    self.showFailure(.storageUnavailable, preview: preview)
                    return
                }
                defaults.set(value, forKey: "pendingSharedQRCode")
                guard defaults.string(forKey: "pendingSharedQRCode") == value else {
                    self.logger.error("Could not verify the pending QR payload in the shared app group")
                    self.showFailure(.storageUnavailable, preview: preview)
                    return
                }
                self.logger.info("Stored the pending QR payload in the app group")
                let renderedQRCode = self.makeStyledQRCode(for: value)
                self.logger.info("BlueWallet QR preview rendered=\(renderedQRCode != nil, privacy: .public)")
                DispatchQueue.main.async {
                    guard !self.isFinished else { return }
                    self.previewImage = renderedQRCode ?? preview
                    self.decodedValue = value
                    self.openDestination = URL(string: "bluewallet://shared-image")
                    self.phase = .decision
                }
            } catch let error as ShareImportError {
                self.logger.error("Share import rejected with code \(error.rawValue, privacy: .public)")
                self.showFailure(error)
            } catch {
                let nsError = error as NSError
                self.logger.error("Unexpected import failure: domain=\(nsError.domain, privacy: .public) code=\(nsError.code, privacy: .public)")
                self.showFailure(.importFailed)
            }
        }
    }

    func cancel() {
        guard !isFinished else { return }
        isFinished = true
        UserDefaults(suiteName: "group.io.bluewallet.bluewallet")?.removeObject(forKey: "pendingSharedQRCode")
        logger.notice("User closed the share request")
        context?.completeRequest(returningItems: nil)
    }

    private func showFailure(_ error: ShareImportError, preview: UIImage? = nil) {
        DispatchQueue.main.async {
            guard !self.isFinished else { return }
            if let preview {
                self.previewImage = preview
            }
            self.openDestination = nil
            self.decodedValue = nil
            self.phase = .failure(error)
        }
    }

    private func validateImage(at url: URL, encodedBytes: Int64) throws {
        guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
              let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
              let width = properties[kCGImagePropertyPixelWidth] as? NSNumber,
              let height = properties[kCGImagePropertyPixelHeight] as? NSNumber else {
            logger.error("ImageIO could not read image dimensions")
            throw ShareImportError.unreadableImage
        }
        logger.info("Decoded image dimensions: \(width.int64Value, privacy: .public)x\(height.int64Value, privacy: .public)")
        try SharedImageImportPolicy.validate(
            encodedBytes: encodedBytes,
            width: width.int64Value,
            height: height.int64Value
        )
    }

    private func makeThumbnail(at url: URL) -> UIImage? {
        guard let source = CGImageSourceCreateWithURL(url as CFURL, nil) else { return nil }
        let options: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: 900,
            kCGImageSourceShouldCacheImmediately: true,
        ]
        guard let image = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else {
            return nil
        }
        return UIImage(cgImage: image)
    }

    private func makeStyledQRCode(for value: String) -> UIImage? {
        guard let data = value.data(using: .utf8),
              let generator = CIFilter(name: "CIQRCodeGenerator") else {
            return nil
        }

        generator.setValue(data, forKey: "inputMessage")
        generator.setValue("H", forKey: "inputCorrectionLevel")
        guard let code = generator.outputImage else { return nil }

        let moduleScale = max(1, Int(720 / code.extent.width))
        let scaledCode = code.transformed(by: CGAffineTransform(scaleX: CGFloat(moduleScale), y: CGFloat(moduleScale)))
        let extent = scaledCode.extent.integral
        let mask = scaledCode.applyingFilter("CIColorInvert")
        let gradient = CIFilter(
            name: "CILinearGradient",
            parameters: [
                "inputPoint0": CIVector(x: extent.minX, y: extent.maxY),
                "inputPoint1": CIVector(x: extent.maxX, y: extent.minY),
                "inputColor0": CIColor(red: 12 / 255, green: 37 / 255, blue: 80 / 255),
                "inputColor1": CIColor(red: 30 / 255, green: 58 / 255, blue: 138 / 255),
            ]
        )?.outputImage?.cropped(to: extent)
        let background = CIImage(color: .white).cropped(to: extent)
        guard let gradient,
              let styledCode = CIFilter(
                  name: "CIBlendWithMask",
                  parameters: [
                      kCIInputImageKey: gradient,
                      kCIInputBackgroundImageKey: background,
                      kCIInputMaskImageKey: mask,
                  ]
              )?.outputImage?.cropped(to: extent),
              let cgImage = CIContext(options: [.useSoftwareRenderer: false]).createCGImage(styledCode, from: extent) else {
            return nil
        }

        // Match components/QRCode.tsx, which requests a one-module border.
        let quietZone = CGFloat(moduleScale)
        let canvasSize = CGSize(width: extent.width + quietZone * 2, height: extent.height + quietZone * 2)
        let rendererFormat = UIGraphicsImageRendererFormat()
        rendererFormat.opaque = true
        rendererFormat.scale = 1
        let renderer = UIGraphicsImageRenderer(size: canvasSize, format: rendererFormat)
        return renderer.image { context in
            UIColor.white.setFill()
            context.fill(CGRect(origin: .zero, size: canvasSize))
            context.cgContext.interpolationQuality = .none
            UIImage(cgImage: cgImage).draw(in: CGRect(x: quietZone, y: quietZone, width: extent.width, height: extent.height))

            guard SharedQRCodePreviewPolicy.shouldShowBlueWalletBranding(value),
                  let logo = UIImage(named: "qr-code", in: Bundle.main, compatibleWith: nil) else { return }
            // ReceiveDetails uses a 90-point logo in an approximately 271-point QR on phones.
            let logoSize = min(canvasSize.width, canvasSize.height) * (CGFloat(90) / 271)
            let moduleSize = CGFloat(moduleScale)
            let desiredBackdropModules = Int(ceil((logoSize + moduleSize) / moduleSize))
            let backdropModules = desiredBackdropModules.isMultiple(of: 2) ? desiredBackdropModules + 1 : desiredBackdropModules
            let backdropSize = CGFloat(backdropModules) * moduleSize
            let center = CGPoint(x: canvasSize.width / 2, y: canvasSize.height / 2)
            UIColor.white.setFill()
            context.fill(
                CGRect(
                    x: center.x - backdropSize / 2,
                    y: center.y - backdropSize / 2,
                    width: backdropSize,
                    height: backdropSize
                )
            )
            context.cgContext.interpolationQuality = .high
            logo.draw(
                in: CGRect(
                    x: center.x - logoSize / 2,
                    y: center.y - logoSize / 2,
                    width: logoSize,
                    height: logoSize
                )
            )
        }
    }
}

private struct ShareView: View {
    @ObservedObject var model: ShareViewModel

    var body: some View {
        NavigationView {
            GeometryReader { geometry in
                ScrollView {
                    VStack(spacing: 24) {
                        preview
                        if case .decision = model.phase, let decodedValue = model.decodedValue {
                            decodedPayload(decodedValue)
                        }

                        switch model.phase {
                        case .processing:
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle())
                            statusText(
                                title: localizedShareString("share_ui_processing_title", comment: "Processing title"),
                                message: localizedShareString("share_ui_processing_message", comment: "Processing explanation")
                            )
                        case .decision:
                            Image(systemName: "qrcode.viewfinder")
                                .font(.system(size: 34))
                                .foregroundColor(.accentColor)
                                .accessibilityHidden(true)
                            statusText(
                                title: localizedShareString("share_ui_found_title", comment: "QR code found title"),
                                message: localizedShareString("share_ui_found_message", comment: "QR code found explanation")
                            )
                        case let .failure(error):
                            Image(systemName: "exclamationmark.triangle.fill")
                                .font(.system(size: 34))
                                .foregroundColor(.orange)
                                .accessibilityHidden(true)
                            statusText(
                                title: localizedShareString("share_ui_failure_title", comment: "QR scan failure title"),
                                message: error.errorDescription
                            )
                            if let recovery = error.recoverySuggestion {
                                Text(recovery)
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                                    .multilineTextAlignment(.center)
                            }
                            if let anchor = error.helpAnchor, let url = URL(string: anchor) {
                                Link(localizedShareString("share_ui_help", comment: "Apple help button"), destination: url)
                            }
                        }
                    }
                    .padding(24)
                    .frame(
                        maxWidth: 420,
                        minHeight: max(0, geometry.size.height - 48),
                        alignment: .center
                    )
                    .frame(maxWidth: .infinity)
                }
                .background(Color(UIColor.systemBackground).ignoresSafeArea())
            }
            .navigationTitle("BlueWallet")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(localizedShareString("share_ui_close", comment: "Close button")) {
                        model.cancel()
                    }
                    .accessibilityHint(localizedShareString("share_ui_close_hint", comment: "Close button accessibility hint"))
                }
                ToolbarItem(placement: .confirmationAction) {
                    if let destination = model.openDestination, case .decision = model.phase {
                        Link(localizedShareString("share_ui_open", comment: "Open BlueWallet button"), destination: destination)
                            .buttonStyle(.borderedProminent)
                            .accessibilityHint(localizedShareString("share_ui_open_hint", comment: "Open button accessibility hint"))
                    }
                }
            }
        }
        .navigationViewStyle(.stack)
        .tint(Color.accentColor)
    }

    @ViewBuilder
    private var preview: some View {
        if let image = model.previewImage {
            if case .decision = model.phase {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
                    .padding(6)
                    .frame(maxWidth: 280, maxHeight: 252)
                    .background(Color.white)
                    .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                    .shadow(color: Color.black.opacity(0.12), radius: 12, y: 4)
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel(previewAccessibilityLabel)
                    .accessibilityAddTraits(.isImage)
                    .accessibilityIgnoresInvertColors(true)
            } else {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
                    .frame(maxWidth: 280, maxHeight: 240)
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel(previewAccessibilityLabel)
                    .accessibilityAddTraits(.isImage)
                    .accessibilityIgnoresInvertColors(true)
            }
        } else {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(Color(UIColor.tertiarySystemFill))
                .frame(width: 180, height: 150)
                .overlay(
                    Image(systemName: "photo")
                        .font(.system(size: 42))
                        .foregroundStyle(.secondary)
                )
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(localizedShareString("share_ui_image_preview", comment: "Shared image preview"))
                .accessibilityAddTraits(.isImage)
        }
    }

    private var previewAccessibilityLabel: String {
        if case .decision = model.phase {
            return localizedShareString("share_ui_qr_preview", comment: "Detected QR code preview")
        }
        return localizedShareString("share_ui_image_preview", comment: "Shared image preview")
    }

    private func decodedPayload(_ value: String) -> some View {
        Text(styledDecodedPayload(value))
            .multilineTextAlignment(.center)
            .textSelection(.enabled)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: 280, minHeight: 48)
            .padding(.horizontal, 16)
            .accessibilityLabel(value)
    }

    private func styledDecodedPayload(_ value: String) -> AttributedString {
        let characters = Array(value.replacingOccurrences(of: "\n", with: ""))
        let midpoint = Int(ceil(Double(characters.count) / 2))
        var highlighted = Set<Int>()

        if String(characters).lowercased().hasPrefix("bitcoin:"), characters.count > 8 {
            let addressStart = 8
            let addressEnd = characters[addressStart...].firstIndex(of: "?") ?? characters.endIndex
            highlighted.formUnion(addressStart..<min(addressStart + 6, addressEnd))
            highlighted.formUnion(max(addressStart, addressEnd - 6)..<addressEnd)
        } else {
            highlighted.formUnion(0..<min(6, characters.count))
            highlighted.formUnion(max(0, characters.count - 6)..<characters.count)
        }

        var result = AttributedString()
        for (index, character) in characters.enumerated() {
            if index == midpoint, characters.count > 1 {
                result.append(AttributedString("\n"))
            }
            var segment = AttributedString(String(character))
            segment.font = .system(size: 15, weight: highlighted.contains(index) ? .medium : .regular)
            segment.foregroundColor = highlighted.contains(index) ? .accentColor : Color(UIColor.secondaryLabel)
            result.append(segment)
        }
        return result
    }

    private func statusText(title: String, message: String?) -> some View {
        VStack(spacing: 8) {
            Text(title)
                .font(.title3.weight(.semibold))
                .multilineTextAlignment(.center)
            if let message {
                Text(message)
                    .font(.body)
                .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
        .accessibilityElement(children: .combine)
    }
}

final class ShareViewController: UIViewController {
    private let model = ShareViewModel()

    override func viewDidLoad() {
        super.viewDidLoad()
        let host = UIHostingController(rootView: ShareView(model: model))
        addChild(host)
        host.view.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(host.view)
        NSLayoutConstraint.activate([
            host.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            host.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            host.view.topAnchor.constraint(equalTo: view.topAnchor),
            host.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])
        host.didMove(toParent: self)
        preferredContentSize = CGSize(width: 420, height: 620)
        model.begin(with: extensionContext)
    }
}
