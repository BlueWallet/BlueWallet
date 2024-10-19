import AppIntents
import SwiftUI

@available(iOS 16.4, *)
struct ReceiveBitcoinIntent: AppIntent {
    static var title: LocalizedStringResource = "Receive Bitcoin"
    
    static var description = IntentDescription(
        "Display the Bitcoin receive address and label as a QR code from your selected wallet in BlueWallet."
    )
    
    static var parameterSummary: some ParameterSummary {
        Summary("Receive Bitcoin from your selected wallet in your BlueWallet settings > General > Shortcuts.")
    }

    func perform() async throws -> some IntentResult & ProvidesDialog & ShowsSnippetView {
        guard let qrCodeData = KeychainService.shared.fetchQRCodeData() else {
            return .result(dialog: IntentDialog("No wallet selected. Please choose a wallet to use in your BlueWallet settings > General > Shortcuts."))
        }

        guard !qrCodeData.label.isEmpty, !qrCodeData.address.isEmpty else {
            return .result(dialog: IntentDialog("Something went wrong. Please choose a wallet to use in your BlueWallet settings > General > Shortcuts."))
        }

        return .result(dialog: IntentDialog(stringLiteral: qrCodeData.label)) {
            ReceiveBitcoinSnippet(qrCode: qrCodeData.address)
        }
    }
}
