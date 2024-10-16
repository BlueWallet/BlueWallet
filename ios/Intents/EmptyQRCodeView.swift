  //
//  EmptyQRCodeView.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 10/15/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//


import SwiftUI

struct EmptyQRCodeView: View {
    var body: some View {
        VStack {
            Text("No QR Code Available")
                .foregroundColor(.gray)
        }
        .frame(width: 200, height: 200)
        .background(Color.white)
        .cornerRadius(10)
    }
}
