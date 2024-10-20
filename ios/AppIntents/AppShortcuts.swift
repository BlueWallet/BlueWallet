import AppIntents
@available(iOS 16.4, *)
struct WalletAppShortcuts: AppShortcutsProvider {
    
    @AppShortcutsBuilder
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: WalletAddressIntent(),
            phrases: [
                "Wallet Address in \(.applicationName)",
                "Get Bitcoin address in \(.applicationName)"
            ],
            shortTitle: "Wallet Address",
            systemImageName: "bitcoinsign.circle"
        )
      AppShortcut(
        intent: GenerateQRCodeIntent(),
          phrases: [
              "Generate QR Code in \(.applicationName)",
              "Get address as QR Code in \(.applicationName)"
          ],
          shortTitle: "Generate QR Code",
          systemImageName: "qrcode"
      )
  }
}
