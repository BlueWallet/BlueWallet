import CryptoKit
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

enum ShareUILayout {
    static let horizontalPadding: CGFloat = 24
    static let maximumContentWidth: CGFloat = 420
    static let maximumPreviewWidth: CGFloat = 280

    static func usableContentWidth(availableWidth: CGFloat) -> CGFloat {
        max(0, min(maximumContentWidth, availableWidth) - horizontalPadding * 2)
    }
}

enum SharedQRCodePreviewPolicy {
    static func bitcoinAddress(from value: String) -> String? {
        var candidate = value.trimmingCharacters(in: .whitespacesAndNewlines)
        if let schemeRange = candidate.range(of: #"^bitcoin:(//)?"#, options: [.regularExpression, .caseInsensitive]) {
            candidate.removeSubrange(schemeRange)
        }
        candidate = String(candidate.split(separator: "?", maxSplits: 1).first ?? "")
        return (isValidBech32Address(candidate) || isValidBase58CheckAddress(candidate)) ? candidate : nil
    }

    static func shouldShowBlueWalletBranding(_ value: String) -> Bool {
        let candidate = value.trimmingCharacters(in: .whitespacesAndNewlines)
        let lowercased = candidate.lowercased()
        if lowercased.hasPrefix("bitcoin:") || lowercased.hasPrefix("bitcoin://") {
            return true
        }
        if lowercased.hasPrefix("lndhub://") || lowercased.hasPrefix("blitzhub://") {
            return true
        }
        return bitcoinAddress(from: candidate) != nil
    }

    private static func isValidBech32Address(_ value: String) -> Bool {
        guard value.count <= 90, value == value.lowercased() || value == value.uppercased() else { return false }
        let candidate = value.lowercased()
        guard let separator = candidate.lastIndex(of: "1") else { return false }
        let hrp = String(candidate[..<separator])
        guard ["bc", "tb", "bcrt"].contains(hrp) else { return false }
        let alphabet = Array("qpzry9x8gf2tvdw0s3jn54khce6mua7l")
        let payload = candidate[candidate.index(after: separator)...]
        guard payload.count >= 6 else { return false }
        let values = payload.compactMap { alphabet.firstIndex(of: $0) }
        guard values.count == payload.count else { return false }
        let expanded = hrp.utf8.map { Int($0 >> 5) } + [0] + hrp.utf8.map { Int($0 & 31) }
        let checksum = polymod(expanded + values)
        return checksum == 1 || checksum == 0x2bc830a3
    }

    private static func polymod(_ values: [Int]) -> Int {
        let generators = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3]
        return values.reduce(1) { checksum, value in
            let top = checksum >> 25
            var next = (checksum & 0x1ffffff) << 5 ^ value
            for bit in 0..<5 where (top >> bit) & 1 == 1 { next ^= generators[bit] }
            return next
        }
    }

    private static func isValidBase58CheckAddress(_ value: String) -> Bool {
        guard (26...35).contains(value.count), value.hasPrefix("1") || value.hasPrefix("3") else { return false }
        let alphabet = Array("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz")
        var bytes: [UInt8] = []
        for character in value {
            guard let digit = alphabet.firstIndex(of: character) else { return false }
            var carry = digit
            for index in bytes.indices.reversed() {
                carry += Int(bytes[index]) * 58
                bytes[index] = UInt8(carry & 0xff)
                carry >>= 8
            }
            while carry > 0 {
                bytes.insert(UInt8(carry & 0xff), at: 0)
                carry >>= 8
            }
        }
        bytes.insert(contentsOf: repeatElement(0, count: value.prefix { $0 == "1" }.count), at: 0)
        guard bytes.count > 4 else { return false }
        let payload = Data(bytes.dropLast(4))
        let checksum = Data(SHA256.hash(data: Data(SHA256.hash(data: payload)))).prefix(4)
        return checksum.elementsEqual(bytes.suffix(4))
    }
}

enum ShareImportError: Int, LocalizedError, Equatable {
    case unsupportedImage = 1
    case unreadableImage
    case imageTooLarge
    case imageDimensionsTooLarge
    case storageUnavailable
    case qrCodeNotFound
    case importFailed
    case openFailed

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
        case .importFailed:
            localizedShareString("share_error_import_failed", comment: "Shared image import failed")
        case .openFailed:
            localizedShareString("share_error_open_failed", comment: "BlueWallet could not be opened")
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
        case .storageUnavailable:
            localizedShareString("share_recovery_open_bluewallet", comment: "How to make BlueWallet available")
        case .importFailed:
            localizedShareString("share_recovery_import_failed", comment: "How to retry a failed import")
        case .openFailed:
            localizedShareString("share_recovery_open_failed", comment: "How to open BlueWallet after sharing")
        }
    }

    var helpAnchor: String? {
        "https://support.apple.com/guide/iphone/share-photos-and-videos-iphf28f17237/ios"
    }
}
