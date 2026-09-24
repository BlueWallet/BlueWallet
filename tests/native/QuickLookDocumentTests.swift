import Foundation

@main
enum QuickLookDocumentTests {
    static func main() throws {
        func le(_ value: UInt64, _ count: Int = 8) -> [UInt8] { (0..<count).map { UInt8((value >> ($0 * 8)) & 255) } }
        func compact(_ count: Int) -> [UInt8] { count < 253 ? [UInt8(count)] : [253] + le(UInt64(count), 2) }
        func vector(_ bytes: [UInt8]) -> [UInt8] { compact(bytes.count) + bytes }
        func map(_ entries: [([UInt8], [UInt8])]) -> [UInt8] { entries.flatMap { vector($0.0) + vector($0.1) } + [0] }
        let script = BitcoinEncoding.hex("0014751e76e8199196d454941c45d1b3a323f1433bd6")!
        func transaction(amount: UInt64, txid: [UInt8] = Array(repeating: 0, count: 32), index: UInt64 = 0) -> [UInt8] {
            var bytes: [UInt8] = le(2, 4)
            bytes.append(1)
            bytes += txid
            bytes += le(index, 4)
            bytes.append(0)
            bytes += le(0xffffffff, 4)
            bytes.append(1)
            bytes += le(amount)
            bytes += vector(script)
            bytes += le(0, 4)
            return bytes
        }
        let unsigned = transaction(amount: 900)
        func psbt(input: [([UInt8], [UInt8])] = [], tx: [UInt8]? = nil) -> Data {
            var bytes: [UInt8] = [0x70, 0x73, 0x62, 0x74, 0xff]
            bytes += map([([0], tx ?? unsigned)])
            bytes += map(input)
            bytes.append(0)
            return Data(bytes)
        }
        func rejects(_ operation: () throws -> QuickLookDocument) {
            do { _ = try operation(); preconditionFailure("Expected malformed input to be rejected") } catch {}
        }
        precondition(QuickLookDocument.compactAmount(150_000) == "150k")
        precondition(QuickLookDocument.compactAmount(100_000_000) == "100M")
        precondition(QuickLookDocument.compactAmount(1_234).hasPrefix("≈"))
        rejects { try QuickLookDocument.labels(Data(String(repeating: "invalid\n", count: 10_001).utf8)) }
        let oversized = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".psbt")
        defer { try? FileManager.default.removeItem(at: oversized) }
        try Data(repeating: 0, count: 8 * 1024 * 1024 + 1).write(to: oversized)
        rejects { try QuickLookDocument.read(file: oversized) }
        let unsignedPreview = try QuickLookDocument.psbt(psbt())
        precondition(unsignedPreview.total == 900 && unsignedPreview.fee == nil && unsignedPreview.signedInputs == 0)
        let witness = le(1000) + vector(script)
        let withSignature = try QuickLookDocument.psbt(psbt(input: [([1], witness), ([2] + Array(repeating: 2, count: 33), [0x30, 1])]))
        precondition(withSignature.fee == 100 && withSignature.signedInputs == 1 && withSignature.finalizedInputs == 0)
        precondition(withSignature.records[0].status == "Supplied input data")
        let finalized = try QuickLookDocument.psbt(psbt(input: [([1], witness), ([8], [1, 1, 0])]))
        precondition(finalized.finalizedInputs == 1 && finalized.signedInputs == 1)
        let taproot = try QuickLookDocument.psbt(psbt(input: [([0x13], Array(repeating: 1, count: 64))]))
        precondition(taproot.signedInputs == 1 && taproot.fee == nil)
        let previous = transaction(amount: 1000)
        let spending = transaction(amount: 900, txid: BitcoinEncoding.hash256(previous))
        let verified = try QuickLookDocument.psbt(psbt(input: [([0], previous)], tx: spending))
        precondition(verified.fee == 100 && verified.records[0].status == "Matched previous transaction")
        let consistent = try QuickLookDocument.psbt(psbt(input: [([0], previous), ([1], witness)], tx: spending))
        precondition(consistent.fee == 100)
        rejects { try QuickLookDocument.psbt(psbt(input: [([0], previous)])) } // txid mismatch
        rejects { try QuickLookDocument.psbt(psbt(input: [([0], previous), ([1], le(2000) + vector(script))], tx: spending)) }
        rejects { try QuickLookDocument.psbt(psbt(input: [([1], le(800) + vector(script))])) } // negative fee
        rejects { try QuickLookDocument.psbt(psbt(input: [([1], witness), ([1], witness)])) } // duplicate map key
        rejects { try QuickLookDocument.psbt(psbt(input: [([1], le(UInt64.max) + vector(script))])) }
        rejects { try QuickLookDocument.psbt(psbt() + Data([1])) }
        var version2: [UInt8] = [0x70, 0x73, 0x62, 0x74, 0xff]
        version2 += map([([0xfb], le(2, 4)), ([2], le(2, 4)), ([4], [1]), ([5], [1])])
        version2 += map([([0x0e], Array(repeating: 0, count: 32)), ([0x0f], le(0, 4)), ([1], witness)])
        version2 += map([([3], le(900)), ([4], script)])
        let v2 = try QuickLookDocument.psbt(Data(version2))
        precondition(v2.version == 2 && v2.total == 900 && v2.fee == 100)
        let binary = try QuickLookDocument.transaction(Data(unsigned))
        let hex = try QuickLookDocument.transaction(Data(BitcoinEncoding.hexString(unsigned).utf8))
        precondition(binary.total == hex.total && binary.outputCount == 1)
        rejects { try QuickLookDocument.transaction(Data(unsigned.dropLast())) }
        rejects { try QuickLookDocument.transaction(Data(unsigned + [0])) }
        rejects { try QuickLookDocument.transaction(Data(transaction(amount: UInt64.max))) }
        for length in 0..<unsigned.count { rejects { try QuickLookDocument.transaction(Data(unsigned.prefix(length))) } }
        for length in 0..<psbt().count { rejects { try QuickLookDocument.psbt(Data(psbt().prefix(length))) } }

        let labels = try QuickLookDocument.labels(Data("""
        {"type":"addr","ref":"AddressWithCase","label":"Savings"}
        {"type":"tx","ref":"abc123","label":"Coffee","origin":"Daily spending"}
        {"type":"pubkey","ref":"02abcdef","label":"Signer"}
        not JSON
        {"type":"unknown","ref":"ignored"}
        """.utf8))
        precondition(labels.records.count == 3 && labels.skippedLines == 2)
        precondition(labels.matchingRecords(query: " SAVINGS ", category: "addr") == [0])
        precondition(labels.matchingRecords(query: "daily", category: "all") == [1])
        precondition(labels.matchingRecords(query: "savings", category: "tx").isEmpty)
        precondition(labels.matchingRecords(query: "02ABC", category: "pubkey") == [2])
        precondition(labels.records[0].reference == "AddressWithCase")
        let empty = try QuickLookDocument.labels(Data())
        precondition(empty.records.isEmpty)

        // BIP-173/350 address vectors and familiar Base58Check zero-hash vectors.
        precondition(BitcoinEncoding.address(script: script, network: .scripts) == nil)
        precondition(BitcoinEncoding.address(script: script, network: .mainnet) == "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4")
        precondition(BitcoinEncoding.address(script: BitcoinEncoding.hex("76a914000000000000000000000000000000000000000088ac")!, network: .mainnet) == "1111111111111111111114oLvT2")
        precondition(BitcoinEncoding.address(script: BitcoinEncoding.hex("a914000000000000000000000000000000000000000087")!, network: .mainnet) == "31h1vYVSYuKP6AhS86fbRdMw9XHieotbST")
        precondition(BitcoinEncoding.address(script: script, network: .testnet)?.hasPrefix("tb1q") == true)
        precondition(BitcoinEncoding.address(script: [0x50, 2, 1, 2], network: .mainnet) == nil)
        precondition(BitcoinEncoding.address(script: [0x6a, 1, 1], network: .mainnet) == nil)
        let expected = try JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: "tests/unit/fixtures/quicklook-address-vectors.json"))) as! [[String: String]]
        for vector in expected {
            let output = BitcoinEncoding.hex(vector["script"]!)!
            precondition(BitcoinEncoding.address(script: output, network: .mainnet) == vector["mainnet"])
            precondition(BitcoinEncoding.address(script: output, network: .testnet) == vector["testnet"])
        }
        for ext in ["txn", "psbt", "jsonl"] {
            let document = try QuickLookDocument.read(file: URL(fileURLWithPath: "tests/unit/fixtures/quicklook-preview-sample.\(ext)"))
            precondition(!document.records.isEmpty)
        }
        print("Quick Look parser, fee, signature metadata, search, address, and malformed-file checks passed")
    }
}
