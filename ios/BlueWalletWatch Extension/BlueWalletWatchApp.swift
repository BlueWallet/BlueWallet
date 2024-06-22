import SwiftUI
import SwiftData

@main
struct BlueWalletWatchApp: App {
    var body: some Scene {
        WindowGroup {
            InterfaceControllerView()
                .modelContainer(for: [Wallet.self, WalletTransaction.self])
        }
    }
}
