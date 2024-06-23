import SwiftUI
import SwiftData

@main
struct BlueWalletWatchApp: App {
    @StateObject private var dataSource = WatchDataSource.shared

    var body: some Scene {
        WindowGroup {
          WalletsListView()
                .environmentObject(dataSource)
                .modelContainer(for: [Wallet.self, WalletTransaction.self])
                .onAppear {
                    dataSource.initializeSampleData()
                }
        }
    }
}
