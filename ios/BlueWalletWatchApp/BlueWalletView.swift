import SwiftUI

struct BlueWalletView: View {
    @EnvironmentObject var dataSource: WatchDataSource
    @State private var qrContent: String? = nil

    var body: some View {
        if dataSource.wallets.isEmpty {
            VStack {
                Spacer()
                Text("No wallets available. Please, add one by opening BlueWallet on your iPhone.")
                    .multilineTextAlignment(.center)
                    .padding()
                    .transition(.opacity)
                Spacer()
            }
            .navigationTitle("BlueWallet")
        } else {
            ScrollView {
                LazyVStack(spacing: 16) {
                    ForEach(dataSource.wallets) { wallet in
                        VStack(alignment: .leading, spacing: 8) {
                            NavigationLink(destination: WalletDetailsView(wallet: wallet)) {
                                WalletListRow(wallet: wallet)
                            }
                            .buttonStyle(PlainButtonStyle())
                
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
            .navigationTitle("BlueWallet")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(item: $qrContent) { content in
                ViewQRCodeView(content: content)
            }
        }
    }
}

struct BlueWalletView_Previews: PreviewProvider {
    static var previews: some View {
        BlueWalletView()
            .environmentObject(WatchDataSource.shared)
    }
}
