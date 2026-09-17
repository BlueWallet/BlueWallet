import Foundation

// Run from the repository root:
// swiftc ios/QuickLookShared/MultisigCoordination.swift tests/native/MultisigCoordinationTests.swift -o /tmp/bw-coordination-tests && /tmp/bw-coordination-tests
@main
enum MultisigCoordinationTests {
    static func main() throws {
        let url = URL(fileURLWithPath: "tests/unit/fixtures/quicklook-preview-sample.bwcoord")
        let text = try String(contentsOf: url, encoding: .utf8)
        let setup = try MultisigCoordination.parse(file: url)
        precondition(setup.name == "Family Vault (Sample)")
        precondition(setup.policy == "2 of 3")
        precondition(setup.format == "Native SegWit")
        precondition(setup.cosigners.count == 3)
        precondition(setup.cosigners.allSatisfy { $0.derivation == "m/48'/0'/0'/2'" })

        let custom = text.replacingOccurrences(of: "88AE7ED3:", with: "# derivation: m/48'/0'/1'/2'\n88AE7ED3:")
        let parsed = try MultisigCoordination.parse(custom)
        precondition(parsed.cosigners[1].derivation == "m/48'/0'/1'/2'")
        precondition(parsed.cosigners[2].derivation == setup.cosigners[2].derivation)
        precondition(tryParse(text.replacingOccurrences(of: "\n", with: "\r\n")))
        precondition(tryParse(text.replacingOccurrences(of: "Format: P2WSH", with: "Format: P2SH")))
        precondition(tryParse(text.replacingOccurrences(of: "Format: P2WSH", with: "Format: P2SH-P2WSH")))

        for invalid in [
            text.replacingOccurrences(of: "2 of 3", with: "4 of 3"),
            text.replacingOccurrences(of: "2 of 3", with: "0 of 3"),
            text.replacingOccurrences(of: "2 of 3", with: "2 of 4"),
            text.replacingOccurrences(of: "Format: P2WSH", with: "Format: unknown"),
            text.replacingOccurrences(of: setup.cosigners[0].key, with: "xprvSensitive"),
            text + "\nseed: abandon abandon abandon\n",
            text + "\nPolicy: 1 of 3\n",
            text + "\n# derivation: m/45'\n",
            "not a setup",
        ] {
            precondition(!tryParse(invalid), "Malformed or private setup must be rejected")
        }
        print("Multisig coordination parser checks passed")
    }

    private static func tryParse(_ text: String) -> Bool {
        (try? MultisigCoordination.parse(text)) != nil
    }
}
