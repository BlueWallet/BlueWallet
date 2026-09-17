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

    var policy: String { "\(required) of \(total)" }
    var summary: String { "\(policy) signatures required · \(format)" }
    var records: [(label: String, detail: String, symbol: String)] {
        cosigners.enumerated().map { index, cosigner in
            ("Cosigner \(index + 1) · \(cosigner.fingerprint)",
             [cosigner.derivation, cosigner.key].compactMap { $0 }.joined(separator: "\n"),
             "key.fill")
        } + [("Public keys only", "Coordination setup · Does not contain signing keys", "checkmark.shield")]
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
                case "P2WSH": format = "Native SegWit"
                case "P2SH-P2WSH": format = "Wrapped SegWit"
                case "P2SH": format = "Legacy"
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
