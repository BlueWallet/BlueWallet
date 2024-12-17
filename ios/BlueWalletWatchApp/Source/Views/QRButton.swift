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
             Text("Receive")
                 .font(.title2)
         }
         .foregroundColor(.white)
         .background(Color.black.opacity(1.0))
         .buttonStyle(.plain)
         .cornerRadius(4)
     }
 }
