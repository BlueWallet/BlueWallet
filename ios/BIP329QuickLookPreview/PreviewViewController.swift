import QuickLook
import UIKit

final class PreviewViewController: UIViewController, QLPreviewingController, UITableViewDataSource {
    private let titleLabel = UILabel()
    private let summaryLabel = UILabel()
    private let tableView = UITableView(frame: .zero, style: .insetGrouped)
    private var records: [(label: String, detail: String, symbol: String)] = []

    override func viewDidLoad() {
        super.viewDidLoad()

        view.backgroundColor = .systemBackground

        titleLabel.text = "BIP-329 Wallet Labels"
        titleLabel.font = .preferredFont(forTextStyle: .title2)
        titleLabel.adjustsFontForContentSizeCategory = true

        summaryLabel.font = .preferredFont(forTextStyle: .subheadline)
        summaryLabel.textColor = .secondaryLabel
        summaryLabel.adjustsFontForContentSizeCategory = true

        let header = UIStackView(arrangedSubviews: [titleLabel, summaryLabel])
        header.axis = .vertical
        header.spacing = 4
        header.layoutMargins = UIEdgeInsets(top: 20, left: 20, bottom: 8, right: 20)
        header.isLayoutMarginsRelativeArrangement = true

        tableView.dataSource = self
        tableView.rowHeight = UITableView.automaticDimension
        tableView.estimatedRowHeight = 68

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

            return (records, invalidLineCount)
        }.value

        records = parsed.0
        if records.isEmpty {
            summaryLabel.text = parsed.1 == 0 ? "No labels in this file" : "No valid BIP-329 records"
        } else if parsed.1 == 0 {
            summaryLabel.text = records.count == 1 ? "1 label" : "\(records.count) labels"
        } else {
            let labels = records.count == 1 ? "1 label" : "\(records.count) labels"
            let skipped = parsed.1 == 1 ? "1 invalid line skipped" : "\(parsed.1) invalid lines skipped"
            summaryLabel.text = "\(labels) · \(skipped)"
        }
        tableView.reloadData()
    }

    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        records.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = UITableViewCell(style: .subtitle, reuseIdentifier: nil)
        let record = records[indexPath.row]

        cell.textLabel?.text = record.label
        cell.textLabel?.numberOfLines = 0
        cell.detailTextLabel?.text = record.detail
        cell.detailTextLabel?.numberOfLines = 0
        cell.imageView?.image = UIImage(systemName: record.symbol)
        cell.imageView?.tintColor = .systemBlue
        cell.selectionStyle = .none

        return cell
    }
}
