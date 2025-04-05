//
//  WalletAppShortcuts.swift
//  BlueWallet


import AppIntents

@available(iOS 16.4, *)
struct WalletAppShortcuts: AppShortcutsProvider {
    
    @AppShortcutsBuilder
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: PriceIntent(),
            phrases: [
                AppShortcutPhrase<PriceIntent>("Market rate for Bitcoin in \(\.$fiatCurrency) using ${applicationName}"),
                AppShortcutPhrase<PriceIntent>("Get the current Bitcoin market rate in \(\.$fiatCurrency) with ${applicationName}"),
                AppShortcutPhrase<PriceIntent>("What's the current Bitcoin rate in \(\.$fiatCurrency) using ${applicationName}?"),
                AppShortcutPhrase<PriceIntent>("Show me the current Bitcoin price in \(\.$fiatCurrency) via ${applicationName}"),
                AppShortcutPhrase<PriceIntent>("Retrieve Bitcoin rate in \(\.$fiatCurrency) from ${applicationName}")
            ],
            shortTitle: "Market Rate",
            systemImageName: "bitcoinsign.circle"
        )
        
    }
}
