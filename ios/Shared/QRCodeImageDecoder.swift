import Foundation
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
            try VNImageRequestHandler(cgImage: image, options: [:]).perform([request])
            return request.results?.compactMap(\.payloadStringValue).first
        }
    }

    private enum DecodeError: Error {
        case unreadableImage
    }
}
