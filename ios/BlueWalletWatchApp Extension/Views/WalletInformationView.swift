//
//  WalletInformationView.swift
//  BlueWalletWatchApp Extension
//
//  Created by Marcos Rodriguez on 11/6/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//

import SwiftUI

struct WalletInformationView: View {
  var wallet: Wallet
  static let identifier: String = "WalletInformation"
  
    var body: some View {
      VStack(alignment: .leading, spacing: 2, content: {
        Text(wallet.label).font(.headline)
        Text(wallet.balance).font(.body)
      }).padding()
    }
}

struct WalletInformationView_Previews: PreviewProvider {
    static var previews: some View {
      WalletInformationView(wallet: Wallet(label: "Label", balance: "1000", type: WalletGradient.SegwitHD.rawValue, preferredBalanceUnit: "BTC", receiveAddress: "1111111", transactions: [], identifier: 0, xpub: nil))
    }
}
