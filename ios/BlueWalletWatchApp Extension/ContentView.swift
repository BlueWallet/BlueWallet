//
//  ContentView.swift
//  BlueWalletWatchApp Extension
//
//  Created by Marcos Rodriguez on 11/6/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//

import SwiftUI

struct ContentView: View {
    var body: some View {
      List{
        ForEach (WatchDataSource.shared.wallets, id:\.self) { wallet in
          WalletInformationView(wallet: wallet).listRowBackground(Image(WalletGradient(rawValue: wallet.type)?.imageString ?? WalletGradient.Segwit.imageString).resizable())
            }
    }
  
    }}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
