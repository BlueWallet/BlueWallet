//
//  BlueWalletView.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 11/16/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//


// Views/BlueWalletView.swift

import SwiftUI

struct BlueWalletView: View {
    @EnvironmentObject var dataSource: WatchDataSource
    
    var body: some View { 
        NavigationStack {
            VStack {
                if dataSource.wallets.isEmpty {
                    Text("No wallets available. Please, add one by opening BlueWallet on your iPhone.")
                        .multilineTextAlignment(.center)
                        .padding()
                        .transition(.opacity)
                        .onAppear {
                            // Optionally animate the appearance
                        }
                } else {
                    List {
                        ForEach(dataSource.wallets) { wallet in
                            NavigationLink(destination: WalletDetailsView(wallet: wallet)) {
                                WalletRowView(wallet: wallet)
                            }
                        }
                    }
                }
            }
            .navigationTitle("BlueWallet")
        }
    }
}

struct BlueWalletView_Previews: PreviewProvider {
    static var previews: some View {
        BlueWalletView()
            .environmentObject(WatchDataSource.shared)
    }
}
