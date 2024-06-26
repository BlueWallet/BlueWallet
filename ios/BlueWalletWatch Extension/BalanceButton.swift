//
//  BalanceButton.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 6/25/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//
import SwiftUI

struct BalanceButton: View {
    @Binding var hideBalance: Bool
    var balance: String
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            if hideBalance {
                Image(systemName: "eye.slash")
                    .font(.subheadline)
                    .foregroundColor(.white)
            } else {
                Text(balance)
                    .font(.subheadline)
                    .foregroundColor(.white)
            }
        }
        .simultaneousGesture(LongPressGesture().onEnded { _ in
            action()
        })
    }
}
