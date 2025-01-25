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
                AppShortcutPhrase<PriceIntent>("Market rate for Bitcoin in \(\.$fiatCurrency) using BlueWallet"),
                AppShortcutPhrase<PriceIntent>("Get the current Bitcoin market rate in \(\.$fiatCurrency) with BlueWallet"),
                AppShortcutPhrase<PriceIntent>("What's the current Bitcoin rate in \(\.$fiatCurrency) using BlueWallet?"),
                AppShortcutPhrase<PriceIntent>("Show me the current Bitcoin price in \(\.$fiatCurrency) via BlueWallet"),
                AppShortcutPhrase<PriceIntent>("Retrieve Bitcoin rate in \(\.$fiatCurrency) from BlueWallet")
            ],
            shortTitle: "Market Rate",
            systemImageName: "bitcoinsign.circle"
        )
        
    }
}
