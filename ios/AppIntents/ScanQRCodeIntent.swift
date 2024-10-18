import AppIntents

@available(iOS 16.4, *)
struct ScanQRCodeIntent: AppIntent {
    static var title: LocalizedStringResource = "Open QR Scanner"
    
    static var description = IntentDescription(
        "Opens the QR code scanner in your BlueWallet app."
    )
    
    static var parameterSummary: some ParameterSummary {
        Summary("Open QR Scanner in BlueWallet") // Replacing .applicationName with a static string for now.
    }

    func perform() async throws -> some IntentResult & ProvidesDialog {
        // Trigger the deep link to navigate to the QR Scanner
        openQRCodeScanner()
        return .result(dialog: IntentDialog("Opening QR Code Scanner..."))
    }

    private func openQRCodeScanner() {
        // Construct the deep link URL to open the QR Scanner
        if let deepLinkURL = URL(string: "bluewallet://widget?action=openScanQRCode") {
            UIApplication.shared.open(deepLinkURL, options: [:], completionHandler: nil)
        }
    }
}
