//
//  WalletRow.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 6/19/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//

import Foundation

import SwiftUI

struct WalletRow: View {
    var wallet: Wallet

    var body: some View {
        HStack {
            VStack(alignment: .leading) {
                Text(wallet.label)
                    .font(.headline)
                Text(wallet.hideBalance ? "" : wallet.balance)
                    .font(.subheadline)
            }
            Spacer()
            Image(walletGradient(for: wallet.type).imageString)
                .resizable()
                .scaledToFit()
                .frame(height: 50)
        }
        .padding()
    }

    private func walletGradient(for type: String) -> WalletGradient {
        return WalletGradient(rawValue: type) ?? .SegwitHD
    }
}

struct WalletRow_Previews: PreviewProvider {
    static var previews: some View {
        let context = PersistenceController.preview.container.viewContext
        let mockWallet = Wallet.createMockWallet(context: context)
        
        return WalletRow(wallet: mockWallet)
            .environment(\.managedObjectContext, context)
    }
}
