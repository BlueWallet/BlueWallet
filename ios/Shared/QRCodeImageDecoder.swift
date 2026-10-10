import Foundation
import Vision

enum QRCodeImageDecoder {
    static func decode(at url: URL) throws -> String? {
        let request = VNDetectBarcodesRequest()
        request.symbologies = [.qr]
        try VNImageRequestHandler(url: url, options: [:]).perform([request])
        return request.results?.compactMap(\.payloadStringValue).first
    }
}
