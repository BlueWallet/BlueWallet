import SwiftUI
import os.log

@main
struct BlueWalletApp: App {
    @StateObject private var dataSource = WatchDataSource.shared
    @State private var qrContent: String? = nil
    var body: some Scene {
        WindowGroup {
            NavigationStack {
                BlueWalletView()
                    .environmentObject(dataSource)
                    .onAppear {
                        dataSource.startSession()
                    }
            }
        }
    }
}
