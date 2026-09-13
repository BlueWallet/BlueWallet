import QuickLook
import UIKit

final class PreviewViewController: UIViewController, QLPreviewingController, UITableViewDataSource, UITableViewDelegate {
    private let titleLabel = UILabel()
    private let summaryLabel = UILabel()
    private let tableView = UITableView(frame: .zero, style: .insetGrouped)
    private var records: [(label: String, detail: String, symbol: String)] = []

    override func viewDidLoad() {
        super.viewDidLoad()

        view.backgroundColor = .systemGroupedBackground

        titleLabel.text = "BIP-329 Wallet Labels"
        titleLabel.font = .systemFont(ofSize: 21, weight: .semibold)
        titleLabel.adjustsFontForContentSizeCategory = true

        summaryLabel.font = .preferredFont(forTextStyle: .subheadline)
        summaryLabel.textColor = .secondaryLabel
        summaryLabel.adjustsFontForContentSizeCategory = true

        let header = UIStackView(arrangedSubviews: [titleLabel, summaryLabel])
        header.axis = .vertical
        header.spacing = 6
        header.layoutMargins = UIEdgeInsets(top: 22, left: 20, bottom: 18, right: 20)
        header.isLayoutMarginsRelativeArrangement = true
        header.backgroundColor = .secondarySystemGroupedBackground
        header.layer.cornerRadius = 16
        header.layer.cornerCurve = .continuous

        tableView.dataSource = self
        tableView.delegate = self
        tableView.rowHeight = UITableView.automaticDimension
        tableView.estimatedRowHeight = 72
        tableView.backgroundColor = .clear
        tableView.separatorStyle = .none

        let stack = UIStackView(arrangedSubviews: [header, tableView])
        stack.axis = .vertical
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            stack.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            stack.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            stack.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])
    }

    func preparePreviewOfFile(at url: URL) async throws {
		let parsed = try await Task.detached(priority: .userInitiated) {
			if let psbt = try? PSBTPreview.parse(file: url) {
				return (psbt.title, psbt.summary, psbt.records)
			}
			if let transaction = try? TransactionPreview.parse(file: url) {
				return (transaction.title, transaction.summary, transaction.records)
			}

            let contents = try String(contentsOf: url, encoding: .utf8)
            var records: [(label: String, detail: String, symbol: String)] = []
            var invalidLineCount = 0

            for rawLine in contents.split(whereSeparator: \.isNewline) {
                let line = rawLine.trimmingCharacters(in: .whitespacesAndNewlines)
                guard !line.isEmpty,
                      let data = line.data(using: .utf8),
                      let value = try? JSONSerialization.jsonObject(with: data),
                      let object = value as? [String: Any],
                      let type = object["type"] as? String,
                      let reference = object["ref"] as? String else {
                    invalidLineCount += 1
                    continue
                }

                let label = (object["label"] as? String).flatMap { $0.isEmpty ? nil : $0 } ?? "No label"
                var details = [type.uppercased(), reference]

                if let origin = object["origin"] as? String, !origin.isEmpty {
                    details.append("Origin: \(origin)")
                }
                if let spendable = object["spendable"] as? Bool {
                    details.append(spendable ? "Spendable" : "Not spendable")
                }

                let symbol: String
                switch type {
                case "tx": symbol = "arrow.left.arrow.right"
                case "addr": symbol = "qrcode"
                case "pubkey", "xpub": symbol = "key"
                case "input": symbol = "arrow.down.to.line"
                case "output": symbol = "arrow.up.from.line"
                default: symbol = "tag"
                }

                records.append((label, details.joined(separator: " · "), symbol))
            }

			let summary: String
			if records.isEmpty {
				summary = invalidLineCount == 0 ? "No labels in this file" : "No valid BIP-329 records"
			} else if invalidLineCount == 0 {
				summary = records.count == 1 ? "1 label" : "\(records.count) labels"
			} else {
				let labels = records.count == 1 ? "1 label" : "\(records.count) labels"
				let skipped = invalidLineCount == 1 ? "1 invalid line skipped" : "\(invalidLineCount) invalid lines skipped"
				summary = "\(labels) · \(skipped)"
			}
			return ("BIP-329 Wallet Labels", summary, records)
        }.value

		titleLabel.text = parsed.0
		summaryLabel.text = parsed.1
		records = parsed.2
        tableView.reloadData()
    }

    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        records.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = UITableViewCell(style: .subtitle, reuseIdentifier: nil)
        let record = records[indexPath.row]

        var content = cell.defaultContentConfiguration()
        content.text = record.label
        content.secondaryText = record.detail
        content.textProperties.font = .systemFont(ofSize: 17, weight: .semibold)
        content.secondaryTextProperties.font = .preferredFont(forTextStyle: .subheadline)
        content.secondaryTextProperties.color = .secondaryLabel
        content.secondaryTextProperties.numberOfLines = 0
        content.image = UIImage(systemName: record.symbol)
        content.imageProperties.tintColor = .systemBlue
        content.imageProperties.preferredSymbolConfiguration = UIImage.SymbolConfiguration(pointSize: 22, weight: .semibold)
        cell.contentConfiguration = content
        cell.backgroundColor = .secondarySystemGroupedBackground
        cell.layer.cornerRadius = 14
        cell.layer.cornerCurve = .continuous
        cell.clipsToBounds = true
        cell.layoutMargins = UIEdgeInsets(top: 12, left: 16, bottom: 12, right: 16)
        cell.accessoryType = .none

        return cell
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        let record = records[indexPath.row]
        let copyValue: String
        if record.label.hasPrefix("Input ") || record.label.hasPrefix("Output ") {
            copyValue = record.detail.components(separatedBy: " · ").first ?? record.detail
        } else {
            copyValue = record.detail
        }
        let sheet = UIAlertController(title: record.label, message: record.detail, preferredStyle: .actionSheet)
        sheet.addAction(UIAlertAction(title: "Copy", style: .default) { _ in
            UIPasteboard.general.string = copyValue
        })
        sheet.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        if let popover = sheet.popoverPresentationController, let cell = tableView.cellForRow(at: indexPath) {
            popover.sourceView = cell
            popover.sourceRect = cell.bounds
        }
        present(sheet, animated: true)
    }
}

private enum TransactionPreview {
    typealias Record = (label: String, detail: String, symbol: String)
    private enum ParseError: Error { case invalid }

    static func parse(file: URL) throws -> (title: String, summary: String, records: [Record]) {
        let source = try Data(contentsOf: file)
        let data: Data
        if let text = String(data: source, encoding: .utf8), let decoded = Data(hex: text.trimmingCharacters(in: .whitespacesAndNewlines)) {
            data = decoded
        } else if source.count >= 10, source.prefix(5) != Data([0x70, 0x73, 0x62, 0x74, 0xff]) {
            data = source
        } else { throw ParseError.invalid }
        var reader = Reader(Array(data)); _ = try reader.read(4)
        let hasWitness = reader.peek(2) == [0, 1]
        if hasWitness { _ = try reader.read(2) }
        let inputs = Int(try reader.compact())
        var inputRecords: [Record] = []
        for index in 0..<inputs {
            let txid = try reader.read(32).reversed().map { String(format: "%02x", $0) }.joined()
            let outputIndex = try reader.uint32()
            let scriptLength = Int(try reader.compact()); _ = try reader.read(scriptLength); _ = try reader.read(4)
            inputRecords.append(("Input \(index + 1)", "\(txid):\(outputIndex)", "arrow.down.circle.fill"))
        }
        let outputs = Int(try reader.compact()); var total: UInt64 = 0; var outputRecords: [Record] = []
        for index in 0..<outputs {
            let value = try reader.uint64(); total += value
            let script = try reader.read(Int(try reader.compact()))
            let address = BitcoinAddress.from(script: script) ?? "Unsupported output script"
            let fiat = FiatEstimate.format(sats: value).map { " · \($0)" } ?? ""
            outputRecords.append(("Output \(index + 1)", "\(address) · \(formatSats(value))\(fiat)", "arrow.up.circle.fill"))
        }
        if hasWitness {
            for _ in 0..<inputs { for _ in 0..<Int(try reader.compact()) { _ = try reader.read(Int(try reader.compact())) } }
        }
        _ = try reader.read(4)
        guard reader.isAtEnd else { throw ParseError.invalid }
        let fiat = FiatEstimate.format(sats: total).map { " · \($0)" } ?? ""
        let summary = "\(inputs) inputs · \(outputs) outputs · \(formatSats(total))\(fiat)"
        return ("Bitcoin Transaction", summary, [("Format", hasWitness ? "SegWit transaction" : "Bitcoin transaction", "doc.text"), ("Inputs", "\(inputs) input\(inputs == 1 ? "" : "s")", "arrow.down.to.line"), ("Outputs", "\(outputs) output\(outputs == 1 ? "" : "s") · \(formatSats(total))\(fiat)", "arrow.up.circle.fill")] + inputRecords + outputRecords)
    }

    private static func formatSats(_ value: UInt64) -> String { "\(NumberFormatter.localizedString(from: NSNumber(value: value), number: .decimal)) sats" }
    private struct Reader {
        var bytes: [UInt8]; var offset = 0
        init(_ bytes: [UInt8]) { self.bytes = bytes }
        var isAtEnd: Bool { offset == bytes.count }
        func peek(_ count: Int) -> [UInt8]? { offset + count <= bytes.count ? Array(bytes[offset..<(offset + count)]) : nil }
        mutating func read(_ count: Int) throws -> [UInt8] { guard count >= 0, offset + count <= bytes.count else { throw ParseError.invalid }; defer { offset += count }; return Array(bytes[offset..<(offset + count)]) }
        mutating func compact() throws -> UInt64 { let first = try read(1)[0]; let count: Int; switch first { case 0xfd: count = 2; case 0xfe: count = 4; case 0xff: count = 8; default: return UInt64(first) }; return try read(count).enumerated().reduce(0) { $0 | UInt64($1.element) << UInt64(8 * $1.offset) } }
        mutating func uint32() throws -> UInt32 { try read(4).enumerated().reduce(0) { $0 | UInt32($1.element) << UInt32(8 * $1.offset) } }
        mutating func uint64() throws -> UInt64 { try read(8).enumerated().reduce(0) { $0 | UInt64($1.element) << UInt64(8 * $1.offset) } }
    }
}

private extension Data {
    init?(hex: String) {
        guard hex.count.isMultiple(of: 2) else { return nil }
        var bytes: [UInt8] = []; bytes.reserveCapacity(hex.count / 2)
        var index = hex.startIndex
        while index < hex.endIndex { let next = hex.index(index, offsetBy: 2); guard let byte = UInt8(hex[index..<next], radix: 16) else { return nil }; bytes.append(byte); index = next }
        self.init(bytes)
    }
}

private enum PSBTPreview {
    typealias Record = (label: String, detail: String, symbol: String)

    static func parse(file: URL) throws -> (title: String, summary: String, records: [Record]) {
        let source = try Data(contentsOf: file)
        let data: Data
        if source.starts(with: [0x70, 0x73, 0x62, 0x74, 0xff]) {
            data = source
        } else if let text = String(data: source, encoding: .utf8),
                  let decoded = Data(base64Encoded: text.trimmingCharacters(in: .whitespacesAndNewlines)),
                  decoded.starts(with: [0x70, 0x73, 0x62, 0x74, 0xff]) {
            data = decoded
        } else {
            throw ParseError.notPSBT
        }

        var reader = Reader(data: data)
        _ = try reader.read(count: 5)
        let global = try reader.readMap()
        let version = global.first(where: { $0.key.first == 0xfb }).flatMap { value -> UInt32? in
            guard value.value.count == 4 else { return nil }
            return value.value.enumerated().reduce(0) { $0 | UInt32($1.element) << UInt32(8 * $1.offset) }
        } ?? 0

        let unsignedTransaction = global.first(where: { $0.key == [0x00] })?.value
        let transaction = unsignedTransaction.flatMap { try? TransactionSummary.parse($0) }
        let inputCount = transaction?.inputCount ?? count(global, type: 0x04)
        let outputCount = transaction?.outputCount ?? count(global, type: 0x05)
        guard let inputs = inputCount, let outputs = outputCount else { throw ParseError.missingCounts }

        var inputMaps: [[Entry]] = []
        for _ in 0..<inputs { inputMaps.append(try reader.readMap()) }
        for _ in 0..<outputs { _ = try reader.readMap() }

        let partialSignatures = inputMaps.reduce(0) { $0 + $1.filter { $0.key.first == 0x02 || $0.key.first == 0x13 }.count }
        let finalized = inputMaps.filter { map in map.contains { $0.key.first == 0x07 || $0.key.first == 0x08 } }.count
        let knownInputValue = inputMaps.compactMap(inputValue).reduce(0, +)
        let outputValue = transaction?.outputValue
        let totalOutput = outputValue.map(formatSats)
        let outputDetail = outputValue.map { value in
            let count = "\(outputs) output\(outputs == 1 ? "" : "s")"
            let fiat = FiatEstimate.format(sats: value).map { " · \($0)" } ?? ""
            return "\(count) · \(formatSats(value))\(fiat)"
        } ?? "\(outputs) output\(outputs == 1 ? "" : "s")"

        var records: [Record] = [
            ("Format", "PSBT v\(version)", "doc.text"),
            ("Inputs", "\(inputs) input\(inputs == 1 ? "" : "s") · \(partialSignatures) signature\(partialSignatures == 1 ? "" : "s")", "arrow.down.to.line"),
            ("Outputs", outputDetail, "arrow.up.circle.fill"),
            ("Signing status", finalized == inputs ? "Finalized" : "\(finalized) of \(inputs) finalized", finalized == inputs ? "checkmark.seal" : "signature")
        ]
        if knownInputValue > 0, let outputValue, knownInputValue >= outputValue {
            records.append(("Network fee", formatSats(knownInputValue - outputValue), "bitcoinsign.circle"))
        }
        records += inputMaps.enumerated().map { index, map in
            let utxo = witnessUTXO(map)
            let address = utxo.flatMap { BitcoinAddress.from(script: $0.script) } ?? "Address unavailable"
            let amount = utxo.map { " · \(formatSats($0.value))" } ?? ""
            return ("Input \(index + 1)", "\(address)\(amount)", "arrow.down.circle.fill")
        }
        if let transaction {
            records += transaction.outputs.enumerated().map { index, output in
                let address = BitcoinAddress.from(script: output.script) ?? "Unsupported output script"
                let fiat = FiatEstimate.format(sats: output.value).map { " · \($0)" } ?? ""
                return ("Output \(index + 1)", "\(address) · \(formatSats(output.value))\(fiat)", "arrow.up.circle.fill")
            }
        }
        let summary = totalOutput.map { "\(inputs) inputs · \(outputs) outputs · \($0)" } ?? "\(inputs) inputs · \(outputs) outputs"
        return ("Partially Signed Bitcoin Transaction", summary, records)
    }

    private static func count(_ entries: [Entry], type: UInt8) -> Int? {
        guard let entry = entries.first(where: { $0.key == [type] }) else { return nil }
        var reader = Reader(data: Data(entry.value))
        return try? Int(reader.readCompact())
    }

    private static func inputValue(_ map: [Entry]) -> UInt64? {
        witnessUTXO(map)?.value
    }

    private static func witnessUTXO(_ map: [Entry]) -> TransactionOutput? {
        guard let value = map.first(where: { $0.key == [0x01] })?.value, value.count >= 8 else { return nil }
        var reader = Reader(data: Data(value))
        guard let amount = try? reader.read(count: 8).enumerated().reduce(0, { $0 | UInt64($1.element) << UInt64(8 * $1.offset) }),
              let scriptLength = try? reader.readCompact(),
              scriptLength <= UInt64(Int.max),
              let script = try? reader.read(count: Int(scriptLength)) else { return nil }
        return TransactionOutput(value: amount, script: script)
    }

    private static func formatSats(_ value: UInt64) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        return "\(formatter.string(from: NSNumber(value: value)) ?? "\(value)") sats"
    }

    private struct Entry { let key: [UInt8]; let value: [UInt8] }
    private enum ParseError: Error { case notPSBT, missingCounts, malformed }

    private struct Reader {
        private var bytes: [UInt8]; private var offset = 0
        init(data: Data) { bytes = Array(data) }
        mutating func read(count: Int) throws -> [UInt8] {
            guard count >= 0, offset + count <= bytes.count else { throw ParseError.malformed }
            defer { offset += count }; return Array(bytes[offset..<(offset + count)])
        }
        mutating func readCompact() throws -> UInt64 {
            let first = try read(count: 1)[0]
            let count: Int
            switch first { case 0xfd: count = 2; case 0xfe: count = 4; case 0xff: count = 8; default: return UInt64(first) }
            return try read(count: count).enumerated().reduce(0) { $0 | UInt64($1.element) << UInt64(8 * $1.offset) }
        }
        mutating func readMap() throws -> [Entry] {
            var entries: [Entry] = []
            while true {
                let keyLength = try readCompact()
                if keyLength == 0 { return entries }
                guard keyLength <= UInt64(Int.max) else { throw ParseError.malformed }
                let key = try read(count: Int(keyLength))
                let valueLength = try readCompact()
                guard valueLength <= UInt64(Int.max) else { throw ParseError.malformed }
                entries.append(Entry(key: key, value: try read(count: Int(valueLength))))
            }
        }
    }

    private struct TransactionOutput { let value: UInt64; let script: [UInt8] }

    private struct TransactionSummary {
        let inputCount: Int; let outputs: [TransactionOutput]
        var outputCount: Int { outputs.count }
        var outputValue: UInt64 { outputs.reduce(0) { $0 + $1.value } }
        static func parse(_ data: [UInt8]) throws -> TransactionSummary {
            var reader = Reader(data: Data(data)); _ = try reader.read(count: 4)
            let inputs = Int(try reader.readCompact())
            for _ in 0..<inputs { _ = try reader.read(count: 36); _ = try reader.read(count: Int(try reader.readCompact())); _ = try reader.read(count: 4) }
            let outputCount = Int(try reader.readCompact()); var outputs: [TransactionOutput] = []
            for _ in 0..<outputCount {
                let amount = try reader.read(count: 8).enumerated().reduce(0) { $0 | UInt64($1.element) << UInt64(8 * $1.offset) }
                let script = try reader.read(count: Int(try reader.readCompact()))
                outputs.append(TransactionOutput(value: amount, script: script))
            }
            return TransactionSummary(inputCount: inputs, outputs: outputs)
        }
    }
}

private enum BitcoinAddress {
    static func from(script: [UInt8]) -> String? {
        guard script.count >= 4 else { return nil }
        let version: Int
        switch script[0] { case 0x00: version = 0; case 0x51...0x60: version = Int(script[0] - 0x50); default: return nil }
        let length = Int(script[1])
        guard length == script.count - 2, (2...40).contains(length) else { return nil }
        return encode(hrp: "bc", version: version, program: Array(script.dropFirst(2)))
    }

    private static func encode(hrp: String, version: Int, program: [UInt8]) -> String? {
        guard let converted = convertBits(program, from: 8, to: 5, pad: true) else { return nil }
        let data = [UInt8(version)] + converted
        let checksum = createChecksum(hrp: hrp, data: data, bech32m: version != 0)
        let charset = Array("qpzry9x8gf2tvdw0s3jn54khce6mua7l")
        return hrp + "1" + (data + checksum).map { String(charset[Int($0)]) }.joined()
    }

    private static func convertBits(_ values: [UInt8], from: Int, to: Int, pad: Bool) -> [UInt8]? {
        var accumulator = 0; var bits = 0; var result: [UInt8] = []
        let maxValue = (1 << to) - 1
        for value in values {
            accumulator = (accumulator << from) | Int(value); bits += from
            while bits >= to { bits -= to; result.append(UInt8((accumulator >> bits) & maxValue)) }
        }
        if pad, bits > 0 { result.append(UInt8((accumulator << (to - bits)) & maxValue)) }
        return !pad && (bits >= from || ((accumulator << (to - bits)) & maxValue) != 0) ? nil : result
    }

    private static func createChecksum(hrp: String, data: [UInt8], bech32m: Bool) -> [UInt8] {
        let expanded = hrp.utf8.map { $0 >> 5 } + [0] + hrp.utf8.map { $0 & 31 }
        let value = polymod(expanded + data + Array(repeating: 0, count: 6)) ^ (bech32m ? 0x2bc830a3 : 1)
        return (0..<6).map { UInt8((value >> (5 * (5 - $0))) & 31) }
    }

    private static func polymod(_ values: [UInt8]) -> Int {
        var checksum = 1
        for value in values {
            let top = checksum >> 25; checksum = (checksum & 0x1ffffff) << 5 ^ Int(value)
            for (index, generator) in [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3].enumerated() {
                if (top >> index) & 1 == 1 { checksum ^= generator }
            }
        }
        return checksum
    }
}

/// Reads the most recently cached market rate selected in BlueWallet. Quick Look stays offline.
private enum FiatEstimate {
    private static let appGroup = "group.io.bluewallet.bluewallet"

    static func format(sats: UInt64) -> String? {
        guard let defaults = UserDefaults(suiteName: appGroup),
              let currency = defaults.string(forKey: "preferredCurrency"),
              let ratesJSON = defaults.string(forKey: "exchangeRates"),
              let ratesData = ratesJSON.data(using: .utf8),
              let rates = try? JSONSerialization.jsonObject(with: ratesData) as? [String: Any],
              let rate = rates["BTC_\(currency)"] as? Double else { return nil }

        let localeIdentifier = defaults.string(forKey: "preferredCurrencyLocale") ?? Locale.current.identifier
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = currency
        formatter.locale = Locale(identifier: localeIdentifier)
        formatter.maximumFractionDigits = 2
        let bitcoin = Decimal(sats) / Decimal(100_000_000)
        let fiat = bitcoin * Decimal(rate)
        return "≈ \(formatter.string(from: fiat as NSDecimalNumber) ?? "\(fiat) \(currency)")"
    }
}
