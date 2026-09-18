import Foundation
import CryptoKit

/// Shared by the preview and thumbnail so counts and amounts agree.
struct QuickLookDocument {
    enum Kind { case transaction, psbt, labels }
    enum Failure: Error { case invalid, tooLarge, unsupportedVersion }
    struct Record {
        var title: String
        var detail: String = ""
        var category: String
        var reference: String = ""
        var script: [UInt8]? = nil
        var amount: UInt64? = nil
        var status: String? = nil
    }
    let kind: Kind
    var records: [Record]
    var inputCount = 0
    var outputCount = 0
    var total: UInt64? = nil
    var fee: UInt64? = nil
    var signedInputs = 0
    var finalizedInputs = 0
    var skippedLines = 0
    var version = 0

    var title: String { VaultLocalization.text(kind == .labels ? "Wallet labels" : kind == .psbt ? "PSBT" : "Bitcoin transaction") }
    var summary: String {
        if kind == .labels {
            let count = VaultLocalization.format("Labels: %@", VaultLocalization.number(records.count))
            return skippedLines == 0 ? count : count + " · " + VaultLocalization.format("Skipped lines: %@", VaultLocalization.number(skippedLines))
        }
        return VaultLocalization.format("Inputs: %1$@ · Outputs: %2$@", VaultLocalization.number(inputCount), VaultLocalization.number(outputCount))
    }
    func matchingRecords(query: String, category: String) -> [Int] {
        let query = query.trimmingCharacters(in: .whitespacesAndNewlines)
        return records.indices.filter { index in
            let record = records[index]
            return (category == "all" || record.category == category) &&
                (query.isEmpty || [record.title, record.reference, record.detail, Self.categoryTitle(record.category)]
                    .contains { $0.localizedCaseInsensitiveContains(query) })
        }
    }
    static func categoryTitle(_ category: String) -> String {
        VaultLocalization.text(["all": "All labels", "addr": "Addresses", "tx": "Transactions", "pubkey": "Public keys", "xpub": "Extended public keys", "input": "Inputs", "output": "Outputs"][category] ?? "Other")
    }
    static func sats(_ value: UInt64) -> String {
        VaultLocalization.format("%@ sats", NumberFormatter.localizedString(from: NSNumber(value: value), number: .decimal))
    }
    /// Compact display only; the full, exact amount remains in the preview.
    static func compactAmount(_ value: UInt64) -> String {
        let scales: [(UInt64, String)] = [(1_000_000_000_000_000, "P"), (1_000_000_000_000, "T"), (1_000_000_000, "G"), (1_000_000, "M"), (1_000, "k")]
        guard let (scale, suffix) = scales.first(where: { value >= $0.0 }) else {
            return NumberFormatter.localizedString(from: NSNumber(value: value), number: .decimal)
        }
        let formatter = NumberFormatter(); formatter.numberStyle = .decimal
        formatter.maximumFractionDigits = 1
        let number = formatter.string(from: NSNumber(value: Double(value) / Double(scale))) ?? ""
        return (value % (scale / 10) == 0 ? "" : "≈") + number + suffix
    }
    static func read(file: URL) throws -> Self {
        let size = try file.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
        guard size <= 8 * 1024 * 1024 else { throw Failure.tooLarge }
        let data = try Data(contentsOf: file)
        guard data.count <= 8 * 1024 * 1024 else { throw Failure.tooLarge }
        switch file.pathExtension.lowercased() {
        case "psbt": return try psbt(data)
        case "txn": return try transaction(data)
        case "jsonl": return try labels(data)
        default: throw Failure.invalid
        }
    }
    static func labels(_ data: Data) throws -> Self {
        guard let text = String(data: data, encoding: .utf8) else { throw Failure.invalid }
        var document = Self(kind: .labels, records: [])
        for raw in text.split(whereSeparator: \.isNewline) {
            let line = raw.trimmingCharacters(in: .whitespacesAndNewlines)
            if line.isEmpty { continue }
            guard document.records.count + document.skippedLines < 10_000 else { throw Failure.tooLarge }
            guard let bytes = line.data(using: .utf8),
                  let object = (try? JSONSerialization.jsonObject(with: bytes)) as? [String: Any],
                  let type = object["type"] as? String,
                  ["tx", "addr", "pubkey", "xpub", "input", "output"].contains(type),
                  let reference = object["ref"] as? String, !reference.isEmpty else {
                document.skippedLines += 1; continue
            }
            var detail: [String] = []
            if let origin = object["origin"] as? String, !origin.isEmpty { detail.append(VaultLocalization.format("Origin: %@", origin)) }
            if let spendable = object["spendable"] as? Bool { detail.append(VaultLocalization.text(spendable ? "Spendable" : "Not spendable")) }
            let title = (object["label"] as? String).flatMap { $0.isEmpty ? nil : $0 } ?? VaultLocalization.text("No label")
            document.records.append(Record(title: title, detail: detail.joined(separator: " · "), category: type, reference: reference))
        }
        return document
    }
    static func transaction(_ source: Data) throws -> Self {
        let bytes = String(data: source, encoding: .utf8).flatMap { BitcoinEncoding.hex($0.trimmingCharacters(in: .whitespacesAndNewlines)) } ?? Array(source)
        let tx = try Transaction(bytes)
        return Self(kind: .transaction, records: tx.records, inputCount: tx.inputs.count, outputCount: tx.outputs.count, total: try sum(tx.outputs.map(\.amount)))
    }
    static func psbt(_ source: Data) throws -> Self {
        let magic: [UInt8] = [0x70, 0x73, 0x62, 0x74, 0xff]
        let data = source.starts(with: magic) ? source : Data(base64Encoded: String(data: source, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? "") ?? Data()
        var reader = Reader(Array(data))
        guard try reader.read(5) == magic else { throw Failure.invalid }
        let global = try reader.map()
        let version = try global[[0xfb]].map { try integer($0, count: 4) } ?? 0
        guard version == 0 || version == 2 else { throw Failure.unsupportedVersion }
        var inputs: [Transaction.Input]
        var outputs: [Transaction.Output]
        let inputCount: Int
        let outputCount: Int
        if version == 0 {
            guard let raw = global[[0]], global[[4]] == nil, global[[5]] == nil else { throw Failure.invalid }
            let tx = try Transaction(raw)
            guard !tx.hasWitness, tx.inputs.allSatisfy({ $0.script.isEmpty }) else { throw Failure.invalid }
            inputs = tx.inputs; outputs = tx.outputs
            inputCount = inputs.count; outputCount = outputs.count
        } else {
            guard global[[0]] == nil, let txVersion = global[[2]], txVersion.count == 4,
                  let inBytes = global[[4]], let outBytes = global[[5]] else { throw Failure.invalid }
            var inReader = Reader(inBytes); var outReader = Reader(outBytes)
            inputCount = try inReader.count(); outputCount = try outReader.count()
            guard inReader.atEnd, outReader.atEnd, inputCount > 0, outputCount > 0 else { throw Failure.invalid }
            inputs = []; outputs = []
        }
        var maps: [[[UInt8]: [UInt8]]] = []
        for _ in 0..<inputCount {
            let map = try reader.map(); maps.append(map)
            if version == 2 {
                guard let txid = map[[0x0e]], txid.count == 32, let index = map[[0x0f]] else { throw Failure.invalid }
                inputs.append(Transaction.Input(txid: txid, index: try integer(index, count: 4), script: []))
            }
        }
        for _ in 0..<outputCount {
            let map = try reader.map()
            if version == 2 {
                guard let amount = map[[3]], let script = map[[4]] else { throw Failure.invalid }
                outputs.append(Transaction.Output(amount: try money(integer(amount, count: 8)), script: script))
            }
        }
        guard reader.atEnd else { throw Failure.invalid }
        var document = Self(kind: .psbt, records: [], inputCount: inputCount, outputCount: outputCount, total: try sum(outputs.map(\.amount)), version: Int(version))
        var amounts: [UInt64] = []
        for (index, map) in maps.enumerated() {
            var utxo: Transaction.Output?
            var matched = false
            if let raw = map[[0]] {
                let previous = try Transaction(raw)
                guard BitcoinEncoding.hash256(previous.stripped) == inputs[index].txid,
                      inputs[index].index < UInt64(previous.outputs.count) else { throw Failure.invalid }
                utxo = previous.outputs[Int(inputs[index].index)]; matched = true
            }
            if let raw = map[[1]] {
                var utxoReader = Reader(raw)
                let witness = try Transaction.Output(amount: money(utxoReader.uint(8)), script: utxoReader.vector())
                guard utxoReader.atEnd else { throw Failure.invalid }
                if let previous = utxo, previous != witness { throw Failure.invalid }
                utxo = witness
            }
            if let utxo { amounts.append(utxo.amount) }
            let signatures = map.filter { key, value in
                !value.isEmpty && ((key.first == 2 && (key.count == 34 || key.count == 66)) || key == [0x13] || (key.first == 0x14 && key.count == 65))
            }.count
            let finalized = !(map[[7]] ?? []).isEmpty || !(map[[8]] ?? []).isEmpty
            if signatures > 0 || finalized { document.signedInputs += 1 }
            if finalized { document.finalizedInputs += 1 }
            let status = VaultLocalization.text(finalized ? "Finalization data present" : signatures > 0 ? "Signature data present" : "No signature data")
            let trust = VaultLocalization.text(matched ? "Matched previous transaction" : utxo != nil ? "Supplied input data" : "Input amount unavailable")
            document.records.append(Record(title: VaultLocalization.format("Input %@", VaultLocalization.number(index + 1)), detail: status, category: "input", reference: inputs[index].reference, script: utxo?.script, amount: utxo?.amount, status: trust))
        }
        if amounts.count == inputCount, let total = document.total {
            let inputTotal = try sum(amounts)
            guard inputTotal >= total else { throw Failure.invalid }
            document.fee = inputTotal - total
        }
        document.records += outputs.enumerated().map { index, output in
            Record(title: VaultLocalization.format("Output %@", VaultLocalization.number(index + 1)), category: "output", script: output.script, amount: output.amount, status: VaultLocalization.text("Transaction output"))
        }
        return document
    }
    private static func integer(_ bytes: [UInt8], count: Int) throws -> UInt64 {
        guard bytes.count == count else { throw Failure.invalid }; var reader = Reader(bytes); return try reader.uint(count)
    }
    private static func money(_ value: UInt64) throws -> UInt64 {
        guard value <= 2_100_000_000_000_000 else { throw Failure.invalid }; return value
    }
    private static func sum(_ values: [UInt64]) throws -> UInt64 {
        try values.reduce(0) { total, value in
            let (result, overflow) = total.addingReportingOverflow(value)
            guard !overflow else { throw Failure.invalid }; return try money(result)
        }
    }
    private struct Transaction {
        struct Input {
            let txid: [UInt8]; let index: UInt64; let script: [UInt8]
            var reference: String { BitcoinEncoding.hexString(Array(txid.reversed())) + ":\(index)" }
        }
        struct Output: Equatable { let amount: UInt64; let script: [UInt8] }
        var inputs: [Input] = []; var outputs: [Output] = []; let hasWitness: Bool; let stripped: [UInt8]
        var records: [Record] {
            inputs.enumerated().map { Record(title: VaultLocalization.format("Input %@", VaultLocalization.number($0.offset + 1)), category: "input", reference: $0.element.reference) } +
            outputs.enumerated().map { Record(title: VaultLocalization.format("Output %@", VaultLocalization.number($0.offset + 1)), category: "output", script: $0.element.script, amount: $0.element.amount) }
        }
        init(_ bytes: [UInt8]) throws {
            var reader = Reader(bytes)
            let version = try reader.read(4)
            hasWitness = reader.peek(2) == [0, 1]
            if hasWitness { _ = try reader.read(2) }
            let bodyStart = reader.offset
            let inputCount = try reader.count()
            guard inputCount > 0 else { throw Failure.invalid }
            for _ in 0..<inputCount {
                inputs.append(try Input(txid: reader.read(32), index: reader.uint(4), script: reader.vector()))
                _ = try reader.read(4)
            }
            let outputCount = try reader.count()
            guard outputCount > 0 else { throw Failure.invalid }
            for _ in 0..<outputCount { outputs.append(try Output(amount: money(reader.uint(8)), script: reader.vector())) }
            let bodyEnd = reader.offset
            if hasWitness {
                for _ in 0..<inputCount { for _ in 0..<(try reader.count()) { _ = try reader.vector() } }
            }
            let locktime = try reader.read(4)
            guard reader.atEnd else { throw Failure.invalid }
            stripped = version + Array(bytes[bodyStart..<bodyEnd]) + locktime
        }
    }
    private struct Reader {
        let bytes: [UInt8]; var offset = 0
        init(_ bytes: [UInt8]) { self.bytes = bytes }
        var atEnd: Bool { offset == bytes.count }
        func peek(_ count: Int) -> [UInt8]? { count <= bytes.count - offset ? Array(bytes[offset..<(offset + count)]) : nil }
        mutating func read(_ count: Int) throws -> [UInt8] {
            guard count >= 0, count <= bytes.count - offset else { throw Failure.invalid }
            defer { offset += count }; return Array(bytes[offset..<(offset + count)])
        }
        mutating func uint(_ count: Int) throws -> UInt64 {
            try read(count).enumerated().reduce(0) { $0 | UInt64($1.element) << UInt64(8 * $1.offset) }
        }
        mutating func compact() throws -> UInt64 {
            let first = try uint(1)
            if first < 253 { return first }
            let value = try uint(first == 253 ? 2 : first == 254 ? 4 : 8)
            guard value >= (first == 253 ? 253 : first == 254 ? 65_536 : 4_294_967_296) else { throw Failure.invalid }
            return value
        }
        mutating func count() throws -> Int {
            let value = try compact(); guard value <= 10_000 else { throw Failure.invalid }; return Int(value)
        }
        mutating func vector() throws -> [UInt8] {
            let length = try compact(); guard length <= UInt64(bytes.count - offset) else { throw Failure.invalid }; return try read(Int(length))
        }
        mutating func map() throws -> [[UInt8]: [UInt8]] {
            var values: [[UInt8]: [UInt8]] = [:]
            while true {
                let key = try vector(); if key.isEmpty { return values }
                guard values[key] == nil, values.count < 10_000 else { throw Failure.invalid }
                values[key] = try vector()
            }
        }
    }
}

/// Network must be chosen explicitly: transaction serialization contains no network identifier.
enum BitcoinEncoding {
    enum Network: String, CaseIterable { case scripts, mainnet, testnet
        var title: String { VaultLocalization.text(self == .scripts ? "Output scripts" : self == .mainnet ? "Bitcoin mainnet" : "Testnet / Signet") }
    }
    static func hex(_ text: String) -> [UInt8]? {
        guard text.count.isMultiple(of: 2) else { return nil }
        var result: [UInt8] = []; var index = text.startIndex
        while index < text.endIndex {
            let next = text.index(index, offsetBy: 2)
            guard let byte = UInt8(text[index..<next], radix: 16) else { return nil }
            result.append(byte); index = next
        }
        return result
    }
    static func hexString(_ bytes: [UInt8]) -> String { bytes.map { String(format: "%02x", $0) }.joined() }
    static func hash256(_ bytes: [UInt8]) -> [UInt8] { Array(SHA256.hash(data: Data(SHA256.hash(data: Data(bytes))))) }
    static func address(script: [UInt8], network: Network) -> String? {
        guard network != .scripts else { return nil }
        if script.count == 25, script.prefix(3) == [0x76, 0xa9, 0x14], script.suffix(2) == [0x88, 0xac] {
            return base58([network == .mainnet ? 0 : 111] + Array(script[3..<23]))
        }
        if script.count == 23, script.prefix(2) == [0xa9, 0x14], script.last == 0x87 {
            return base58([network == .mainnet ? 5 : 196] + Array(script[2..<22]))
        }
        guard script.count >= 4, script.count <= 42, script[0] == 0 || (0x51...0x60).contains(script[0]), Int(script[1]) == script.count - 2 else { return nil }
        let version = script[0] == 0 ? 0 : Int(script[0]) - 0x50
        guard (0...16).contains(version), version != 0 || script.count == 22 || script.count == 34 else { return nil }
        let hrp = network == .mainnet ? "bc" : "tb"
        var payload = [UInt8(version)]; var accumulator = 0; var bits = 0
        for byte in script.dropFirst(2) {
            accumulator = ((accumulator << 8) | Int(byte)) & 0xffff; bits += 8
            while bits >= 5 { bits -= 5; payload.append(UInt8((accumulator >> bits) & 31)) }
        }
        if bits > 0 { payload.append(UInt8((accumulator << (5 - bits)) & 31)) }
        let expanded = hrp.utf8.map { $0 >> 5 } + [0] + hrp.utf8.map { $0 & 31 }
        let checksum = polymod(expanded + payload + [0, 0, 0, 0, 0, 0]) ^ (version == 0 ? 1 : 0x2bc830a3)
        payload += (0..<6).map { UInt8((checksum >> (5 * (5 - $0))) & 31) }
        let alphabet = Array("qpzry9x8gf2tvdw0s3jn54khce6mua7l")
        return hrp + "1" + String(payload.map { alphabet[Int($0)] })
    }
    private static func polymod(_ values: [UInt8]) -> UInt32 {
        let generator: [UInt32] = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3]
        var check: UInt32 = 1
        for value in values {
            let top = check >> 25; check = (check & 0x1ffffff) << 5 ^ UInt32(value)
            for bit in 0..<5 where ((top >> bit) & 1) != 0 { check ^= generator[bit] }
        }
        return check
    }
    private static func base58(_ payload: [UInt8]) -> String {
        let bytes = payload + hash256(payload).prefix(4)
        var digits = [Int]()
        for byte in bytes {
            var carry = Int(byte)
            for index in digits.indices { carry += digits[index] * 256; digits[index] = carry % 58; carry /= 58 }
            while carry > 0 { digits.append(carry % 58); carry /= 58 }
        }
        let alphabet = Array("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz")
        return String(repeating: "1", count: bytes.prefix(while: { $0 == 0 }).count) + String(digits.reversed().map { alphabet[$0] })
    }
}
