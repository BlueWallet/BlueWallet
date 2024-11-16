// BlueWalletWatchOSApp.swift

import SwiftUI

@main
struct BlueWalletWatchOSApp: App {
    @StateObject var dataSource = WatchDataSource.shared
    @Environment(\.scenePhase) var scenePhase

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(dataSource)
                .onAppear {
                    dataSource.startSession() // Initiate session activation
                }
                .onChange(of: scenePhase) { newPhase in
                    switch newPhase {
                    case .active:
                        dataSource.startSession() // Ensure session is active when app becomes active
                    case .inactive:
                        // Handle inactive state if necessary
                        break
                    case .background:
                        // Handle background state if necessary
                        break
                    @unknown default:
                        break
                    }
                }
        }
    }
}
