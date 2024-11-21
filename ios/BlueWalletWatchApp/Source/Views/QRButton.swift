//
//  QRButton.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 11/16/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//


 import SwiftUI

 struct QRButton: View {
     var action: () -> Void

     var body: some View {
         Button(action: action) {
             Image(systemName: "qrcode")
                 .font(.title2)
         }
         .foregroundColor(.white)
         .frame(width: 28, height: 28)
         .background(Color.black.opacity(1.0))
         .buttonStyle(.plain)
         .cornerRadius(4)
     }
 }
