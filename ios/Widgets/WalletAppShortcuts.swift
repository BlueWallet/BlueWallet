//
//  WalletAppShortcuts.swift
//  BlueWallet


import AppIntents

@available(iOS 16.4, *)
struct WalletAppShortcuts: AppShortcutsProvider {
    static let shortcutTileColor: ShortcutTileColor = .blue

    @AppShortcutsBuilder
    static var appShortcuts: [AppShortcut] {
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
    }
}
