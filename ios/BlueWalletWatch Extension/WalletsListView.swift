import SwiftUI

struct WalletsListView: View {
    @ObservedObject var dataSource = WatchDataSource.shared

    var body: some View {
        NavigationView {
            VStack {
                if dataSource.wallets.isEmpty {
                    Text("No wallets available. Please, add one by opening BlueWallet on your iPhone.")
                        .font(.headline)
                        .padding()
                } else {
                    List {
                        ForEach(dataSource.wallets) { wallet in
                            NavigationLink(destination: WalletDetailsView(wallet: wallet)) {
                                WalletRowView(wallet: wallet)
                            }
                            .listRowBackground(
                                LinearGradient(
                                    gradient: Gradient(colors: WalletGradient.gradients(for: wallet.type)),
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                                .cornerRadius(8)
                            )
                            .listRowInsets(EdgeInsets())
                        }
                    }
                    .listStyle(PlainListStyle())
                }
            }
            .onAppear {
                dataSource.loadWallets()
            }
            .navigationTitle("Wallets")
        }
    }
}

struct WalletsListView_Previews: PreviewProvider {
    static var previews: some View {
        WalletsListView()
    }
}
