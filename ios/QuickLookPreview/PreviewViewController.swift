import QuickLook
import UIKit

private struct PreviewRecord {
    let section: String
    let label: String
    let detail: String
    let symbol: String
}

final class PreviewViewController: UIViewController, QLPreviewingController, UITableViewDataSource, UITableViewDelegate {
    private let titleLabel = UILabel()
    private let summaryLabel = UILabel()
    private let viewControl = UISegmentedControl(items: ["Records", "Raw"])
    private let tableView = UITableView(frame: .zero, style: .insetGrouped)
    private let rawContainer = UIView()
    private let rawTextView = UITextView()
    private let rawFormatLabel = UILabel()
    private let copyRawButton = UIButton(type: .system)
    private var sections: [(title: String, records: [PreviewRecord])] = []

    override func viewDidLoad() {
        super.viewDidLoad()

        view.backgroundColor = .systemGroupedBackground

        titleLabel.text = "BIP-329 Wallet Labels"
        titleLabel.font = UIFontMetrics(forTextStyle: .title2).scaledFont(for: .systemFont(ofSize: 22, weight: .semibold))
        titleLabel.adjustsFontForContentSizeCategory = true
        titleLabel.numberOfLines = 0

        summaryLabel.font = .preferredFont(forTextStyle: .subheadline)
        summaryLabel.textColor = .secondaryLabel
        summaryLabel.adjustsFontForContentSizeCategory = true
        summaryLabel.numberOfLines = 0

        viewControl.selectedSegmentIndex = 0
        viewControl.isHidden = true
        viewControl.accessibilityLabel = "Preview format"
        viewControl.addTarget(self, action: #selector(selectedViewDidChange), for: .valueChanged)

        let header = UIStackView(arrangedSubviews: [titleLabel, summaryLabel, viewControl])
        header.axis = .vertical
        header.spacing = 6
        header.setCustomSpacing(14, after: summaryLabel)
        header.layoutMargins = UIEdgeInsets(top: 22, left: 20, bottom: 18, right: 20)
        header.isLayoutMarginsRelativeArrangement = true

        tableView.dataSource = self
        tableView.delegate = self
        tableView.rowHeight = UITableView.automaticDimension
        tableView.estimatedRowHeight = 96
        tableView.backgroundColor = .clear
        tableView.separatorStyle = .singleLine
        tableView.cellLayoutMarginsFollowReadableWidth = true
        tableView.sectionHeaderTopPadding = 12

        rawContainer.backgroundColor = .secondarySystemGroupedBackground
        rawContainer.layer.cornerRadius = 12
        rawContainer.layer.cornerCurve = .continuous
        rawContainer.layer.borderWidth = 1 / UIScreen.main.scale
        rawContainer.layer.borderColor = UIColor.separator.cgColor
        rawContainer.clipsToBounds = true
        rawContainer.isHidden = true

        let rawIcon = UIImageView(image: UIImage(systemName: "doc.plaintext"))
        rawIcon.tintColor = .secondaryLabel
        rawIcon.setContentHuggingPriority(.required, for: .horizontal)

        rawFormatLabel.text = "JSON Lines · UTF-8"
        rawFormatLabel.font = .preferredFont(forTextStyle: .subheadline)
        rawFormatLabel.textColor = .secondaryLabel
        rawFormatLabel.adjustsFontForContentSizeCategory = true

        var copyConfiguration = UIButton.Configuration.plain()
        copyConfiguration.title = "Copy"
        copyConfiguration.image = UIImage(systemName: "doc.on.doc")
        copyConfiguration.imagePadding = 6
        copyConfiguration.contentInsets = NSDirectionalEdgeInsets(top: 6, leading: 8, bottom: 6, trailing: 8)
        copyRawButton.configuration = copyConfiguration
        copyRawButton.addTarget(self, action: #selector(copyRawContents), for: .touchUpInside)
        copyRawButton.accessibilityLabel = "Copy raw JSONL"

        let rawHeader = UIStackView(arrangedSubviews: [rawIcon, rawFormatLabel, UIView(), copyRawButton])
        rawHeader.axis = .horizontal
        rawHeader.alignment = .center
        rawHeader.spacing = 8
        rawHeader.layoutMargins = UIEdgeInsets(top: 8, left: 12, bottom: 8, right: 8)
        rawHeader.isLayoutMarginsRelativeArrangement = true

        let rawDivider = UIView()
        rawDivider.backgroundColor = .separator

        rawTextView.isEditable = false
        rawTextView.isSelectable = true
        rawTextView.alwaysBounceVertical = true
        rawTextView.backgroundColor = .secondarySystemGroupedBackground
        rawTextView.font = UIFontMetrics(forTextStyle: .body).scaledFont(for: .monospacedSystemFont(ofSize: 15, weight: .regular))
        rawTextView.adjustsFontForContentSizeCategory = true
        rawTextView.textColor = .label
        rawTextView.textContainerInset = UIEdgeInsets(top: 18, left: 16, bottom: 18, right: 16)
        rawTextView.accessibilityLabel = "Raw JSONL"

        rawHeader.translatesAutoresizingMaskIntoConstraints = false
        rawDivider.translatesAutoresizingMaskIntoConstraints = false
        rawTextView.translatesAutoresizingMaskIntoConstraints = false
        rawContainer.addSubview(rawHeader)
        rawContainer.addSubview(rawDivider)
        rawContainer.addSubview(rawTextView)

        NSLayoutConstraint.activate([
            rawHeader.topAnchor.constraint(equalTo: rawContainer.topAnchor),
            rawHeader.leadingAnchor.constraint(equalTo: rawContainer.leadingAnchor),
            rawHeader.trailingAnchor.constraint(equalTo: rawContainer.trailingAnchor),
            rawDivider.topAnchor.constraint(equalTo: rawHeader.bottomAnchor),
            rawDivider.leadingAnchor.constraint(equalTo: rawContainer.leadingAnchor),
            rawDivider.trailingAnchor.constraint(equalTo: rawContainer.trailingAnchor),
            rawDivider.heightAnchor.constraint(equalToConstant: 1 / UIScreen.main.scale),
            rawTextView.topAnchor.constraint(equalTo: rawDivider.bottomAnchor),
            rawTextView.leadingAnchor.constraint(equalTo: rawContainer.leadingAnchor),
            rawTextView.trailingAnchor.constraint(equalTo: rawContainer.trailingAnchor),
            rawTextView.bottomAnchor.constraint(equalTo: rawContainer.bottomAnchor),
        ])

        let contentView = UIView()
        tableView.translatesAutoresizingMaskIntoConstraints = false
        rawContainer.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(tableView)
        contentView.addSubview(rawContainer)

        NSLayoutConstraint.activate([
            tableView.topAnchor.constraint(equalTo: contentView.topAnchor),
            tableView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor),
            tableView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor),
            tableView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor),
            rawContainer.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 8),
            rawContainer.leadingAnchor.constraint(equalTo: contentView.readableContentGuide.leadingAnchor, constant: 16),
            rawContainer.trailingAnchor.constraint(equalTo: contentView.readableContentGuide.trailingAnchor, constant: -16),
            rawContainer.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -16),
        ])

        let stack = UIStackView(arrangedSubviews: [header, contentView])
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
        loadViewIfNeeded()

        do {
			let parsed = try await Task.detached(priority: .userInitiated) {
                let pathExtension = url.pathExtension.lowercased()
                if pathExtension == "psbt" {
                    let psbt = try PSBTPreview.parse(file: url)
                    return (psbt.title, psbt.summary, previewRecords(psbt.records, section: "PSBT Details"), nil as String?)
                }
                if pathExtension == "txn" {
                    let transaction = try TransactionPreview.parse(file: url)
                    return (transaction.title, transaction.summary, previewRecords(transaction.records, section: "Transaction Details"), nil as String?)
                }
                if pathExtension != "jsonl" {
                    if let psbt = try? PSBTPreview.parse(file: url) {
                        return (psbt.title, psbt.summary, previewRecords(psbt.records, section: "PSBT Details"), nil as String?)
                    }
                    if let transaction = try? TransactionPreview.parse(file: url) {
                        return (transaction.title, transaction.summary, previewRecords(transaction.records, section: "Transaction Details"), nil as String?)
                    }
                }

                let contents = try String(contentsOf: url, encoding: .utf8)
                var records: [PreviewRecord] = []
                var invalidLineCount = 0
                var typeCounts: [String: Int] = [:]

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
                    var details = ["\(type.uppercased()) · \(reference)"]
                    for key in object.keys.sorted() where !["label", "type", "ref"].contains(key) {
                        guard let value = displayValue(object[key], forKey: key) else { continue }
                        details.append("\(displayLabel(forKey: key)): \(value)")
                    }
                    typeCounts[type, default: 0] += 1

                    let symbol: String
                    switch type {
                    case "tx": symbol = "arrow.left.arrow.right"
                    case "addr": symbol = "qrcode"
                    case "pubkey", "xpub": symbol = "key"
                    case "input": symbol = "arrow.down.to.line"
                    case "output": symbol = "arrow.up.from.line"
                    default: symbol = "tag"
                    }

                    records.append(
                        PreviewRecord(
                            section: bip329SectionTitle(type),
                            label: label,
                            detail: details.joined(separator: "\n"),
                            symbol: symbol
                        )
                    )
                }

                let summary: String
                if records.isEmpty {
                    summary = invalidLineCount == 0 ? "No records in this file" : "No valid BIP-329 records"
                } else {
                    let recordCount = records.count == 1 ? "1 record" : "\(records.count) records"
                    let types = typeCounts.keys.sorted().map { "\(typeCounts[$0] ?? 0) \($0.uppercased())" }.joined(separator: " · ")
                    let skipped = invalidLineCount == 0 ? nil : (invalidLineCount == 1 ? "1 invalid line skipped" : "\(invalidLineCount) invalid lines skipped")
                    summary = ([recordCount, types] + [skipped].compactMap { $0 }).joined(separator: " · ")
                }
                return ("BIP-329 Wallet Labels", summary, records, contents)
            }.value

            applyPreview(title: parsed.0, summary: parsed.1, records: parsed.2, rawContents: parsed.3)
        } catch {
            applyPreview(
                title: "Preview unavailable",
                summary: "The file could not be read or contains invalid data.",
                records: [],
                rawContents: nil
            )
        }
    }

    private func applyPreview(title: String, summary: String, records: [PreviewRecord], rawContents: String?) {
        titleLabel.text = title
        summaryLabel.text = summary
        var grouped: [(title: String, records: [PreviewRecord])] = []
        for record in records {
            if let index = grouped.firstIndex(where: { $0.title == record.section }) {
                grouped[index].records.append(record)
            } else {
                grouped.append((record.section, [record]))
            }
        }
        sections = grouped
        rawTextView.text = rawContents
        viewControl.isHidden = rawContents == nil
        viewControl.selectedSegmentIndex = 0
        selectedViewDidChange()
        tableView.reloadData()
    }

    @objc private func selectedViewDidChange() {
        let showsRawSource = !viewControl.isHidden && viewControl.selectedSegmentIndex == 1
        tableView.isHidden = showsRawSource
        rawContainer.isHidden = !showsRawSource
        if showsRawSource {
            rawTextView.setContentOffset(.zero, animated: false)
        }
    }

    @objc private func copyRawContents() {
        UIPasteboard.general.string = rawTextView.text
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }

    func numberOfSections(in tableView: UITableView) -> Int {
        sections.count
    }

    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        sections[section].records.count
    }

    func tableView(_ tableView: UITableView, titleForHeaderInSection section: Int) -> String? {
        let group = sections[section]
        return group.records.count == 1 ? group.title : "\(group.title) · \(group.records.count)"
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = UITableViewCell(style: .subtitle, reuseIdentifier: nil)
        let record = sections[indexPath.section].records[indexPath.row]

        var content = cell.defaultContentConfiguration()
        content.text = record.label
        content.secondaryAttributedText = attributedDetail(record.detail)
        content.textProperties.font = .preferredFont(forTextStyle: .headline)
        content.secondaryTextProperties.color = .secondaryLabel
        content.secondaryTextProperties.numberOfLines = 0
        content.image = UIImage(systemName: record.symbol)
        content.imageProperties.tintColor = tintColor(for: record.section)
        content.imageProperties.preferredSymbolConfiguration = UIImage.SymbolConfiguration(pointSize: 21, weight: .semibold)
        cell.contentConfiguration = content
        cell.backgroundColor = .secondarySystemGroupedBackground
        cell.layoutMargins = UIEdgeInsets(top: 14, left: 16, bottom: 14, right: 12)
        cell.accessoryType = .disclosureIndicator

        return cell
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        let record = sections[indexPath.section].records[indexPath.row]
        let firstLine = record.detail.components(separatedBy: .newlines).first ?? record.detail
        let reference = firstLine.components(separatedBy: " · ").dropFirst().joined(separator: " · ")
        let sheet = UIAlertController(title: record.label, message: record.detail, preferredStyle: .actionSheet)
        if !reference.isEmpty {
            sheet.addAction(UIAlertAction(title: "Copy Reference", style: .default) { _ in
                UIPasteboard.general.string = reference
            })
        }
        sheet.addAction(UIAlertAction(title: "Copy Details", style: .default) { _ in
            UIPasteboard.general.string = record.detail
        })
        sheet.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        if let popover = sheet.popoverPresentationController, let cell = tableView.cellForRow(at: indexPath) {
            popover.sourceView = cell
            popover.sourceRect = cell.bounds
        }
        present(sheet, animated: true)
    }

    private func attributedDetail(_ detail: String) -> NSAttributedString {
        let output = NSMutableAttributedString()
        let lines = detail.components(separatedBy: .newlines)
        for (index, line) in lines.enumerated() {
            if index > 0 { output.append(NSAttributedString(string: "\n")) }
            if index == 0 {
                output.append(
                    NSAttributedString(
                        string: line,
                        attributes: [
                            .font: UIFontMetrics(forTextStyle: .subheadline).scaledFont(
                                for: .monospacedSystemFont(ofSize: 14, weight: .regular)
                            ),
                            .foregroundColor: UIColor.secondaryLabel,
                        ]
                    )
                )
                continue
            }

            if let separator = line.firstIndex(of: ":") {
                let label = String(line[...separator])
                let value = String(line[line.index(after: separator)...])
                output.append(
                    NSAttributedString(
                        string: label,
                        attributes: [
                            .font: UIFont.preferredFont(forTextStyle: .subheadline).withTraits(.traitBold),
                            .foregroundColor: UIColor.label,
                        ]
                    )
                )
                output.append(
                    NSAttributedString(
                        string: value,
                        attributes: [
                            .font: UIFont.preferredFont(forTextStyle: .subheadline),
                            .foregroundColor: UIColor.secondaryLabel,
                        ]
                    )
                )
            } else {
                output.append(
                    NSAttributedString(
                        string: line,
                        attributes: [
                            .font: UIFont.preferredFont(forTextStyle: .subheadline),
                            .foregroundColor: UIColor.secondaryLabel,
                        ]
                    )
                )
            }
        }
        return output
    }

    private func tintColor(for section: String) -> UIColor {
        switch section {
        case "Transactions": return .systemBlue
        case "Addresses": return .systemPurple
        case "Inputs": return .systemOrange
        case "Outputs": return .systemGreen
        case "Keys": return .systemIndigo
        default: return .systemBlue
        }
    }
}

private func previewRecords(
    _ records: [(label: String, detail: String, symbol: String)],
    section: String
) -> [PreviewRecord] {
    records.map { PreviewRecord(section: section, label: $0.label, detail: $0.detail, symbol: $0.symbol) }
}

private func bip329SectionTitle(_ type: String) -> String {
    switch type {
    case "tx": return "Transactions"
    case "addr": return "Addresses"
    case "input": return "Inputs"
    case "output": return "Outputs"
    case "pubkey", "xpub": return "Keys"
    case "spscan": return "Silent Payments"
    default: return "Other Labels"
    }
}

private extension UIFont {
    func withTraits(_ traits: UIFontDescriptor.SymbolicTraits) -> UIFont {
        guard let descriptor = fontDescriptor.withSymbolicTraits(traits) else { return self }
        return UIFont(descriptor: descriptor, size: pointSize)
    }
}

private func displayLabel(forKey key: String) -> String {
    switch key {
    case "time": return "Date"
    case "fee": return "Fee"
    case "value": return "Value"
    default: return key.capitalized
    }
}

private func displayValue(_ optionalValue: Any?, forKey key: String) -> String? {
    guard let value = optionalValue, !(value is NSNull) else { return nil }
    if key == "time", let source = value as? String, let date = bip329Date(from: source) {
        return date.formatted(date: .abbreviated, time: .shortened)
    }
    if ["fee", "value"].contains(key), let number = value as? NSNumber {
        return "\(number.int64Value.formatted(.number.grouping(.automatic))) sats"
    }
    switch value {
    case let value as String:
        return value.isEmpty ? "Empty" : value
    case let value as Bool:
        return value ? "Yes" : "No"
    case let value as NSNumber:
        return value.stringValue
    case let value where JSONSerialization.isValidJSONObject(value):
        guard let data = try? JSONSerialization.data(withJSONObject: value, options: [.sortedKeys]),
              let text = String(data: data, encoding: .utf8) else { return nil }
        return text
    default:
        return String(describing: value)
    }
}

private func bip329Date(from source: String) -> Date? {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let date = formatter.date(from: source) { return date }
    formatter.formatOptions = [.withInternetDateTime]
    return formatter.date(from: source)
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
            let scriptDescription = ScriptDescription.from(script: script)
            let fiat = FiatEstimate.format(sats: value).map { " · \($0)" } ?? ""
            outputRecords.append(("Output \(index + 1)", "\(scriptDescription) · \(formatSats(value))\(fiat)", "arrow.up.circle.fill"))
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

        let outputValue = transaction?.outputValue
        let totalOutput = outputValue.map(formatSats)
        let outputDetail = outputValue.map { value in
            let count = "\(outputs) output\(outputs == 1 ? "" : "s")"
            let fiat = FiatEstimate.format(sats: value).map { " · \($0)" } ?? ""
            return "\(count) · \(formatSats(value))\(fiat)"
        } ?? "\(outputs) output\(outputs == 1 ? "" : "s")"

        var records: [Record] = [
            ("Format", "PSBT v\(version)", "doc.text"),
            ("Inputs", "\(inputs) input\(inputs == 1 ? "" : "s")", "arrow.down.to.line"),
            ("Outputs", outputDetail, "arrow.up.circle.fill"),
            ("Safety", "PSBT input metadata and signatures are unverified. Review this transaction in a signing wallet.", "exclamationmark.shield")
        ]
        records += inputMaps.enumerated().map { index, map in
            let utxo = witnessUTXO(map)
            let scriptDescription = utxo.map { ScriptDescription.from(script: $0.script) } ?? "Input metadata unavailable"
            let amount = utxo.map { " · \(formatSats($0.value))" } ?? ""
            return ("Input \(index + 1) (unverified)", "\(scriptDescription)\(amount)", "arrow.down.circle.fill")
        }
        if let transaction {
            records += transaction.outputs.enumerated().map { index, output in
                let scriptDescription = ScriptDescription.from(script: output.script)
                let fiat = FiatEstimate.format(sats: output.value).map { " · \($0)" } ?? ""
                return ("Output \(index + 1)", "\(scriptDescription) · \(formatSats(output.value))\(fiat)", "arrow.up.circle.fill")
            }
        }
        let summary = totalOutput.map { "\(inputs) inputs · \(outputs) outputs · \($0)" } ?? "\(inputs) inputs · \(outputs) outputs"
        return ("PSBT (unverified)", summary, records)
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
