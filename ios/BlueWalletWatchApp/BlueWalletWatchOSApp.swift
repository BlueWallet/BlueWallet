// BlueWalletApp.swift

import SwiftUI

@main
struct BlueWalletApp: App {
    @StateObject private var dataSource = WatchDataSource.shared
    @State private var qrContent: String? = nil // Add this state to manage QR code navigation

    var body: some Scene {
        WindowGroup {
            NavigationStack {
                BlueWalletView()
                    .environmentObject(dataSource)
                    .onAppear {
                        dataSource.startSession() // Start WCSession when the app appears
                    }
            }
        }
    }
}
