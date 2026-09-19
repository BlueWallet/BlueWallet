import Foundation

/// Converts the original file, not the formatted preview, into pasteable text.
enum FileContents {
    enum Failure: Error { case unsupported, tooLarge, unreadable }
    static let supportedTypes = ["io.bluewallet.multisig-coordination", "io.bluewallet.bip329", "io.bluewallet.psbt", "io.bluewallet.psbt.txn"]
    static func read(_ url: URL, type: String) throws -> String {
        let scoped = url.startAccessingSecurityScopedResource()
        defer { if scoped { url.stopAccessingSecurityScopedResource() } }
        guard url.isFileURL, supportedTypes.contains(type) else { throw Failure.unsupported }
        let size = try url.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
        guard size <= 8 * 1024 * 1024 else { throw Failure.tooLarge }
        let data = try Data(contentsOf: url)
        guard data.count <= 8 * 1024 * 1024 else { throw Failure.tooLarge }
        return try text(data, type: type)
    }
    static func text(_ data: Data, type: String) throws -> String {
        guard supportedTypes.contains(type) else { throw Failure.unsupported }
        if type == "io.bluewallet.psbt", data.starts(with: [0x70, 0x73, 0x62, 0x74, 0xff]) {
            return data.base64EncodedString()
        }
        if type == "io.bluewallet.psbt.txn" {
            if let text = String(data: data, encoding: .utf8),
               text.trimmingCharacters(in: .whitespacesAndNewlines).range(of: "^(?:[0-9a-fA-F]{2})+$", options: .regularExpression) != nil {
                return text
            }
            return data.map { String(format: "%02x", $0) }.joined()
        }
        guard let text = String(data: data, encoding: .utf8) else { throw Failure.unreadable }
        return text
    }
}
