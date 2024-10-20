import AppIntents
import SwiftUI

enum WalletAddressError: Error {
    case noWalletSelected
    case invalidWalletData
}

@available(iOS 16.4, *)
struct WalletAddressResult: AppEntity {
    let label: String
    let address: String

    var id: String {
        UUID().uuidString
    }
    
    static var defaultQuery = WalletAddressResultQuery()

    static var typeDisplayRepresentation: TypeDisplayRepresentation {
        TypeDisplayRepresentation(name: "Wallet Address Result")
    }
    
    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(address)", subtitle: "\(label)")
    }
}

@available(iOS 16.4, *)
struct WalletAddressResultQuery: EntityQuery {
    func entities(for identifiers: [WalletAddressResult.ID]) async throws -> [WalletAddressResult] {
        return []
    }
    
    func suggestedEntities() async throws -> [WalletAddressResult] {
        return []
    }
}

@available(iOS 16.4, *)
struct WalletAddressIntent: AppIntent {
    static var title: LocalizedStringResource = "Wallet Address"

    static var description = IntentDescription(
        "Display the Bitcoin wallet label and adress as a QR code from your selected wallet in BlueWallet."
    )

    static var parameterSummary: some ParameterSummary {
        Summary("Display the label and address of the selected wallet")
    }

    func perform() async throws -> some IntentResult & ProvidesDialog & ShowsSnippetView & ReturnsValue<String> {
        guard let qrCodeData = KeychainService.shared.fetchQRCodeData() else {
            throw WalletAddressError.noWalletSelected
        }

        guard !qrCodeData.label.isEmpty, !qrCodeData.address.isEmpty else {
            throw WalletAddressError.invalidWalletData
        }

        let bitcoinAddress = qrCodeData.address // Read-only address

        return .result(value: bitcoinAddress, dialog: dialog(for: qrCodeData.label)) {
            WalletAddressSnippet(qrCode: bitcoinAddress)
        }
    }

    private func dialog(for label: String) -> IntentDialog {
        return IntentDialog("\(label)")
    }

}

extension WalletAddressError: LocalizedError {
    public var errorDescription: String? {
        switch self {
        case .noWalletSelected:
            return "No wallet selected."
        case .invalidWalletData:
            return "Invalid wallet data."
        }
    }
}
