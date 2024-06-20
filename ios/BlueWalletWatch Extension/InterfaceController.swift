//
//  InterfaceController.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 3/6/19.
//

import SwiftUI

struct InterfaceControllerView: View {
    @ObservedObject var dataSource = WatchDataSource.shared

    var body: some View {
        NavigationView {
            VStack {
                if dataSource.wallets.isEmpty {
                    Text("No wallets available. Please, add one by opening BlueWallet on your iPhone.")
                        .font(.headline)
                        .padding()
                } else {
                    List(dataSource.wallets) { wallet in
                        NavigationLink(destination: WalletDetailsView(wallet: wallet)) {
                            WalletRow(wallet: wallet)
                        }
                    }
                }
            }
            .onAppear {
                dataSource.loadWallets()
            }
            .navigationTitle("Wallets")
        }
    }
}

struct InterfaceControllerView_Previews: PreviewProvider {
    static var previews: some View {
        InterfaceControllerView()
    }
}
