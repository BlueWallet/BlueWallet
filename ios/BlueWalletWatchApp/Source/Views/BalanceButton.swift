 //
 //  BalanceButton.swift
 //
 //  Created by Marcos Rodriguez on 6/25/24.
 //  Copyright © 2024 BlueWallet. All rights reserved.
 //
 import SwiftUI

 struct BalanceButton: View {
     var hideBalance: Bool
   var balance: Decimal
     var action: () -> Void

     var body: some View {
             if hideBalance {
                 Image(systemName: "eye.slash")
                     .font(.subheadline)
                     .foregroundColor(.white)
             } else {
               Text(balance.description)
                 .font(.subheadline)
                     .foregroundColor(.white)
             
         }
     }
 }
