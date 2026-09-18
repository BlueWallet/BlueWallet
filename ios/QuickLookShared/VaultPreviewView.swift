import SwiftUI
import UIKit

/// Mirrors WalletGradient.multisigHdWallet and MultipleStepsListItem.
enum VaultAppearance {
    static func color(_ hex: UInt32) -> UIColor {
        UIColor(red: CGFloat((hex >> 16) & 255) / 255, green: CGFloat((hex >> 8) & 255) / 255, blue: CGFloat(hex & 255) / 255, alpha: 1)
    }
    static let gradient = [color(0x1ce6eb).cgColor, color(0x296fc5).cgColor, color(0x3500A2).cgColor]
    static let background = UIColor { $0.userInterfaceStyle == .dark ? color(0x121212) : .white }
    static let secondary = color(0x9aa0aa)
    static let panel = UIColor { $0.userInterfaceStyle == .dark ? color(0x262626) : color(0xf5f5f5) }
    static let success = UIColor { $0.userInterfaceStyle == .dark ? color(0x8EFFE5) : color(0x2FA380) }
    static let check = UIColor { $0.userInterfaceStyle == .dark ? .black : .white }
    static let artwork = UIImage(named: "vault-shape", in: VaultLocalization.bundle, compatibleWith: nil)

}

struct VaultPreviewView: View {
    let setup: MultisigCoordination
    @State private var query = ""
    @FocusState private var searchFocused: Bool
    private var indices: [Int] { setup.matchingCosignerIndices(query: query) }
    private var searching: Bool { !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                HStack {
                    Image(systemName: "magnifyingglass").foregroundColor(.secondary)
                    TextField(VaultLocalization.text("Search vault keys"), text: $query)
                        .textInputAutocapitalization(.never)
                        .disableAutocorrection(true)
                        .focused($searchFocused)
                        .submitLabel(.search)
                        .onSubmit { searchFocused = false }
                        .accessibilityIdentifier("VaultKeySearch")
                        .accessibilityHint(VaultLocalization.text("Search by key number, fingerprint, derivation path, or public key."))
                    if !query.isEmpty {
                        Button { query = "" } label: { Image(systemName: "xmark.circle.fill") }
                            .accessibilityLabel(VaultLocalization.text("Clear search"))
                            .foregroundColor(.secondary)
                    }
                }
                .padding(10)
                .background(Color(VaultAppearance.panel), in: RoundedRectangle(cornerRadius: 10))
                if searchFocused || searching {
                    Button(VaultLocalization.text("Cancel")) { query = ""; searchFocused = false }
                }
            }.padding(.horizontal, 16).padding(.vertical, 8)
            ScrollViewReader { proxy in
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        VaultCard(setup: setup)
                        HStack(spacing: 10) {
                            Text(VaultLocalization.number(setup.required))
                                .padding(.horizontal, 10).padding(.vertical, 5)
                                .background(Color(VaultAppearance.panel), in: RoundedRectangle(cornerRadius: 6))
                            Text(VaultLocalization.text("Signatures required")).foregroundColor(.secondary)
                        }.font(.subheadline.weight(.semibold))
                        if searching {
                            Text(indices.isEmpty ? VaultLocalization.text("No matching keys") : VaultLocalization.format("Keys: %1$@ / %2$@", VaultLocalization.number(indices.count), VaultLocalization.number(setup.total)))
                                .font(.footnote).foregroundColor(.secondary)
                                .accessibilityIdentifier("VaultKeySearchResults").id("results")
                        }
                        VStack(spacing: 0) {
                            ForEach(indices, id: \.self) { index in
                                VaultKeyView(index: index, cosigner: setup.cosigners[index])
                            }
                        }
                        Text(VaultLocalization.text("Public keys only · Coordination setup"))
                            .font(.footnote).foregroundColor(.secondary)
                    }.padding(16)
                }
                .onChange(of: query) { _ in
                    if searching { proxy.scrollTo("results", anchor: .top) }
                }
            }
        }.background(Color(VaultAppearance.background))
    }
}

private struct VaultCard: View {
    let setup: MultisigCoordination
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(setup.name).font(.title3.weight(.semibold))
            Text(setup.policy).font(.largeTitle.bold())
            Text(VaultLocalization.format("Multisig Vault · %@", setup.format)).font(.subheadline)
        }
        .foregroundColor(.white).frame(maxWidth: .infinity, alignment: .leading).padding(20)
        .background(alignment: .trailing) {
            if let artwork = VaultAppearance.artwork {
                Image(uiImage: artwork).resizable().scaledToFit().opacity(0.12).accessibilityHidden(true)
            }
        }
        .background(LinearGradient(colors: VaultAppearance.gradient.map { Color(cgColor: $0) }, startPoint: .top, endPoint: .bottom))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

private struct VaultKeyView: View {
    let index: Int
    let cosigner: MultisigCoordination.Cosigner
    private func copyKey() { UIPasteboard.general.string = cosigner.key }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 16) {
                Image(systemName: "checkmark").font(.title2.weight(.medium))
                    .foregroundColor(Color(VaultAppearance.check))
                    .frame(width: 42, height: 42).background(Color(VaultAppearance.success), in: Circle())
                    .accessibilityHidden(true)
                Text(VaultLocalization.key(index + 1)).font(.headline).foregroundColor(.secondary)
            }
            VStack(alignment: .leading, spacing: 10) {
                Text(cosigner.fingerprint).font(.subheadline.weight(.semibold))
                if let path = cosigner.derivation { Text(path).font(.footnote).foregroundColor(.secondary) }
                // Permit wrapping between characters without inserting visible hyphens.
                // Clipboard and accessibility values retain the original key.
                Text(verbatim: cosigner.key.map(String.init).joined(separator: "\u{200B}"))
                    .font(.system(.footnote, design: .monospaced))
                    .fixedSize(horizontal: false, vertical: true)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .contentShape(Rectangle())
                    .contextMenu {
                        Button(action: copyKey) { Label(VaultLocalization.text("Copy public key"), systemImage: "doc.on.doc") }
                    }
                    .accessibilityIdentifier("VaultPublicKey-\(index + 1)")
                    .accessibilityLabel(VaultLocalization.format("Vault key %@ public key", VaultLocalization.number(index + 1)))
                    .accessibilityValue(cosigner.key)
                    .accessibilityHint(VaultLocalization.text("Touch and hold to copy the full public key."))
                    .accessibilityAction(named: Text(VaultLocalization.text("Copy public key")), copyKey)
            }
            .environment(\.layoutDirection, .leftToRight)
            .padding(16)
            .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color(VaultAppearance.panel)))
            .padding(.leading, 40)
        }
        .padding(.bottom, 24)
        .background(alignment: .leading) {
            VStack { Color.clear.frame(height: 42); DashedConnector().stroke(Color.gray.opacity(0.5), style: StrokeStyle(lineWidth: 1, dash: [3, 3])) }
                .frame(width: 1).padding(.leading, 21)
        }
    }
}

private struct DashedConnector: Shape {
    func path(in rect: CGRect) -> Path {
        Path { path in path.move(to: CGPoint(x: rect.midX, y: rect.minY)); path.addLine(to: CGPoint(x: rect.midX, y: rect.maxY)) }
    }
}
