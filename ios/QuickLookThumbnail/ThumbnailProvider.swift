import QuickLookThumbnailing
import UIKit

final class ThumbnailProvider: QLThumbnailProvider {
    override func provideThumbnail(for request: QLFileThumbnailRequest, _ handler: @escaping (QLThumbnailReply?, Error?) -> Void) {
        if request.fileURL.pathExtension.lowercased() == "bwcoord" {
            do {
                let setup = try MultisigCoordination.parse(file: request.fileURL)
                let size = request.maximumSize
                handler(QLThumbnailReply(contextSize: size, currentContextDrawing: {
                    VaultThumbnail.draw(setup: setup, size: size)
                }), nil)
            } catch {
                handler(nil, error)
            }
            return
        }
        let preview = FileDetails.read(url: request.fileURL)
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
            let title = preview?.title ?? "PSBT"
            let detail = preview?.detail ?? "Partially Signed Bitcoin Transaction"
            let paragraph = NSMutableParagraphStyle(); paragraph.lineBreakMode = .byTruncatingTail
            let titleSize = min(30, max(18, bounds.height * 0.24))
            let detailSize = min(22, max(16, bounds.height * 0.17))
            title.draw(in: CGRect(x: 28, y: bounds.height * 0.20, width: bounds.width - 42, height: titleSize * 1.35), withAttributes: [.font: UIFont.boldSystemFont(ofSize: titleSize), .foregroundColor: UIColor.label, .paragraphStyle: paragraph])
            detail.draw(in: CGRect(x: 28, y: bounds.height * 0.52, width: bounds.width - 42, height: detailSize * 2.8), withAttributes: [.font: UIFont.systemFont(ofSize: detailSize, weight: .medium), .foregroundColor: UIColor.secondaryLabel, .paragraphStyle: paragraph])
            return true
        }, nil)
    }
}

private enum FileDetails {
    struct Preview { let title: String; let detail: String }

    static func read(url: URL) -> Preview? {
        guard let source = try? Data(contentsOf: url) else { return nil }
        let data = source.starts(with: [0x70, 0x73, 0x62, 0x74, 0xff]) ? source : Data(base64Encoded: String(data: source, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? "")
        if let data, data.starts(with: [0x70, 0x73, 0x62, 0x74, 0xff]) { return psbt(data) }
        let text = String(data: source, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let transactionData = Data(hex: text) ?? source
        return transaction(transactionData)
    }

    private static func psbt(_ data: Data) -> Preview? {
        var reader = Reader(Array(data)); guard reader.skip(5), let map = reader.map(), let tx = map[[0]] else { return nil }
        var transaction = Reader(tx); guard transaction.skip(4), let inputs = transaction.compact() else { return nil }
        for _ in 0..<inputs { guard transaction.skip(36), let script = transaction.compact(), transaction.skip(script), transaction.skip(4) else { return nil } }
        guard let outputs = transaction.compact() else { return nil }; var total: UInt64 = 0
        for _ in 0..<outputs { guard let amount = transaction.uint64(), let script = transaction.compact(), transaction.skip(script) else { return nil }; total += amount }
        let sats = NumberFormatter.localizedString(from: NSNumber(value: total), number: .decimal)
        return Preview(title: "PSBT", detail: "\(inputs) input\(inputs == 1 ? "" : "s") · \(outputs) output\(outputs == 1 ? "" : "s")\n\(sats) sats")
    }

    private static func transaction(_ data: Data) -> Preview? {
        var reader = Reader(Array(data)); guard reader.skip(4) else { return nil }
        let witness = reader.peek(2) == [0, 1]; if witness { guard reader.skip(2) else { return nil } }
        guard let inputs = reader.compact() else { return nil }
        for _ in 0..<inputs { guard reader.skip(36), let script = reader.compact(), reader.skip(script), reader.skip(4) else { return nil } }
        guard let outputs = reader.compact() else { return nil }; var total: UInt64 = 0
        for _ in 0..<outputs { guard let amount = reader.uint64(), let script = reader.compact(), reader.skip(script) else { return nil }; total += amount }
        if witness { for _ in 0..<inputs { guard let items = reader.compact() else { return nil }; for _ in 0..<items { guard let length = reader.compact(), reader.skip(length) else { return nil } } } }
        guard reader.skip(4), reader.offset == reader.bytes.count else { return nil }
        let sats = NumberFormatter.localizedString(from: NSNumber(value: total), number: .decimal)
        return Preview(title: "Transaction", detail: "\(inputs) input\(inputs == 1 ? "" : "s") · \(outputs) output\(outputs == 1 ? "" : "s")\n\(sats) sats")
    }

    private struct Reader {
        var bytes: [UInt8]; var offset = 0
        init(_ bytes: [UInt8]) { self.bytes = bytes }
        mutating func skip(_ count: Int) -> Bool { guard count >= 0, offset + count <= bytes.count else { return false }; offset += count; return true }
        func peek(_ count: Int) -> [UInt8]? { guard offset + count <= bytes.count else { return nil }; return Array(bytes[offset..<(offset + count)]) }
        mutating func compact() -> Int? { guard offset < bytes.count else { return nil }; let first = bytes[offset]; offset += 1; let size: Int; switch first { case 0xfd: size = 2; case 0xfe: size = 4; case 0xff: size = 8; default: return Int(first) }; guard offset + size <= bytes.count else { return nil }; let value = bytes[offset..<(offset + size)].enumerated().reduce(0) { $0 | Int($1.element) << (8 * $1.offset) }; offset += size; return value }
        mutating func uint64() -> UInt64? { guard offset + 8 <= bytes.count else { return nil }; let value = bytes[offset..<(offset + 8)].enumerated().reduce(0) { $0 | UInt64($1.element) << UInt64(8 * $1.offset) }; offset += 8; return value }
        mutating func map() -> [[UInt8]: [UInt8]]? { var result: [[UInt8]: [UInt8]] = [:]; while let keySize = compact() { if keySize == 0 { return result }; guard offset + keySize <= bytes.count else { return nil }; let key = Array(bytes[offset..<(offset + keySize)]); offset += keySize; guard let valueSize = compact(), offset + valueSize <= bytes.count else { return nil }; result[key] = Array(bytes[offset..<(offset + valueSize)]); offset += valueSize }; return nil }
    }
}

private extension Data {
    init?(hex: String) {
        guard hex.count.isMultiple(of: 2) else { return nil }
        var bytes: [UInt8] = []; var index = hex.startIndex
        while index < hex.endIndex { let next = hex.index(index, offsetBy: 2); guard let byte = UInt8(hex[index..<next], radix: 16) else { return nil }; bytes.append(byte); index = next }
        self.init(bytes)
    }
}

/// Uses the same renderer for Files thumbnails and native layout checks.
enum VaultThumbnail {
    static func draw(setup: MultisigCoordination, size: CGSize) -> Bool {
        guard size.width > 0, size.height > 0, let context = UIGraphicsGetCurrentContext(),
              let gradient = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(),
                                        colors: VaultAppearance.gradient as CFArray, locations: nil) else { return false }
        let bounds = CGRect(origin: .zero, size: size)
        let edge = min(size.width, size.height)
        let compact = edge < 72
        let inset = max(3, edge * 0.07)
        let width = size.width - inset * 2
        let headerHeight = size.height * (compact ? 1 : 0.36)
        context.saveGState()
        defer { context.restoreGState() }
        UIBezierPath(roundedRect: bounds, cornerRadius: edge * 0.05).addClip()
        UIColor.white.setFill()
        UIBezierPath(rect: bounds).fill()
        context.saveGState()
        context.clip(to: CGRect(x: 0, y: 0, width: size.width, height: headerHeight))
        context.drawLinearGradient(gradient, start: .zero, end: CGPoint(x: size.width, y: headerHeight), options: [])
        VaultAppearance.artwork?.draw(in: CGRect(x: size.width * 0.45, y: 0, width: size.width * 0.7, height: headerHeight),
                                     blendMode: .normal, alpha: 0.12)
        UIColor.black.withAlphaComponent(0.45).setFill()
        UIBezierPath(rect: bounds).fill()
        context.restoreGState()

        let paragraph = NSMutableParagraphStyle()
        paragraph.alignment = .center
        paragraph.lineBreakMode = .byTruncatingTail
        func draw(_ text: String, in rect: CGRect, font: UIFont, color: UIColor) {
            (text as NSString).draw(with: rect, options: [.usesLineFragmentOrigin, .truncatesLastVisibleLine],
                                   attributes: [.font: font, .foregroundColor: color, .paragraphStyle: paragraph], context: nil)
        }
        let policy = VaultLocalization.policy(required: setup.required, total: setup.total, compact: compact)
        var policyFont = UIFont.systemFont(ofSize: min(48, edge * (compact ? 0.40 : 0.29)), weight: .heavy)
        let policyWidth = (policy as NSString).size(withAttributes: [.font: policyFont]).width
        if policyWidth > width {
            policyFont = .systemFont(ofSize: policyFont.pointSize * width / policyWidth, weight: .heavy)
        }
        draw(policy, in: CGRect(x: inset, y: (headerHeight - policyFont.lineHeight) / 2, width: width, height: policyFont.lineHeight),
             font: policyFont, color: .white)

        let ink = VaultAppearance.color(0x0c2550)
        if compact { return true }

        let nameFont = UIFont.systemFont(ofSize: max(10, min(22, edge * 0.13)), weight: .bold)
        let nameRect = CGRect(x: inset, y: headerHeight + inset, width: width, height: nameFont.lineHeight * 2)
        paragraph.lineBreakMode = .byWordWrapping
        draw(setup.name, in: nameRect, font: nameFont, color: ink)
        paragraph.lineBreakMode = .byTruncatingTail
        if edge >= 200 {
            let paths = Set(setup.cosigners.compactMap { $0.derivation })
            let path = paths.count == 1 && setup.cosigners.allSatisfy({ $0.derivation != nil })
                ? paths.first! : VaultLocalization.text("Custom derivation paths")
            let pathFont = UIFont.monospacedSystemFont(ofSize: min(14, edge * 0.065), weight: .medium)
            draw(path, in: CGRect(x: inset, y: nameRect.maxY + inset / 2, width: width, height: pathFont.lineHeight),
                 font: pathFont, color: VaultAppearance.color(0x475569))
        }
        return true
    }
}
