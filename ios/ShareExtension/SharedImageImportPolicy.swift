import Foundation

private final class ShareExtensionBundleToken {}

func localizedShareString(_ key: String, comment: String) -> String {
    NSLocalizedString(key, bundle: Bundle(for: ShareExtensionBundleToken.self), comment: comment)
}

enum SharedImageImportPolicy {
    static let maximumEncodedBytes: Int64 = 10 * 1024 * 1024
    static let maximumPixelCount: Int64 = 16_000_000

    static func validate(encodedBytes: Int64, width: Int64, height: Int64) throws {
        guard encodedBytes >= 0 else { throw ShareImportError.unreadableImage }
        guard encodedBytes <= maximumEncodedBytes else { throw ShareImportError.imageTooLarge }
        guard width > 0, height > 0 else { throw ShareImportError.unreadableImage }

        let pixelCount = width.multipliedReportingOverflow(by: height)
        guard !pixelCount.overflow, pixelCount.partialValue <= maximumPixelCount else {
            throw ShareImportError.imageDimensionsTooLarge
        }
    }
}

enum SharedQRCodePreviewPolicy {
    static func shouldShowBlueWalletBranding(_ value: String) -> Bool {
        let candidate = value.trimmingCharacters(in: .whitespacesAndNewlines)
        let lowercased = candidate.lowercased()
        if lowercased.hasPrefix("bitcoin:") || lowercased.hasPrefix("bitcoin://") {
            return true
        }
        if lowercased.hasPrefix("lndhub://") || lowercased.hasPrefix("blitzhub://") {
            return true
        }
        if lowercased.hasPrefix("bc1") || lowercased.hasPrefix("tb1") || lowercased.hasPrefix("bcrt1") {
            return candidate.count >= 14 && candidate.count <= 90
        }
        let base58 = CharacterSet(charactersIn: "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz")
        return (candidate.hasPrefix("1") || candidate.hasPrefix("3"))
            && (26...62).contains(candidate.count)
            && candidate.unicodeScalars.allSatisfy(base58.contains)
    }
}

enum ShareImportError: Int, LocalizedError, Equatable {
    case unsupportedImage = 1
    case unreadableImage
    case imageTooLarge
    case imageDimensionsTooLarge
    case storageUnavailable
    case qrCodeNotFound
    case couldNotOpenBlueWallet
    case importFailed

    var errorDescription: String? {
        switch self {
        case .unsupportedImage:
            localizedShareString("share_error_unsupported_image", comment: "Unsupported shared image")
        case .unreadableImage:
            localizedShareString("share_error_unreadable_image", comment: "Shared image cannot be read")
        case .imageTooLarge:
            localizedShareString("share_error_image_too_large", comment: "Shared image exceeds size limit")
        case .imageDimensionsTooLarge:
            localizedShareString("share_error_image_dimensions_too_large", comment: "Shared image dimensions exceed limit")
        case .storageUnavailable:
            localizedShareString("share_error_storage_unavailable", comment: "Shared storage is unavailable")
        case .qrCodeNotFound:
            localizedShareString("share_error_qr_not_found", comment: "No QR code in shared image")
        case .couldNotOpenBlueWallet:
            localizedShareString("share_error_could_not_open", comment: "BlueWallet could not be opened")
        case .importFailed:
            localizedShareString("share_error_import_failed", comment: "Shared image import failed")
        }
    }

    var recoverySuggestion: String? {
        switch self {
        case .unsupportedImage:
            localizedShareString("share_recovery_unsupported_image", comment: "How to share one image")
        case .unreadableImage:
            localizedShareString("share_recovery_unreadable_image", comment: "How to convert an unreadable image")
        case .imageTooLarge, .imageDimensionsTooLarge:
            localizedShareString("share_recovery_image_too_large", comment: "How to reduce a shared image")
        case .qrCodeNotFound:
            localizedShareString("share_recovery_qr_not_found", comment: "How to prepare a QR image")
        case .storageUnavailable, .couldNotOpenBlueWallet:
            localizedShareString("share_recovery_open_bluewallet", comment: "How to make BlueWallet available")
        case .importFailed:
            localizedShareString("share_recovery_import_failed", comment: "How to retry a failed import")
        }
    }

    var helpAnchor: String? {
        "https://support.apple.com/guide/iphone/share-photos-and-videos-iphf28f17237/ios"
    }
}
