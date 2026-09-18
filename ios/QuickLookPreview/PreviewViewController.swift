import QuickLook
import UIKit
import SwiftUI

final class PreviewViewController: UIViewController, QLPreviewingController {
    private var host: UIViewController?

    private func presentPreview<Content: View>(_ content: Content) {
        host?.willMove(toParent: nil)
        host?.view.removeFromSuperview()
        host?.removeFromParent()
        let controller = UIHostingController(rootView: content)
        addChild(controller)
        controller.view.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(controller.view)
        NSLayoutConstraint.activate([
            controller.view.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            controller.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            controller.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            controller.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
        ])
        controller.didMove(toParent: self)
        host = controller
    }

    func preparePreviewOfFile(at url: URL) async throws {
        loadViewIfNeeded()
        do {
            if url.pathExtension.lowercased() == "bwcoord" {
                let setup = try await Task.detached(priority: .userInitiated) { try MultisigCoordination.parse(file: url) }.value
                presentPreview(VaultPreviewView(setup: setup))
            } else {
                let document = try await Task.detached(priority: .userInitiated) { try QuickLookDocument.read(file: url) }.value
                presentPreview(RecordsPreviewView(document: document))
            }
        } catch {
            let message: String
            switch error {
            case QuickLookDocument.Failure.tooLarge: message = "This file is too large to preview. Open it in BlueWallet."
            case QuickLookDocument.Failure.unsupportedVersion: message = "This PSBT version is not supported by Quick Look."
            default: message = "The file could not be read or contains invalid data. Export a new copy and try again."
            }
            presentPreview(PreviewEmptyView(title: "Preview unavailable", message: message, symbol: "doc.badge.ellipsis"))
        }
    }
}

struct PreviewEmptyView: View {
    let title: String
    let message: String
    var symbol = "magnifyingglass"
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: symbol).font(.largeTitle).foregroundColor(.secondary).accessibilityHidden(true)
            Text(VaultLocalization.text(title)).font(.title2.bold())
            Text(VaultLocalization.text(message)).font(.body).foregroundColor(.secondary)
        }.multilineTextAlignment(.center).padding(32).frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color(uiColor: .systemGroupedBackground))
    }
}

struct RecordsPreviewView: View {
    let document: QuickLookDocument
    @State private var query = ""
    @State private var category = "all"
    @State private var network = BitcoinEncoding.Network.scripts
    @FocusState private var searchFocused: Bool
    @Environment(\.sizeCategory) private var sizeCategory
    private var matches: [Int] { document.matchingRecords(query: query, category: category) }

    var body: some View {
        VStack(spacing: 0) {
            if document.kind == .labels { labelControls }
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 16) {
                    header
                    if document.kind != .labels {
                        VStack(alignment: .leading, spacing: 8) {
                            Picker(VaultLocalization.text("Address network"), selection: $network) {
                                ForEach(BitcoinEncoding.Network.allCases, id: \.self) { Text($0.title).tag($0) }
                            }.pickerStyle(.menu).accessibilityIdentifier("PreviewNetwork")
                            Text(VaultLocalization.text("Choose a network to display addresses. The file does not specify one."))
                                .font(.footnote).foregroundColor(.secondary)
                        }
                    }
                    if document.records.isEmpty {
                        PreviewEmptyView(title: document.skippedLines > 0 ? "No valid labels" : "No labels in this file", message: document.skippedLines > 0 ? "Export labels as BIP-329 JSONL and try again." : "Labels added to this file will appear here.", symbol: "tag")
                    } else if matches.isEmpty {
                        PreviewEmptyView(title: "No matching labels", message: "Try another search or select a different filter.")
                        Button(VaultLocalization.text("Clear filters")) { query = ""; category = "all"; searchFocused = false }
                    }
                    ForEach(matches, id: \.self) { index in
                        RecordCard(record: document.records[index], network: network, index: index)
                    }
                }.padding(16).frame(maxWidth: 760).frame(maxWidth: .infinity)
            }
        }.background(Color(uiColor: .systemGroupedBackground))
    }
    private var labelControls: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: "magnifyingglass").foregroundColor(.secondary)
                TextField(VaultLocalization.text("Search labels"), text: $query)
                    .textInputAutocapitalization(.never).disableAutocorrection(true)
                    .focused($searchFocused).submitLabel(.search).onSubmit { searchFocused = false }
                    .accessibilityIdentifier("LabelSearch")
                if !query.isEmpty {
                    Button { query = "" } label: { Image(systemName: "xmark.circle.fill") }
                        .accessibilityLabel(VaultLocalization.text("Clear search"))
                }
            }.padding(10).background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 10))
            if sizeCategory.isAccessibilityCategory {
                VStack(alignment: .leading, spacing: 8) { labelFilter; resultCount }
            } else {
                HStack { labelFilter; Spacer(); resultCount }
            }
        }.padding(16).frame(maxWidth: 760).frame(maxWidth: .infinity)
    }
    private var labelFilter: some View {
        Picker(VaultLocalization.text("Label type"), selection: $category) {
            ForEach(["all", "addr", "tx", "pubkey", "xpub", "input", "output"], id: \.self) { value in
                Text(QuickLookDocument.categoryTitle(value)).tag(value)
            }
        }.pickerStyle(.menu).accessibilityIdentifier("LabelFilter")
    }
    private var resultCount: some View {
        Text(VaultLocalization.format("Results: %1$@ / %2$@", VaultLocalization.number(matches.count), VaultLocalization.number(document.records.count)))
            .font(.footnote).foregroundColor(.secondary).accessibilityIdentifier("LabelResults")
    }
    private var header: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(document.title).font(.title2.bold())
            Text(document.summary).font(.subheadline).foregroundColor(.secondary)
            if let total = document.total {
                Text(VaultLocalization.text("Output total")).font(.subheadline).foregroundColor(.secondary)
                Text(QuickLookDocument.sats(total)).font(.title2.bold()).textSelection(.enabled)
                if let fiat = FiatEstimate.format(sats: total) { Text(fiat).font(.subheadline).foregroundColor(.secondary) }
            }
            if document.kind == .psbt {
                Divider()
                Text(VaultLocalization.format("PSBT version %@", VaultLocalization.number(document.version))).font(.footnote)
                Text(VaultLocalization.text("Reported signing progress")).font(.headline)
                ProgressView(value: Double(document.signedInputs), total: Double(max(1, document.inputCount)))
                    .accessibilityLabel(VaultLocalization.text("Inputs with signature data"))
                    .accessibilityValue(VaultLocalization.policy(required: document.signedInputs, total: document.inputCount))
                Text(VaultLocalization.format("Signature data: %1$@ / %2$@ inputs", VaultLocalization.number(document.signedInputs), VaultLocalization.number(document.inputCount)))
                Text(VaultLocalization.format("Finalization data: %1$@ / %2$@ inputs", VaultLocalization.number(document.finalizedInputs), VaultLocalization.number(document.inputCount)))
                Divider()
                Text(VaultLocalization.text("Fee from supplied input values")).font(.headline)
                if let fee = document.fee {
                    Text(QuickLookDocument.sats(fee)).font(.title3.bold()).textSelection(.enabled)
                } else {
                    Text(VaultLocalization.text("Unavailable until every input amount is present.")).foregroundColor(.secondary)
                }
                Text(VaultLocalization.text("Signatures and blockchain status are not verified. Reported progress does not establish that this PSBT is ready to broadcast."))
                    .font(.footnote).foregroundColor(.secondary)
                Text(VaultLocalization.text("Previous transactions are matched to their referenced transaction IDs when provided. Other input values are supplied metadata."))
                    .font(.footnote).foregroundColor(.secondary)
            }
        }.frame(maxWidth: .infinity, alignment: .leading).padding(20)
            .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 16))
    }
}

private struct RecordCard: View {
    let record: QuickLookDocument.Record
    let network: BitcoinEncoding.Network
    let index: Int
    private var address: String? { record.script.flatMap { BitcoinEncoding.address(script: $0, network: network) } }
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label(record.title, systemImage: record.category == "output" ? "arrow.up.circle" : record.category == "input" ? "arrow.down.circle" : "tag")
                .font(.headline)
            if let amount = record.amount {
                Text(QuickLookDocument.sats(amount)).font(.title3.bold())
                    .copyable(QuickLookDocument.sats(amount), action: "Copy amount")
                    .accessibilityIdentifier("PreviewAmount-\(index)")
                if let fiat = FiatEstimate.format(sats: amount) { Text(fiat).font(.subheadline).foregroundColor(.secondary) }
            }
            if let address {
                Text(VaultLocalization.text(record.category == "input" ? "Previous output address" : "Destination address")).font(.caption).foregroundColor(.secondary)
                identifier(address, action: "Copy address").accessibilityIdentifier("PreviewAddress-\(index)")
            } else if let script = record.script {
                Text(VaultLocalization.text("Output script")).font(.caption).foregroundColor(.secondary)
                identifier(BitcoinEncoding.hexString(script), action: "Copy script")
            }
            if !record.reference.isEmpty {
                Text(QuickLookDocument.categoryTitle(record.category)).font(.caption).foregroundColor(.secondary)
                identifier(record.reference, action: "Copy reference")
            }
            if !record.detail.isEmpty { Text(record.detail).font(.subheadline).foregroundColor(.secondary) }
            if let status = record.status { Text(status).font(.caption.weight(.medium)).foregroundColor(.secondary) }
        }.frame(maxWidth: .infinity, alignment: .leading).padding(16)
            .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 14))

    }
    private func identifier(_ value: String, action: String) -> some View {
        Text(verbatim: value.map(String.init).joined(separator: "\u{200B}"))
            .font(.system(.footnote, design: .monospaced))
            .fixedSize(horizontal: false, vertical: true)
            .environment(\.layoutDirection, .leftToRight)
            .accessibilityLabel(value)
            .copyable(value, action: action)
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
              let rate = rates["BTC_\(currency)"] as? Double, rate.isFinite, rate > 0 else { return nil }

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
