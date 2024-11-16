//
//  ViewQRCodeView.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 11/16/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//


// Views/ViewQRCodeView.swift

import SwiftUI

struct ViewQRCodeView: View {
    var wallet: Wallet
    
    var body: some View {
        VStack {
            Image("textfor")
                .resizable()
                .frame(width: 128, height: 128)
                .padding()
            Text(wallet.receiveAddress)
                .font(.headline)
                .multilineTextAlignment(.center)
                .padding(.bottom)
            Spacer()
        }
        .navigationTitle("QR Code")
    }
}

struct ViewQRCodeView_Previews: PreviewProvider {
    static var previews: some View {
        ViewQRCodeView(wallet: Wallet(
            label: "My Wallet",
            balance: "0.5 BTC",
            type: .legacyWallet,
            preferredBalanceUnit: "BTC",
            receiveAddress: "1BoatSLRHtKNngkdXEeobR76b53LETtpyT",
            transactions: [],
            xpub: "xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiK...",
            hideBalance: false,
            paymentCode: "lntb1u1p0..."
        ))
    }
}
