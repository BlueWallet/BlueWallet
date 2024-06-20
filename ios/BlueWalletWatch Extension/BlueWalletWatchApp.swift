//
//  BlueWalletWatchApp.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 6/20/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//

import SwiftUI

@main
struct BlueWalletWatchApp: App {
    @StateObject private var dataSource = WatchDataSource.shared

    var body: some Scene {
        WindowGroup {
            InterfaceControllerView()
                .environmentObject(dataSource)
        }
    }
}
