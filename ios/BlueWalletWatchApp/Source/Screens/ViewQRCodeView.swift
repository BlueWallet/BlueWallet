// ViewQRCodeView.swift

import SwiftUI

struct ViewQRCodeView: View {
    var wallet: Wallet
  private let qrCodeGenerator = QRCodeGenerator() // Initialize the QRCode generator
    
    var body: some View {
        VStack {
            // Generate and display the QR code with embedded logo
            qrCodeGenerator.generateQRCode(from: wallet.receiveAddress)
                .interpolation(.none) // Ensure crisp QR code
                .resizable()
                .scaledToFit()
                .frame(width: 256, height: 256) // Adjust size as needed
                .padding()
            
            // Display the receive address
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
