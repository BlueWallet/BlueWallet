import Foundation
@main
enum FileContentsTests {
    static func main() throws {
        for (ext, type) in [("bwcoord", "io.bluewallet.multisig-coordination"), ("jsonl", "io.bluewallet.bip329"), ("txn", "io.bluewallet.psbt.txn"), ("psbt", "io.bluewallet.psbt")] {
            let url = URL(fileURLWithPath: "tests/unit/fixtures/quicklook-preview-sample.\(ext)")
            let source = try Data(contentsOf: url)
            let copied = try FileContents.read(url, type: type)
            if let original = String(data: source, encoding: .utf8) { precondition(copied == original) }
            else { precondition(Data(base64Encoded: copied) == source) }
        }
        let original = "# Vault – prueba\r\nName: Family Vault\r\n\r\n  spaced text  \n"
        let copied = try FileContents.text(Data(original.utf8), type: "io.bluewallet.multisig-coordination")
        precondition(copied == original)
        let psbt = Data([0x70, 0x73, 0x62, 0x74, 0xff, 0])
        let base64 = try FileContents.text(psbt, type: "io.bluewallet.psbt")
        precondition(Data(base64Encoded: base64) == psbt)
        let transaction = Data([1, 0, 0, 0, 0xff])
        let hex = try FileContents.text(transaction, type: "io.bluewallet.psbt.txn")
        precondition(hex == "01000000ff")
        do { _ = try FileContents.text(Data([0xff]), type: "io.bluewallet.bip329"); preconditionFailure("Invalid UTF-8 must fail") } catch {}
        do { _ = try FileContents.text(Data(), type: "public.pdf"); preconditionFailure("Unsupported files must fail") } catch {}
        print("File-content copying preserves text and round-trips binary encodings")
    }
}
