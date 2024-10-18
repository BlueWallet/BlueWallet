import AppIntents
import SwiftUI

@available(iOS 16.4, *)
struct ReceiveBitcoinIntent: AppIntent {
    static var title: LocalizedStringResource = "Receive Bitcoin"
    
    static var description = IntentDescription(
        "Fetches and displays the Bitcoin receive address and label as a QR code from your BlueWallet wallet."
    )
    
    static var parameterSummary: some ParameterSummary {
        Summary("Receive Bitcoin from your selected wallet.")
    }

    // Conform to ShowsSnippetView to return a SwiftUI view
    func perform() async throws -> some IntentResult & ProvidesDialog & ShowsSnippetView {
        // Fetch wallet data (address and label) from Keychain
        guard let qrCodeData = KeychainService.shared.fetchQRCodeData() else {
            return .result(dialog: IntentDialog("No wallet data found. Please set up your wallet in BlueWallet."))
        }

        // Ensure both label and address are available
        guard !qrCodeData.label.isEmpty, !qrCodeData.address.isEmpty else {
            return .result(dialog: IntentDialog("Incomplete wallet data. Ensure both label and address are set."))
        }

        // Return the SwiftUI view with the snippet data.
      return .result(dialog: IntentDialog(stringLiteral: qrCodeData.label)) {
            ReceiveBitcoinSnippet(qrCode: qrCodeData.address)
        }
    }
}
