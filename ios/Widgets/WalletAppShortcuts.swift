//
//  WalletAppShortcuts.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 10/27/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//

import AppIntents

@available(iOS 16.4, *)
struct WalletAppShortcuts: AppShortcutsProvider {
    
    @AppShortcutsBuilder
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: PriceIntent(),
            phrases: [
                "Market Rate through \(.applicationName)",
                "Get the current Bitcoin market rate using \(.applicationName)",
                "What's the current Bitcoin rate with \(.applicationName)?",
                "Show me the current Bitcoin price via \(.applicationName)",
                "Retrieve Bitcoin rate from \(.applicationName)",
                "Current Bitcoin price fetched by \(.applicationName)",
                "Bitcoin rate now through \(.applicationName)",
                "Tell me the Bitcoin market rate using \(.applicationName)",
                "Bitcoin price today via \(.applicationName)",
                "How much is Bitcoin worth now with \(.applicationName)?",
                "Show Bitcoin rate fetched by \(.applicationName)",
                "Get today's Bitcoin price using \(.applicationName)",
                "What's Bitcoin worth now via \(.applicationName)?",
                "Bitcoin market rate fetched by \(.applicationName)",
                "Latest Bitcoin price retrieved by \(.applicationName)",
                "Provide the current Bitcoin rate using \(.applicationName)",
                "Fetch the latest Bitcoin price through \(.applicationName)",
                "Retrieve Bitcoin market rate using \(.applicationName)",
                "Display the current Bitcoin price via \(.applicationName)",
                "Show the Bitcoin rate fetched by \(.applicationName)"
            ],
            shortTitle: "Market Rate",
            systemImageName: "bitcoinsign.circle"
        )
    }
}