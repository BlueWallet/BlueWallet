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
    }
}
