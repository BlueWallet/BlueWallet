import AppIntents
import UIKit

@available(iOS 16.4, *)
struct SendBitcoinIntent: AppIntent {
    static var title: LocalizedStringResource = "Send Bitcoin"
    
    static var description = IntentDescription(
        "Open the Send Details screen in your BlueWallet app."
    )
    
    static var parameterSummary: some ParameterSummary {
        Summary("Send Bitcoin from your BlueWallet")
    }

    func perform() async throws -> some IntentResult & ProvidesDialog {
        openSendDetails()
        return .result(dialog: IntentDialog("Opening Send Details..."))
    }

    private func openSendDetails() {
        let deepLinkURL = URL(string: "bluewallet://widget?action=openSend")
        UIApplication.shared.open(deepLinkURL!, options: [:], completionHandler: nil)
    }
}
