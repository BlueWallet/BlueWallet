import Foundation
import Testing

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
    func recognizesBrandedQRValues() {
        #expect(SharedQRCodePreviewPolicy.shouldShowBlueWalletBranding("bitcoin:bc1qexample?amount=0.01"))
        #expect(SharedQRCodePreviewPolicy.shouldShowBlueWalletBranding("1BoatSLRHtKNngkdXEeobR76b53LETtpyT"))
        #expect(SharedQRCodePreviewPolicy.shouldShowBlueWalletBranding("lndhub://login:password"))
        #expect(SharedQRCodePreviewPolicy.shouldShowBlueWalletBranding("blitzhub://login:password"))
        #expect(!SharedQRCodePreviewPolicy.shouldShowBlueWalletBranding("https://example.com"))
        #expect(!SharedQRCodePreviewPolicy.shouldShowBlueWalletBranding("plain text"))
    }

    @Test("Every error provides recovery guidance and official help")
    func errorsProvideHelp() {
        let errors: [ShareImportError] = [
            .unsupportedImage, .unreadableImage, .imageTooLarge, .imageDimensionsTooLarge,
            .storageUnavailable, .qrCodeNotFound, .couldNotOpenBlueWallet, .importFailed,
        ]
        for error in errors {
            #expect(error.errorDescription?.isEmpty == false)
            #expect(error.recoverySuggestion?.isEmpty == false)
            #expect(error.helpAnchor?.hasPrefix("https://support.apple.com/") == true)
        }
    }

    @Test("Extension localizations contain real guidance")
    func extensionLocalizationsContainRealGuidance() throws {
        let bundle = Bundle(for: ShareExtensionTestBundleToken.self)
        let expectedTitles = [
            "en": "Share one supported image at a time.",
            "es": "Comparte una imagen compatible a la vez.",
            "fr": "Partagez une seule image compatible à la fois.",
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
                "share_ui_cancel", "share_ui_close", "share_ui_close_hint", "share_ui_failure_title", "share_ui_found_message",
                "share_ui_found_title", "share_ui_help", "share_ui_image_preview", "share_ui_open",
                "share_ui_open_hint", "share_ui_opening", "share_ui_processing_message", "share_ui_processing_title",
                "share_ui_qr_preview",
            ] {
                #expect(localizedBundle.localizedString(forKey: key, value: nil, table: nil) != key)
            }
        }
    }
}

private final class ShareExtensionTestBundleToken {}
