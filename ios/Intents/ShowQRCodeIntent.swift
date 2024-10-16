import AppIntents
import SwiftUI

@available(iOS 16.0, *)
struct ShowQRCodeIntent: AppIntent {
    static var title: LocalizedStringResource = "Show QR Code"
    
    @Parameter(title: "QR Code Key", default: "qrcode")
    var key: String
    
    static var description = IntentDescription("Fetches and displays the QR code and label from the keychain with the app icon in the middle.")
    
    func perform() async throws -> some IntentResult {
        guard let qrCodeData = fetchQRCodeFromKeychain(for: key) else {
            return .result(dialog: "No QR Code found for key: \(key)", view: EmptyQRCodeView())
        }
        
        return .result(dialog: "QR Code for \(qrCodeData.label)", view: ShowQRCodeView(qrCode: qrCodeData.address, label: qrCodeData.label))
    }
    
    // Helper function to fetch QR code data from Keychain
    private func fetchQRCodeFromKeychain(for key: String) -> (label: String, address: String)? {
        // Fetch the data from Keychain
        return ("Example Label", "Example Address")
    }
}
