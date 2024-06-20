//
//  WalletInformation.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 3/10/19.

//
import SwiftUI

struct WalletInformationView: View {
    var wallet: Wallet

    var body: some View {
        VStack(alignment: .leading) {
            Text(wallet.label)
                .font(.headline)
            Text(wallet.hideBalance ? "" : wallet.balance)
                .font(.subheadline)
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

struct WalletInformationView_Previews: PreviewProvider {
    static var previews: some View {
        WalletInformationView(wallet: Wallet(context: PersistenceController.preview.container.viewContext))
    }
}
