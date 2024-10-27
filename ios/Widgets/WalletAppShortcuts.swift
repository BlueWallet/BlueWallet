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
                "Market Rate \(.applicationName)",
                "Get the current Bitcoin market rate in \(.applicationName)"
            ],
            shortTitle: "Market Rate",
            systemImageName: "bitcoinsign.circle"
        )

  }
}
