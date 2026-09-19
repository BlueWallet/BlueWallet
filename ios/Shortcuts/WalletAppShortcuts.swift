//
//  WalletAppShortcuts.swift
//  BlueWallet


import AppIntents
import CoreImage.CIFilterBuiltins
import Security
import SwiftUI
import UIKit
import UniformTypeIdentifiers

public struct ReceiveAddressShortcutWallet: Codable, Identifiable {
    public let id: String
    public let label: String
    public let address: String

    public init(id: String, label: String, address: String) {
        self.id = id
        self.label = label
        self.address = address
    }
}

@available(iOS 16.0, *)
public struct ReceiveAddressWalletEntity: AppEntity {
    public static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Wallet")
    public static var defaultQuery = ReceiveAddressWalletQuery()

    public let id: String
    public let label: String
    public let address: String

    public var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(label)", subtitle: "\(address)")
    }

    public init(wallet: ReceiveAddressShortcutWallet) {
        id = wallet.id
        label = wallet.label
        address = wallet.address
    }
}

@available(iOS 16.0, *)
public struct ReceiveAddressWalletQuery: EntityQuery {
    public init() {}

    public func entities(for identifiers: [ReceiveAddressWalletEntity.ID]) async throws -> [ReceiveAddressWalletEntity] {
        Self.storedWallets().filter { identifiers.contains($0.id) }
    }

    public func suggestedEntities() async throws -> IntentItemCollection<ReceiveAddressWalletEntity> {
        let wallets = Self.storedWallets()
        return IntentItemCollection(
            promptLabel: wallets.isEmpty
                ? "No wallets available. Open BlueWallet, enable Receive Address Shortcut in Settings > Privacy, and add an on-chain wallet or turn off Hide from Home for an existing wallet. This feature is unavailable while password-protected storage is enabled."
                : "Choose a wallet",
            items: wallets
        )
    }

    public static func storedWallets() -> [ReceiveAddressWalletEntity] {
        guard let data = receiveAddressShortcutData(),
              let shortcutData = try? JSONDecoder().decode(ReceiveAddressShortcutData.self, from: data),
              shortcutData.enabled else {
            return []
        }

        return shortcutData.wallets.map(ReceiveAddressWalletEntity.init)
    }

    private static func receiveAddressShortcutData() -> Data? {
        guard let accessGroup = Bundle.main.object(forInfoDictionaryKey: "ReceiveAddressShortcutKeychainAccessGroup") as? String,
              !accessGroup.contains("$(AppIdentifierPrefix)") else {
            return nil
        }
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "io.bluewallet.receive-address-shortcut",
            kSecAttrAccount as String: "wallets",
            kSecAttrAccessGroup as String: accessGroup,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var result: CFTypeRef?
        return SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess ? result as? Data : nil
    }
}

private struct ReceiveAddressShortcutData: Codable {
    let enabled: Bool
    let wallets: [ReceiveAddressShortcutWallet]
}

@available(iOS 16.0, *)
private struct ReceiveAddressSnippetView: View {
    let walletLabel: String
    let address: String

    var body: some View {
        VStack(spacing: 12) {
            Image(uiImage: ReceiveAddressQRCode.image(for: address))
                .interpolation(.none)
                .resizable()
                .scaledToFit()
                .frame(width: 180, height: 180)
                .padding(12)
                .background(.white)
                .accessibilityLabel("QR code for \(address)")
            Text(walletLabel)
                .font(.headline)
            Text(address)
                .font(.caption.monospaced())
                .multilineTextAlignment(.center)
                .textSelection(.enabled)
            ViewThatFits(in: .horizontal) {
                HStack { copyButtons }
                VStack { copyButtons }
            }
            .buttonStyle(.bordered)
            .controlSize(.regular)
        }
        .padding()
    }

    @ViewBuilder
    private var copyButtons: some View {
        if #available(iOS 17.0, *) {
            Button(intent: CopyReceiveAddressQRCodeIntent(address: address)) {
                Label("Copy QR Code", systemImage: "qrcode")
            }
            Button(intent: CopyReceiveAddressIntent(address: address)) {
                Label("Copy Address", systemImage: "doc.on.doc")
            }
        } else {
            Button {
                UIPasteboard.general.image = ReceiveAddressQRCode.image(for: address)
            } label: {
                Label("Copy QR Code", systemImage: "qrcode")
            }
            Button {
                UIPasteboard.general.string = address
            } label: {
                Label("Copy Address", systemImage: "doc.on.doc")
            }
        }
    }
}

private enum ReceiveAddressQRCode {
    static func image(for value: String) -> UIImage {
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(value.utf8)
        filter.correctionLevel = "M"
        guard let image = filter.outputImage?.transformed(by: CGAffineTransform(scaleX: 10, y: 10)),
              let cgImage = CIContext().createCGImage(image, from: image.extent) else {
            return UIImage()
        }
        return UIImage(cgImage: cgImage)
    }
}

@available(iOS 16.0, *)
private struct CopyReceiveAddressIntent: AppIntent {
    static var title: LocalizedStringResource = "Copy Receive Address"
    static var openAppWhenRun: Bool { false }
    static var authenticationPolicy: IntentAuthenticationPolicy { .requiresAuthentication }

    @Parameter(title: "Address")
    var address: String

    init() {}

    init(address: String) {
        self.address = address
    }

    func perform() async throws -> some IntentResult & ProvidesDialog {
        guard ReceiveAddressWalletQuery.storedWallets().contains(where: { $0.address == address }) else {
            throw ReceiveAddressIntentError.disabledOrUnavailable
        }
        UIPasteboard.general.string = address
        return .result(dialog: "Receive address copied.")
    }
}

@available(iOS 16.0, *)
private struct CopyReceiveAddressQRCodeIntent: AppIntent {
    static var title: LocalizedStringResource = "Copy Receive Address QR Code"
    static var openAppWhenRun: Bool { false }
    static var authenticationPolicy: IntentAuthenticationPolicy { .requiresAuthentication }

    @Parameter(title: "Address")
    var address: String

    init() {}

    init(address: String) {
        self.address = address
    }

    func perform() async throws -> some IntentResult & ProvidesDialog {
        guard ReceiveAddressWalletQuery.storedWallets().contains(where: { $0.address == address }) else {
            throw ReceiveAddressIntentError.disabledOrUnavailable
        }
        UIPasteboard.general.image = ReceiveAddressQRCode.image(for: address)
        return .result(dialog: "Receive address QR code copied.")
    }
}

@available(iOS 16.0, *)
public struct ReceiveAddressAutomationOutput: AppEntity {
    public static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Receive Address")
    public static var defaultQuery = ReceiveAddressAutomationOutputQuery()

    public let id: String
    @Property(title: "Address") public var address: String
    @Property(title: "QR Code") public var qrCode: IntentFile

    public var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(address)")
    }

    public init(wallet: ReceiveAddressWalletEntity) {
        id = wallet.id
        address = wallet.address
        qrCode = IntentFile(data: ReceiveAddressQRCode.image(for: wallet.address).pngData() ?? Data(), filename: "receive-address-qr.png", type: .png)
    }
}

@available(iOS 16.0, *)
public struct ReceiveAddressAutomationOutputQuery: EntityQuery {
    public init() {}

    public func entities(for identifiers: [ReceiveAddressAutomationOutput.ID]) async throws -> [ReceiveAddressAutomationOutput] {
        ReceiveAddressWalletQuery.storedWallets()
            .filter { identifiers.contains($0.id) }
            .map(ReceiveAddressAutomationOutput.init)
    }

    public func suggestedEntities() async throws -> [ReceiveAddressAutomationOutput] {
        ReceiveAddressWalletQuery.storedWallets().map(ReceiveAddressAutomationOutput.init)
    }
}

@available(iOS 16.0, *)
struct ReceiveAddressIntent: AppIntent {
    static var title: LocalizedStringResource = "Receive Address"
    static var description = IntentDescription("Display the receive address for one of your on-chain wallets. If no wallets are available, open BlueWallet and enable Receive Address Shortcut in Settings > Privacy. Add an on-chain wallet or turn off Hide from Home for an existing wallet. This feature is unavailable while password-protected storage is enabled.")
    static var openAppWhenRun: Bool { false }
    static var authenticationPolicy: IntentAuthenticationPolicy { .requiresAuthentication }

    @Parameter(
        title: "Wallet",
        description: "Choose an on-chain wallet that is not hidden from Home. Enable Receive Address Shortcut in BlueWallet's Settings > Privacy first. Password-protected storage must be off.",
        requestValueDialog: "Which wallet should provide the receive address?"
    )
    var wallet: ReceiveAddressWalletEntity

    static var parameterSummary: some ParameterSummary {
        Summary("Show receive address for \(\.$wallet)")
    }

    @MainActor
    func perform() async throws -> some IntentResult & ReturnsValue<ReceiveAddressAutomationOutput> & ProvidesDialog & ShowsSnippetView {
        guard let currentWallet = ReceiveAddressWalletQuery.storedWallets().first(where: { $0.id == wallet.id }) else {
            throw ReceiveAddressIntentError.disabledOrUnavailable
        }

        return .result(
            value: ReceiveAddressAutomationOutput(wallet: currentWallet),
            dialog: "Receive address for \(currentWallet.label)",
            view: ReceiveAddressSnippetView(walletLabel: currentWallet.label, address: currentWallet.address)
        )
    }
}

private enum ReceiveAddressIntentError: LocalizedError {
    case disabledOrUnavailable

    var errorDescription: String? {
        switch self {
        case .disabledOrUnavailable:
            "This wallet is no longer available. Open BlueWallet, enable Receive Address Shortcut in Settings > Privacy, and make sure an on-chain wallet is not hidden from Home. Password-protected storage must be off. Then select an available wallet in this shortcut."
        }
    }
}

@available(iOS 16.4, *)
public struct WalletAppShortcuts: AppShortcutsProvider {
    public static let shortcutTileColor: ShortcutTileColor = .blue
    @AppShortcutsBuilder
    public static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: PriceIntent(),
            phrases: [
                "Get the Bitcoin price with ${applicationName}",
                "What's the Bitcoin price using ${applicationName}",
                "Get the Bitcoin price in \(\.$fiatCurrency) with ${applicationName}",
                "What's the Bitcoin price in \(\.$fiatCurrency) using ${applicationName}",
                "Show the Bitcoin market rate in \(\.$fiatCurrency) with ${applicationName}"
            ],
            shortTitle: "Bitcoin Price",
            systemImageName: "bitcoinsign.circle.fill"
        )

        AppShortcut(
            intent: ReceiveAddressIntent(),
            phrases: [
                "Show my receive address with ${applicationName}",
                "Get a receive address from ${applicationName}"
            ],
            shortTitle: "Receive Address",
            systemImageName: "qrcode"
        )
        
    }
}
