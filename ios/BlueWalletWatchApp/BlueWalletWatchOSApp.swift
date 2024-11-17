// BlueWalletApp.swift

import SwiftUI

@main
struct BlueWalletApp: App {
    @StateObject private var dataSource = WatchDataSource.shared

    var body: some Scene {
        WindowGroup {
            BlueWalletView()
                .environmentObject(dataSource)
                .onAppear {
                    dataSource.startSession() // Start WCSession when the app appears
                }
        }
    }
}
