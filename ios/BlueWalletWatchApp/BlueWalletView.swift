// Views/BlueWalletView.swift

import SwiftUI

struct BlueWalletView: View {
    @EnvironmentObject var dataSource: WatchDataSource

    var body: some View {
        NavigationStack {
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
                    LazyVStack(spacing: 16) { // Adjust spacing as needed
                        ForEach(dataSource.wallets) { wallet in
                            NavigationLink(destination: WalletDetailsView(wallet: wallet)) {
                                WalletListRow(wallet: wallet)
                            }
                            .buttonStyle(PlainButtonStyle()) // Removes default NavigationLink styling
                        }
                    }
                    .padding(.horizontal, 16) // Horizontal padding for the stack
                    .padding(.vertical, 8) // Vertical padding for the stack
                }
                .navigationTitle("BlueWallet")
                .navigationBarTitleDisplayMode(.inline)
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
