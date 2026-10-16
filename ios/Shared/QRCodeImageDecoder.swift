import Foundation
import CoreImage
import ImageIO
import Vision

enum QRCodeImageDecoder {
    private static let maximumDecodeDimension = 2_048
    private static let maximumDecodeDuration: TimeInterval = 5

    static func decode(at url: URL) throws -> String? {
        guard let source = CGImageSourceCreateWithURL(url as CFURL, nil) else {
            throw DecodeError.unreadableImage
        }
        return try decode(source: source)
    }

    static func decode(data: Data) throws -> String? {
        guard let source = CGImageSourceCreateWithData(data as CFData, nil) else {
            throw DecodeError.unreadableImage
        }
        return try decode(source: source)
    }

    private static func decode(source: CGImageSource) throws -> String? {
        try autoreleasepool {
            let options: [CFString: Any] = [
                kCGImageSourceCreateThumbnailFromImageAlways: true,
                kCGImageSourceCreateThumbnailWithTransform: true,
                kCGImageSourceThumbnailMaxPixelSize: maximumDecodeDimension,
                kCGImageSourceShouldCacheImmediately: true,
            ]
            guard let image = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) else {
                throw DecodeError.unreadableImage
            }

            let request = VNDetectBarcodesRequest()
            request.symbologies = [.qr]
            let cancellation = DispatchWorkItem { request.cancel() }
            DispatchQueue.global(qos: .userInitiated).asyncAfter(
                deadline: .now() + maximumDecodeDuration,
                execute: cancellation
            )
            defer { cancellation.cancel() }
            do {
                try VNImageRequestHandler(cgImage: image, options: [:]).perform([request])
                if let value = request.results?.compactMap(\.payloadStringValue).first {
                    return value
                }
            } catch {
                // Vision can fail to create its inference context in Simulator
                // and constrained extension processes. Continue with Apple's
                // lightweight Core Image detector instead of rejecting the QR.
            }

            return decodeWithCoreImage(image)
        }
    }

    private static func decodeWithCoreImage(_ image: CGImage) -> String? {
        guard let detector = CIDetector(
            ofType: CIDetectorTypeQRCode,
            context: CIContext(options: [.cacheIntermediates: false]),
            options: [CIDetectorAccuracy: CIDetectorAccuracyHigh]
        ) else { return nil }
        return detector.features(in: CIImage(cgImage: image))
            .compactMap { ($0 as? CIQRCodeFeature)?.messageString }
            .first
    }

    private enum DecodeError: Error {
        case unreadableImage
    }
}
