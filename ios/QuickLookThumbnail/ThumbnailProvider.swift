import QuickLookThumbnailing
import UIKit

final class ThumbnailProvider: QLThumbnailProvider {
    override func provideThumbnail(for request: QLFileThumbnailRequest, _ handler: @escaping (QLThumbnailReply?, Error?) -> Void) {
        let preview = FileDetails.read(url: request.fileURL)
        handler(QLThumbnailReply(contextSize: request.maximumSize) { context in
            let bounds = context.boundingBoxOfClipPath
            context.setFillColor(UIColor.systemBackground.cgColor); context.fill(bounds)
            context.setFillColor((preview?.accentColor ?? .systemBlue).cgColor); context.fill(CGRect(x: 0, y: 0, width: 12, height: bounds.height))
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
            title.draw(in: CGRect(x: 28, y: bounds.height * 0.20, width: bounds.width - 88, height: titleSize * 1.35), withAttributes: [.font: UIFont.boldSystemFont(ofSize: titleSize), .foregroundColor: UIColor.label, .paragraphStyle: paragraph])
            detail.draw(in: CGRect(x: 28, y: bounds.height * 0.52, width: bounds.width - 42, height: detailSize * 2.8), withAttributes: [.font: UIFont.systemFont(ofSize: detailSize, weight: .medium), .foregroundColor: UIColor.secondaryLabel, .paragraphStyle: paragraph])
            if let symbolName = preview?.symbolName,
               let symbol = UIImage(systemName: symbolName, withConfiguration: UIImage.SymbolConfiguration(pointSize: min(28, bounds.height * 0.2), weight: .semibold))?.withTintColor(preview?.accentColor ?? .systemBlue, renderingMode: .alwaysOriginal) {
                symbol.draw(in: CGRect(x: bounds.width - 48, y: 16, width: 28, height: 28))
            }
            return true
        }, nil)
    }
}

private enum FileDetails {
    struct Preview {
        let title: String
        let detail: String
        let symbolName: String
        let accentColor: UIColor
    }

    static func read(url: URL) -> Preview? {
        guard let source = try? Data(contentsOf: url) else { return nil }
        if url.pathExtension.lowercased() == "electrumservers" { return electrumServers(source) }
        let data = source.starts(with: [0x70, 0x73, 0x62, 0x74, 0xff]) ? source : Data(base64Encoded: String(data: source, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? "")
        if let data, data.starts(with: [0x70, 0x73, 0x62, 0x74, 0xff]) { return psbt(data) }
        let text = String(data: source, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let transactionData = Data(hex: text) ?? source
        return transaction(transactionData)
    }

    private static func electrumServers(_ data: Data) -> Preview? {
        guard let json = try? JSONSerialization.jsonObject(with: data) else { return nil }
        let values: [Any]
        if let root = json as? [String: Any], let servers = root["servers"] as? [Any] {
            values = servers
        } else if let servers = json as? [Any] {
            values = servers
        } else {
            return nil
        }

        var valid = 0
        for value in values.prefix(1000) {
            guard let server = value as? [String: Any],
                  let rawHost = server["host"] as? String,
                  validHost(rawHost.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()) else {
                continue
            }
            let ports = [integer(server["ssl"]), integer(server["tcp"])].compactMap { $0 }.filter { (1...65535).contains($0) }
            valid += ports.count
        }
        guard valid > 0 else { return nil }
        let count = valid == 1 ? "1 server" : "\(valid) servers"
        return Preview(title: "Server History", detail: count, symbolName: "server.rack", accentColor: .systemGreen)
    }

    private static func integer(_ value: Any?) -> Int? {
        if let number = value as? NSNumber { return number.intValue }
        if let string = value as? String { return Int(string) }
        return nil
    }

    private static func validHost(_ host: String) -> Bool {
        if host == "localhost" { return true }
        guard !host.isEmpty, host.count <= 253 else { return false }
        return host.split(separator: ".", omittingEmptySubsequences: false).allSatisfy { part in
            guard !part.isEmpty, part.count <= 63, part.first?.isLetter == true || part.first?.isNumber == true,
                  part.last?.isLetter == true || part.last?.isNumber == true else { return false }
            return part.allSatisfy { $0.isLetter || $0.isNumber || $0 == "-" }
        }
    }

    private static func psbt(_ data: Data) -> Preview? {
        var reader = Reader(Array(data)); guard reader.skip(5), let map = reader.map(), let tx = map[[0]] else { return nil }
        var transaction = Reader(tx); guard transaction.skip(4), let inputs = transaction.compact() else { return nil }
        for _ in 0..<inputs { guard transaction.skip(36), let script = transaction.compact(), transaction.skip(script), transaction.skip(4) else { return nil } }
        guard let outputs = transaction.compact() else { return nil }; var total: UInt64 = 0
        for _ in 0..<outputs { guard let amount = transaction.uint64(), let script = transaction.compact(), transaction.skip(script) else { return nil }; total += amount }
        let sats = NumberFormatter.localizedString(from: NSNumber(value: total), number: .decimal)
        return Preview(title: "PSBT", detail: "\(inputs) input\(inputs == 1 ? "" : "s") · \(outputs) output\(outputs == 1 ? "" : "s")\n\(sats) sats", symbolName: "doc.text", accentColor: .systemBlue)
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
        return Preview(title: "Transaction", detail: "\(inputs) input\(inputs == 1 ? "" : "s") · \(outputs) output\(outputs == 1 ? "" : "s")\n\(sats) sats", symbolName: "arrow.left.arrow.right", accentColor: .systemBlue)
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
