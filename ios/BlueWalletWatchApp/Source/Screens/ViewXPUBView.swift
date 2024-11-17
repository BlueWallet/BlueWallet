//
//  ViewXPUBView.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 11/16/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//


// Views/ViewXPUBView.swift

import SwiftUI

struct ViewXPUBView: View {
    var wallet: Wallet
    @State private var xpub: String = ""
    
    var body: some View {
        VStack {
            Text("XPUB")
                .font(.headline)
                .padding(.top)
            ScrollView {
                Text(xpub)
                    .font(.body)
                    .padding()
            }
            Spacer()
        }
        .navigationTitle("View XPUB")
        .padding()
        .onAppear {
            self.xpub = wallet.xpub
        }
    }
}

struct ViewXPUBView_Previews: PreviewProvider {
    static var previews: some View {
        ViewXPUBView(wallet: Wallet(
            label: "My Wallet",
            balance: "0.5 BTC",
            type: .legacyWallet,
            chain: .onchain,
            preferredBalanceUnit: .btc,
            receiveAddress: "1BoatSLRHtKNngkdXEeobR76b53LETtpyT",
            transactions: [],
            xpub: "xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiK...",
            hideBalance: false,
            paymentCode: "lntb1u1p0..."
        ))
    }
}
