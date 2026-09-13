import QuickLookThumbnailing
import UIKit

final class ThumbnailProvider: QLThumbnailProvider {
    override func provideThumbnail(for request: QLFileThumbnailRequest, _ handler: @escaping (QLThumbnailReply?, Error?) -> Void) {
        let details = PSBTDetails.read(url: request.fileURL)
        handler(QLThumbnailReply(contextSize: request.maximumSize) { context in
            let bounds = context.boundingBoxOfClipPath
            context.setFillColor(UIColor.systemBackground.cgColor); context.fill(bounds)
            context.setFillColor(UIColor.systemBlue.cgColor); context.fill(CGRect(x: 0, y: 0, width: 12, height: bounds.height))
            // Core Graphics uses a bottom-left origin while UIKit text uses a
            // top-left origin. Flip only for UIKit's drawing calls.
            context.translateBy(x: 0, y: bounds.height)
            context.scaleBy(x: 1, y: -1)
            UIGraphicsPushContext(context)
            defer { UIGraphicsPopContext() }
            let title = "PSBT"
            let detail = details ?? "Partially Signed Bitcoin Transaction"
            let paragraph = NSMutableParagraphStyle(); paragraph.lineBreakMode = .byTruncatingTail
            title.draw(in: CGRect(x: 28, y: bounds.height * 0.28, width: bounds.width - 42, height: 36), withAttributes: [.font: UIFont.boldSystemFont(ofSize: min(28, bounds.height * 0.22)), .foregroundColor: UIColor.label, .paragraphStyle: paragraph])
            detail.draw(in: CGRect(x: 28, y: bounds.height * 0.58, width: bounds.width - 42, height: 44), withAttributes: [.font: UIFont.systemFont(ofSize: min(15, bounds.height * 0.12)), .foregroundColor: UIColor.secondaryLabel, .paragraphStyle: paragraph])
            return true
        }, nil)
    }
}

private enum PSBTDetails {
    static func read(url: URL) -> String? {
        guard let source = try? Data(contentsOf: url) else { return nil }
        let data = source.starts(with: [0x70, 0x73, 0x62, 0x74, 0xff]) ? source : Data(base64Encoded: String(data: source, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? "")
        guard let data, data.starts(with: [0x70, 0x73, 0x62, 0x74, 0xff]) else { return nil }
        var reader = Reader(Array(data)); guard reader.skip(5), let map = reader.map(), let tx = map[[0]] else { return nil }
        var transaction = Reader(tx); guard transaction.skip(4), let inputs = transaction.compact() else { return nil }
        for _ in 0..<inputs { guard transaction.skip(36), let script = transaction.compact(), transaction.skip(script), transaction.skip(4) else { return nil } }
        guard let outputs = transaction.compact() else { return nil }; var total: UInt64 = 0
        for _ in 0..<outputs { guard let amount = transaction.uint64(), let script = transaction.compact(), transaction.skip(script) else { return nil }; total += amount }
        let sats = NumberFormatter.localizedString(from: NSNumber(value: total), number: .decimal)
        return "\(inputs) input\(inputs == 1 ? "" : "s") · \(outputs) output\(outputs == 1 ? "" : "s")\n\(sats) sats"
    }

    private struct Reader {
        var bytes: [UInt8]; var offset = 0
        init(_ bytes: [UInt8]) { self.bytes = bytes }
        mutating func skip(_ count: Int) -> Bool { guard count >= 0, offset + count <= bytes.count else { return false }; offset += count; return true }
        mutating func compact() -> Int? { guard offset < bytes.count else { return nil }; let first = bytes[offset]; offset += 1; let size: Int; switch first { case 0xfd: size = 2; case 0xfe: size = 4; case 0xff: size = 8; default: return Int(first) }; guard offset + size <= bytes.count else { return nil }; let value = bytes[offset..<(offset + size)].enumerated().reduce(0) { $0 | Int($1.element) << (8 * $1.offset) }; offset += size; return value }
        mutating func uint64() -> UInt64? { guard offset + 8 <= bytes.count else { return nil }; let value = bytes[offset..<(offset + 8)].enumerated().reduce(0) { $0 | UInt64($1.element) << UInt64(8 * $1.offset) }; offset += 8; return value }
        mutating func map() -> [[UInt8]: [UInt8]]? { var result: [[UInt8]: [UInt8]] = [:]; while let keySize = compact() { if keySize == 0 { return result }; guard offset + keySize <= bytes.count else { return nil }; let key = Array(bytes[offset..<(offset + keySize)]); offset += keySize; guard let valueSize = compact(), offset + valueSize <= bytes.count else { return nil }; result[key] = Array(bytes[offset..<(offset + valueSize)]); offset += valueSize }; return nil }
    }
}
