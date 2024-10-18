//
//  WalletAppShortcuts.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 10/18/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//


import AppIntents

@available(iOS 16.4, *)
struct AppShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(intent: ReceiveBitcoinIntent(), 
                    phrases: ["Receive Bitcoin in \(.applicationName)"], 
                    shortTitle: "Receive Bitcoin", 
                    systemImageName: "bitcoinsign.circle")
    }
}
