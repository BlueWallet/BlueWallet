import Foundation
import CoreImage
import Testing
import UIKit
import UniformTypeIdentifiers

@Suite("Shared image import policy")
struct SharedImageImportPolicyTests {
    @Test("Accepts an image exactly at both limits")
    func acceptsBoundaryValues() throws {
        try SharedImageImportPolicy.validate(
            encodedBytes: SharedImageImportPolicy.maximumEncodedBytes,
            width: 4_000,
            height: 4_000
        )
    }

    @Test("Rejects encoded files over 10 MB")
    func rejectsOversizedFile() {
        #expect(throws: ShareImportError.imageTooLarge) {
            try SharedImageImportPolicy.validate(
                encodedBytes: SharedImageImportPolicy.maximumEncodedBytes + 1,
                width: 1,
                height: 1
            )
        }
    }

    @Test("Rejects images over 16 megapixels")
    func rejectsOversizedDimensions() {
        #expect(throws: ShareImportError.imageDimensionsTooLarge) {
            try SharedImageImportPolicy.validate(encodedBytes: 1, width: 4_001, height: 4_000)
        }
    }

    @Test("Rejects invalid and overflowing dimensions")
    func rejectsInvalidDimensions() {
        let dimensions: [(width: Int64, height: Int64)] = [(0, 10), (-1, 10), (Int64.max, 2)]
        for dimension in dimensions {
            #expect(throws: (any Error).self) {
                try SharedImageImportPolicy.validate(encodedBytes: 1, width: dimension.width, height: dimension.height)
            }
        }
    }

    @Test("Only clearly Bitcoin and LNDHub values use BlueWallet branding")
    func recognizesBrandedQRValues() throws {
        for fixture in try brandingFixtures() {
            #expect(SharedQRCodePreviewPolicy.shouldShowBlueWalletBranding(fixture.value) == fixture.branded)
        }
    }

    @Test("Extracts only valid Bitcoin recipients")
    func extractsBitcoinRecipients() {
        #expect(SharedQRCodePreviewPolicy.bitcoinAddress(from: "bitcoin:1BoatSLRHtKNngkdXEeobR76b53LETtpyT?amount=1") == "1BoatSLRHtKNngkdXEeobR76b53LETtpyT")
        #expect(SharedQRCodePreviewPolicy.bitcoinAddress(from: "lightning:lnbc1example") == nil)
    }

    @Test("Share result layout supports narrow screens, dark mode, and accessibility text")
    func shareResultLayoutAdaptsToPlatformTraits() {
        #expect(ShareUILayout.usableContentWidth(availableWidth: 320) == 272)
        #expect(ShareUILayout.usableContentWidth(availableWidth: 1_024) == 372)

        let light = UITraitCollection(userInterfaceStyle: .light)
        let dark = UITraitCollection(userInterfaceStyle: .dark)
        #expect(UIColor.systemBackground.resolvedColor(with: light) != UIColor.systemBackground.resolvedColor(with: dark))

        let regular = UIFont.preferredFont(forTextStyle: .body, compatibleWith: UITraitCollection(preferredContentSizeCategory: .large))
        let accessibility = UIFont.preferredFont(
            forTextStyle: .body,
            compatibleWith: UITraitCollection(preferredContentSizeCategory: .accessibilityExtraExtraExtraLarge)
        )
        #expect(accessibility.pointSize >= regular.pointSize)
#if !targetEnvironment(macCatalyst)
        #expect(accessibility.pointSize > regular.pointSize)
#endif
    }

    @Test("Every error provides recovery guidance and official help")
    func errorsProvideHelp() {
        let errors: [ShareImportError] = [
            .unsupportedImage, .unreadableImage, .imageTooLarge, .imageDimensionsTooLarge,
            .storageUnavailable, .qrCodeNotFound, .importFailed,
            .openFailed,
        ]
        for error in errors {
            #expect(error.errorDescription?.isEmpty == false)
            #expect(error.recoverySuggestion?.isEmpty == false)
            #expect(error.helpAnchor?.hasPrefix("https://support.apple.com/") == true)
        }
    }

    @Test("Ignores auxiliary Photos attachments when multiple images are shared")
    func filtersSharedAttachmentsToImages() throws {
        let firstImage = NSItemProvider(item: UIImage(systemName: "qrcode")!, typeIdentifier: UTType.png.identifier)
        let livePhotoVideo = NSItemProvider(item: Data() as NSData, typeIdentifier: UTType.quickTimeMovie.identifier)
        let metadata = NSItemProvider(item: "metadata" as NSString, typeIdentifier: UTType.plainText.identifier)
        let secondImage = NSItemProvider(item: UIImage(systemName: "photo")!, typeIdentifier: UTType.jpeg.identifier)
        let firstItem = NSExtensionItem()
        firstItem.attachments = [firstImage, livePhotoVideo, metadata]
        let secondItem = NSExtensionItem()
        secondItem.attachments = [secondImage]

        let providers = ShareAttachmentPolicy.imageProviders(from: [firstItem, secondItem])

        #expect(providers.count == 2)
        #expect(providers[0] === firstImage)
        #expect(providers[1] === secondImage)
    }

    @Test("Extension localizations contain real guidance")
    func extensionLocalizationsContainRealGuidance() throws {
        let bundle = Bundle(for: ShareExtensionTestBundleToken.self)
        let expectedTitles = [
            "en": "Share between one and ten supported images.",
            "es": "Comparte entre una y diez imágenes compatibles.",
            "fr": "Partagez entre une et dix images prises en charge.",
        ]
        for (language, expectedTitle) in expectedTitles {
            let path = try #require(bundle.path(forResource: language, ofType: "lproj"))
            let localizedBundle = try #require(Bundle(path: path))
            #expect(localizedBundle.localizedString(forKey: "share_error_unsupported_image", value: nil, table: nil) == expectedTitle)
            #expect(
                localizedBundle.localizedString(forKey: "share_recovery_unsupported_image", value: nil, table: nil)
                    != "share_recovery_unsupported_image"
            )
            for key in [
                "share_ui_close", "share_ui_close_hint", "share_ui_failure_title", "share_ui_found_message",
                "share_ui_found_title", "share_ui_help", "share_ui_image_preview", "share_ui_open",
                "share_ui_open_hint", "share_ui_processing_message", "share_ui_processing_title",
                "share_ui_qr_preview", "share_ui_selection_message", "share_ui_selection_title",
                "share_error_open_failed", "share_recovery_open_failed",
            ] {
                #expect(localizedBundle.localizedString(forKey: key, value: nil, table: nil) != key)
            }
        }
    }
}

private func brandingFixtures() throws -> [(branded: Bool, value: String)] {
    var repositoryRoot = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
    let fixturePath = "tests/fixtures/shared-qr-branding.tsv"
    while repositoryRoot.path != "/",
          !FileManager.default.fileExists(atPath: repositoryRoot.appendingPathComponent(fixturePath).path) {
        repositoryRoot.deleteLastPathComponent()
    }
    let contents = try String(contentsOf: repositoryRoot.appendingPathComponent(fixturePath), encoding: .utf8)
    return contents.split(separator: "\n").compactMap { line in
        guard !line.hasPrefix("#"), let separator = line.firstIndex(of: "\t") else { return nil }
        return (line[..<separator] == "true", String(line[line.index(after: separator)...]))
    }
}

private final class ShareExtensionTestBundleToken {}

@Suite("QR image decoder")
struct QRCodeImageDecoderTests {
    @Test("Decodes a generated Bitcoin QR image")
    func decodesGeneratedBitcoinQRCode() throws {
        let expected = "bitcoin:1BoatSLRHtKNngkdXEeobR76b53LETtpyT"
        let filter = try #require(CIFilter(name: "CIQRCodeGenerator"))
        filter.setValue(try #require(expected.data(using: .utf8)), forKey: "inputMessage")
        let output = try #require(filter.outputImage).transformed(by: CGAffineTransform(scaleX: 12, y: 12))
        let image = try #require(CIContext().createCGImage(output, from: output.extent))
        let data = try #require(UIImage(cgImage: image).pngData())

        #expect(try QRCodeImageDecoder.decode(data: data) == expected)
    }
}
