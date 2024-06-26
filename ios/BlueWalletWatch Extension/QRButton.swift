//
//  QRButton.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 6/25/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//

import Foundation
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
        .background(Color.black.opacity(0.5))
        .clipShape(Circle())
    }
} 
