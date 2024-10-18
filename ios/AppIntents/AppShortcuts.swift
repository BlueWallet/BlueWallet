import AppIntents
@available(iOS 16.4, *)
struct WalletAppShortcuts: AppShortcutsProvider {
    
    @AppShortcutsBuilder
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: ReceiveBitcoinIntent(),
            phrases: [
                "Receive Bitcoin in \(.applicationName)",
                "Get Bitcoin address in \(.applicationName)"
            ],
            shortTitle: "Receive Bitcoin",
            systemImageName: "bitcoinsign.circle"
        )
        
        AppShortcut(
            intent: ScanQRCodeIntent(),
            phrases: [
                "Open QR Scanner in \(.applicationName)",
                "Scan QR code with \(.applicationName)"
            ],
            shortTitle: "Scan QR Code",
            systemImageName: "qrcode.viewfinder"
        )
        
        AppShortcut(
            intent: SendBitcoinIntent(),
            phrases: [
                "Send Bitcoin in \(.applicationName)",
                "Send funds in \(.applicationName)"
            ],
            shortTitle: "Send Bitcoin",
            systemImageName: "paperplane"
        )
    }
}
