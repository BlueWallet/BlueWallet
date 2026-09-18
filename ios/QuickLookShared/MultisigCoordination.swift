import Foundation

/// Presentation-only parser. Never displays seeds or private keys.
struct MultisigCoordination {
    struct Cosigner {
        let fingerprint: String
        let key: String
        let derivation: String?
    }
    let name: String
    let required: Int
    let total: Int
    let format: String
    let cosigners: [Cosigner]

    var policy: String { VaultLocalization.policy(required: required, total: total) }

    func matchingCosignerIndices(query: String) -> [Int] {
        let query = query.trimmingCharacters(in: .whitespacesAndNewlines)
        return cosigners.indices.filter { index in
            let cosigner = cosigners[index]
            return query.isEmpty || [VaultLocalization.key(index + 1), cosigner.fingerprint, cosigner.key, cosigner.derivation ?? ""]
                .contains { $0.localizedCaseInsensitiveContains(query) }
        }
    }

    static func parse(file: URL) throws -> Self {
        let size = try file.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
        guard size <= 1_048_576 else { throw CocoaError(.fileReadCorruptFile) }
        return try parse(String(contentsOf: file, encoding: .utf8))
    }

    static func parse(_ text: String) throws -> Self {
        func invalid() -> CocoaError { CocoaError(.fileReadCorruptFile) }
        var name: String?
        var required: Int?
        var total: Int?
        var format: String?
        var globalPath: String?
        var nextPath: String?
        var cosigners: [Cosigner] = []
        for raw in text.split(whereSeparator: \.isNewline) {
            let line = raw.trimmingCharacters(in: .whitespacesAndNewlines)
            if line.lowercased().hasPrefix("# derivation:") {
                nextPath = String(line.dropFirst("# derivation:".count)).trimmingCharacters(in: .whitespaces)
                continue
            }
            if line.hasPrefix("#") { continue }
            let parts = line.split(separator: ":", maxSplits: 1).map { $0.trimmingCharacters(in: .whitespaces) }
            guard parts.count == 2 else { throw invalid() }
            switch parts[0] {
            case "Name": guard name == nil else { throw invalid() }; name = parts[1]
            case "Policy":
                guard required == nil else { throw invalid() }
                let policy = parts[1].split(separator: " ")
                guard policy.count == 3, policy[1] == "of" else { throw invalid() }
                required = Int(policy[0]); total = Int(policy[2])
            case "Format":
                guard format == nil else { throw invalid() }
                switch parts[1] {
                case "P2WSH": format = VaultLocalization.text("Native SegWit")
                case "P2SH-P2WSH": format = VaultLocalization.text("Wrapped SegWit")
                case "P2SH": format = VaultLocalization.text("Legacy")
                default: throw invalid()
                }
            case "Derivation": globalPath = parts[1]
            default:
                guard parts[0].range(of: "^[0-9a-fA-F]{8}$", options: .regularExpression) != nil,
                      parts[1].range(of: "^[xyzYZtuvUV]pub[1-9A-HJ-NP-Za-km-z]{100,110}$", options: .regularExpression) != nil,
                      cosigners.count < 15 else { throw invalid() }
                cosigners.append(Cosigner(fingerprint: parts[0].uppercased(), key: parts[1], derivation: nextPath ?? globalPath))
                nextPath = nil
            }
        }
        guard let name, !name.isEmpty, let required, let total, let format,
              required > 0, required <= total, total == cosigners.count, nextPath == nil else { throw invalid() }
        return Self(name: name, required: required, total: total, format: format, cosigners: cosigners)
    }
}

/// Native extensions use the system's preferred language, independently of React Native.
enum VaultLocalization {
    private final class BundleToken: NSObject {}
    static let bundle = Bundle(for: BundleToken.self)

    static func text(_ key: String) -> String {
        NSLocalizedString(key, tableName: "VaultPreview", bundle: bundle, value: key, comment: "")
    }

    static func format(_ key: String, _ arguments: CVarArg...) -> String {
        String(format: text(key), locale: Locale.current, arguments: arguments)
    }

    static func number(_ value: Int) -> String {
        NumberFormatter.localizedString(from: NSNumber(value: value), number: .decimal)
    }

    static func key(_ number: Int) -> String { format("Vault key %@", self.number(number)) }

    static func policy(required: Int, total: Int, compact: Bool = false) -> String {
        format(compact ? "%1$@/%2$@" : "%1$@ of %2$@", number(required), number(total))
    }
}
