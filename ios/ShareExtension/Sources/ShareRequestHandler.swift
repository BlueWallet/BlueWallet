import CoreImage
import Foundation
import ImageIO
import OSLog
import SwiftUI
import UIKit
import UniformTypeIdentifiers

enum SharePhase {
    case processing
    case decision
    case failure(ShareImportError)
}

enum ShareAttachmentPolicy {
    static let maximumImageCount = 10

    static func imageProviders(from inputItems: [Any]) -> [NSItemProvider] {
        inputItems
            .compactMap { $0 as? NSExtensionItem }
            .flatMap { $0.attachments ?? [] }
            .filter { provider in
                provider.registeredTypeIdentifiers.contains { identifier in
                    UTType(identifier)?.conforms(to: .image) == true
                }
            }
    }
}

final class ShareViewModel: ObservableObject {
    @Published private(set) var phase: SharePhase = .processing
    @Published private(set) var previewImage: UIImage?
    @Published private(set) var openDestination: URL?
    @Published private(set) var decodedValue: String?
    @Published private(set) var decodedValues: [String] = []

    var requiresQRCodeSelection: Bool {
        decodedValues.count > 1 && bitcoinAddresses.count != decodedValues.count
    }

    var bitcoinAddresses: [String] {
        decodedValues.compactMap { SharedQRCodePreviewPolicy.bitcoinAddress(from: $0) }
    }

    var valuesToOpen: [String] {
        requiresQRCodeSelection ? decodedValue.map { [$0] } ?? [] : decodedValues
    }

    private let logger = Logger(
        subsystem: Bundle.main.bundleIdentifier ?? "io.bluewallet.bluewallet.ShareExtension",
        category: "ShareRequest"
    )
    private weak var context: NSExtensionContext?
    private let stateLock = NSLock()
    private var finished = false
    private var activeLoad: Progress?
    private let pendingValueKey = "pendingSharedQRCode"
    private let pendingValuesKey = "pendingSharedQRValues"
    private let pendingCreatedAtKey = "pendingSharedQRCodeCreatedAt"
    private let pendingNonceKey = "pendingSharedQRCodeNonce"
    private let pendingVersionKey = "pendingSharedQRCodeVersion"

    private var isFinished: Bool {
        stateLock.lock()
        defer { stateLock.unlock() }
        return finished
    }

    @discardableResult
    private func finish() -> Bool {
        stateLock.lock()
        guard !finished else {
            stateLock.unlock()
            return false
        }
        finished = true
        let load = activeLoad
        activeLoad = nil
        stateLock.unlock()
        load?.cancel()
        return true
    }

    private func trackActiveLoad(_ load: Progress) {
        stateLock.lock()
        if finished {
            stateLock.unlock()
            load.cancel()
            return
        }
        activeLoad = load
        stateLock.unlock()
    }

    init(
        phase: SharePhase = .processing,
        previewImage: UIImage? = nil,
        openDestination: URL? = nil,
        decodedValue: String? = nil,
        decodedValues: [String]? = nil
    ) {
        self.phase = phase
        self.previewImage = previewImage
        self.openDestination = openDestination
        self.decodedValue = decodedValue
        self.decodedValues = decodedValues ?? decodedValue.map { [$0] } ?? []
    }

    func begin(with context: NSExtensionContext?) {
        guard let context else {
            logger.error("Share extension context is unavailable")
            showFailure(.importFailed)
            return
        }

        self.context = context
        logger.notice("Share request started")
        let providers = ShareAttachmentPolicy.imageProviders(from: context.inputItems)
        logger.info("Found \(providers.count, privacy: .public) image provider(s)")

        guard (1...ShareAttachmentPolicy.maximumImageCount).contains(providers.count) else {
            logger.error("Expected between one and ten image providers")
            showFailure(.unsupportedImage)
            return
        }

        process(providers: providers, index: 0, values: [], firstPreview: nil)
    }

    private func process(providers: [NSItemProvider], index: Int, values: [String], firstPreview: UIImage?) {
        guard index < providers.count else {
            let uniqueValues = values.reduce(into: [String]()) { result, value in
                if !result.contains(value) { result.append(value) }
            }
            guard !uniqueValues.isEmpty else {
                showFailure(.qrCodeNotFound, preview: firstPreview)
                return
            }
            let first = uniqueValues[0]
            DispatchQueue.main.async {
                guard !self.isFinished else { return }
                self.previewImage = self.makeStyledQRCode(for: first) ?? firstPreview
                self.decodedValue = first
                self.decodedValues = uniqueValues
                self.openDestination = URL(string: "bluewallet://shared-image")
                self.phase = .decision
            }
            return
        }

        let provider = providers[index]
        let registeredTypes = provider.registeredTypeIdentifiers.joined(separator: ", ")
        logger.info("Provider registered types: \(registeredTypes, privacy: .public)")
        guard let imageTypeIdentifier = provider.registeredTypeIdentifiers.first(where: { identifier in
            UTType(identifier)?.conforms(to: .image) == true
        }) else {
            logger.error("No registered provider type conforms to public.image")
            process(providers: providers, index: index + 1, values: values, firstPreview: firstPreview)
            return
        }

        logger.info("Loading image representation as \(imageTypeIdentifier, privacy: .public)")
        let load = provider.loadFileRepresentation(forTypeIdentifier: imageTypeIdentifier) { [weak self] sourceURL, error in
            guard let self, !self.isFinished else { return }
            // NSItemProvider owns this temporary URL only for the duration of
            // the callback, so finish reading it before returning.
            self.processLoadedFile(
                sourceURL,
                error: error,
                providers: providers,
                index: index,
                values: values,
                firstPreview: firstPreview
            )
        }
        trackActiveLoad(load)
    }

    private func processLoadedFile(
        _ sourceURL: URL?,
        error: Error?,
        providers: [NSItemProvider],
        index: Int,
        values: [String],
        firstPreview: UIImage?
    ) {
        autoreleasepool {
            guard !isFinished else { return }
            if let error = error as NSError? {
                logger.error("Image provider load failed: domain=\(error.domain, privacy: .public) code=\(error.code, privacy: .public)")
            }
            guard error == nil, let sourceURL else {
                logger.error("Image provider returned no readable file URL")
                process(providers: providers, index: index + 1, values: values, firstPreview: firstPreview)
                return
            }

            logger.info("Image file representation loaded")
            do {
                guard let size = try sourceURL.resourceValues(forKeys: [.fileSizeKey]).fileSize else {
                    logger.error("Image file representation has no file size")
                    process(providers: providers, index: index + 1, values: values, firstPreview: firstPreview)
                    return
                }

                logger.info("Validating image with \(size, privacy: .public) encoded bytes")
                try validateImage(at: sourceURL, encodedBytes: Int64(size))
                let preview = makeThumbnail(at: sourceURL)
                logger.info("Image validation succeeded; previewCreated=\(preview != nil, privacy: .public)")
                logger.info("Starting QR decode")
                guard let value = try QRCodeImageDecoder.decode(at: sourceURL) else {
                    logger.error("QR decode completed without a result")
                    process(providers: providers, index: index + 1, values: values, firstPreview: firstPreview ?? preview)
                    return
                }
                guard !isFinished else { return }
                logger.info("QR decode succeeded; payload length=\(value.utf8.count, privacy: .public)")
                process(providers: providers, index: index + 1, values: values + [value], firstPreview: firstPreview ?? preview)
            } catch let error as ShareImportError {
                logger.error("Share import rejected with code \(error.rawValue, privacy: .public)")
                process(providers: providers, index: index + 1, values: values, firstPreview: firstPreview)
            } catch {
                let nsError = error as NSError
                logger.error("Unexpected import failure: domain=\(nsError.domain, privacy: .public) code=\(nsError.code, privacy: .public)")
                process(providers: providers, index: index + 1, values: values, firstPreview: firstPreview)
            }
        }
    }

    func cancel() {
        guard finish() else { return }
        logger.notice("User closed the share request")
        context?.completeRequest(returningItems: nil)
    }

    func selectDecodedValue(_ value: String) {
        guard decodedValues.contains(value) else { return }
        decodedValue = value
        previewImage = makeStyledQRCode(for: value)
    }

    func confirmOpen() {
        let confirmedValues = valuesToOpen
        guard !isFinished, case .decision = phase, !confirmedValues.isEmpty,
              let destination = openDestination,
              let defaults = UserDefaults(suiteName: "group.io.bluewallet.bluewallet") else {
            showFailure(.storageUnavailable, preview: previewImage)
            return
        }
        clearPendingPayload(in: defaults)
        defaults.set(confirmedValues, forKey: pendingValuesKey)
        defaults.set(Date().timeIntervalSince1970, forKey: pendingCreatedAtKey)
        defaults.set(UUID().uuidString, forKey: pendingNonceKey)
        defaults.set(2, forKey: pendingVersionKey)
        defaults.synchronize()
        guard defaults.stringArray(forKey: pendingValuesKey) == confirmedValues,
              defaults.string(forKey: pendingNonceKey) != nil else {
            clearPendingPayload(in: defaults)
            logger.error("Could not verify the confirmed QR payload in the shared app group")
            showFailure(.storageUnavailable, preview: previewImage)
            return
        }
        logger.info("Stored the user-confirmed pending QR payload in the app group")
        let openTimeout = DispatchWorkItem { [weak self] in
            guard let self, self.finish() else { return }
            self.clearPendingPayload(in: defaults)
            self.logger.error("Timed out while asking the system to open BlueWallet")
            self.context?.cancelRequest(withError: ShareImportError.openFailed as NSError)
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 8, execute: openTimeout)
        context?.open(destination) { [weak self] opened in
            DispatchQueue.main.async {
                openTimeout.cancel()
                guard let self, !self.isFinished else { return }
                if opened {
                    guard self.finish() else { return }
                    self.logger.notice("Opened BlueWallet for the confirmed QR payload")
                    self.context?.completeRequest(returningItems: nil)
                } else {
                    self.clearPendingPayload(in: defaults)
                    self.logger.error("The extension context could not open BlueWallet")
                    self.showFailure(.openFailed, preview: self.previewImage)
                }
            }
        }
    }

    private func clearPendingPayload() {
        guard let defaults = UserDefaults(suiteName: "group.io.bluewallet.bluewallet") else { return }
        clearPendingPayload(in: defaults)
    }

    private func clearPendingPayload(in defaults: UserDefaults) {
        defaults.removeObject(forKey: pendingValueKey)
        defaults.removeObject(forKey: pendingValuesKey)
        defaults.removeObject(forKey: pendingCreatedAtKey)
        defaults.removeObject(forKey: pendingNonceKey)
        defaults.removeObject(forKey: pendingVersionKey)
    }

    private func showFailure(_ error: ShareImportError, preview: UIImage? = nil) {
        DispatchQueue.main.async {
            guard !self.isFinished else { return }
            if let preview {
                self.previewImage = preview
            }
            self.openDestination = nil
            self.decodedValue = nil
            self.decodedValues = []
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
        var usesHighCorrection = true
        var code = generator.outputImage
        if code == nil {
            usesHighCorrection = false
            generator.setValue("L", forKey: "inputCorrectionLevel")
            code = generator.outputImage
        }
        guard let code else { return nil }

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
              )?.outputImage?.cropped(to: extent) else {
            return nil
        }
        let imageContext = CIContext(options: [.cacheIntermediates: false])
        guard let cgImage = imageContext.createCGImage(styledCode, from: extent) else { return nil }
        imageContext.clearCaches()

        // CIQRCodeGenerator already includes the same one-module quiet zone
        // requested by components/QRCode.tsx. Adding another border here makes
        // the share preview visibly smaller than ReceiveDetails.
        let canvasSize = extent.size
        let rendererFormat = UIGraphicsImageRendererFormat()
        rendererFormat.opaque = true
        rendererFormat.scale = 1
        let renderer = UIGraphicsImageRenderer(size: canvasSize, format: rendererFormat)
        return renderer.image { context in
            UIColor.white.setFill()
            context.fill(CGRect(origin: .zero, size: canvasSize))
            context.cgContext.interpolationQuality = .none
            UIImage(cgImage: cgImage).draw(in: CGRect(origin: .zero, size: extent.size))

            guard usesHighCorrection, SharedQRCodePreviewPolicy.shouldShowBlueWalletBranding(value),
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

struct ShareView: View {
    @ObservedObject var model: ShareViewModel

    var body: some View {
        NavigationView {
            GeometryReader { geometry in
                ScrollView {
                    VStack(spacing: 24) {
                        preview
                        if case .decision = model.phase, !model.decodedValues.isEmpty {
                            if model.requiresQRCodeSelection {
                                qrCodeSelection
                            } else if model.bitcoinAddresses.count > 1 {
                                BitcoinAddressDeck(addresses: model.bitcoinAddresses)
                            } else {
                                let addresses = model.bitcoinAddresses
                                decodedPayload(addresses.count == model.decodedValues.count ? addresses.joined(separator: "\n") : model.decodedValue ?? "")
                            }
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
                                title: localizedShareString(
                                    model.requiresQRCodeSelection ? "share_ui_selection_title" : "share_ui_found_title",
                                    comment: "QR code result title"
                                ),
                                message: localizedShareString(
                                    model.requiresQRCodeSelection ? "share_ui_selection_message" : "share_ui_found_message",
                                    comment: "QR code result explanation"
                                )
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
                    .padding(ShareUILayout.horizontalPadding)
                    .frame(
                        maxWidth: ShareUILayout.maximumContentWidth,
                        minHeight: max(0, geometry.size.height - ShareUILayout.horizontalPadding * 2),
                        alignment: .center
                    )
                    .frame(maxWidth: .infinity)
                }
                .background(Color(UIColor.systemBackground).ignoresSafeArea())
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(localizedShareString("share_ui_close", comment: "Close button")) {
                        model.cancel()
                    }
                    .accessibilityHint(localizedShareString("share_ui_close_hint", comment: "Close button accessibility hint"))
                }
                ToolbarItem(placement: .confirmationAction) {
                    if model.openDestination != nil, case .decision = model.phase {
                        Button(localizedShareString("share_ui_open", comment: "Open BlueWallet button")) {
                            model.confirmOpen()
                        }
                            .buttonStyle(.borderedProminent)
                            .accessibilityHint(localizedShareString("share_ui_open_hint", comment: "Open button accessibility hint"))
                    }
                }
                ToolbarItem(placement: .principal) {
                    Text("BlueWallet")
                        .font(.headline)
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
                    .frame(maxWidth: ShareUILayout.maximumPreviewWidth, maxHeight: 252)
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
                    .frame(maxWidth: ShareUILayout.maximumPreviewWidth, maxHeight: 240)
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
            .frame(maxWidth: ShareUILayout.maximumPreviewWidth, minHeight: 48)
            .padding(.horizontal, 16)
            .accessibilityLabel(value)
    }

    private var qrCodeSelection: some View {
        VStack(spacing: 8) {
            ForEach(Array(model.decodedValues.enumerated()), id: \.offset) { index, value in
                Button {
                    model.selectDecodedValue(value)
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: model.decodedValue == value ? "checkmark.circle.fill" : "circle")
                            .foregroundStyle(model.decodedValue == value ? Color.accentColor : Color.secondary)
                        Text(value)
                            .font(.body.monospaced())
                            .lineLimit(2)
                            .multilineTextAlignment(.leading)
                        Spacer(minLength: 0)
                    }
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("\(index + 1). \(value)")
                .accessibilityAddTraits(model.decodedValue == value ? .isSelected : [])
            }
        }
        .frame(maxWidth: ShareUILayout.maximumPreviewWidth)
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

struct BitcoinAddressDeck: View {
    let addresses: [String]
    private let automaticallyPresents: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var isPresented: Bool

    init(addresses: [String], isPresented: Bool = false, automaticallyPresents: Bool = true) {
        self.addresses = addresses
        self.automaticallyPresents = automaticallyPresents
        _isPresented = State(initialValue: isPresented)
    }

    var body: some View {
        ZStack(alignment: .top) {
            ForEach(Array(addresses.enumerated()), id: \.offset) { index, address in
                Text(address)
                    .font(.system(size: 12, weight: .medium, design: .monospaced))
                    .foregroundStyle(Color(UIColor.label))
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 14)
                    .frame(maxWidth: .infinity, minHeight: 58)
                    .background(Color(UIColor.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(Color(UIColor.separator).opacity(0.35), lineWidth: 0.5)
                    )
                    .shadow(color: Color.black.opacity(0.10), radius: 5, y: 2)
                    .offset(
                        x: isPresented ? (index.isMultiple(of: 2) ? -3 : 3) : 0,
                        y: isPresented ? CGFloat(index) * 14 : 28
                    )
                    .rotationEffect(.degrees(isPresented ? (index.isMultiple(of: 2) ? -1.2 : 1.2) : 0))
                    .opacity(isPresented ? 1 : (index == 0 ? 1 : 0.45))
                    .zIndex(Double(addresses.count - index))
                    .animation(
                        reduceMotion ? nil : .spring(response: 0.48, dampingFraction: 0.78).delay(Double(index) * 0.055),
                        value: isPresented
                    )
                    .accessibilityLabel(address)
            }
        }
        .frame(maxWidth: ShareUILayout.maximumPreviewWidth, minHeight: 58 + CGFloat(max(0, addresses.count - 1)) * 14)
        .onAppear {
            if automaticallyPresents {
                isPresented = true
            }
        }
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

    override func viewDidDisappear(_ animated: Bool) {
        super.viewDidDisappear(animated)
        model.cancel()
    }

    deinit {
        model.cancel()
    }
}
