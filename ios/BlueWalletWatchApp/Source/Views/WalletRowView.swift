// Views/WalletRowView.swift

import SwiftUI

/// A SwiftUI view representing a single wallet row with a gradient background.
struct WalletRowView: View {
    let wallet: Wallet

    var body: some View {
        HStack {
            // Wallet Icon (Replace with your actual icon)
            // Wallet Information
            VStack(alignment: .leading, spacing: 5) {
                Text(wallet.label)
                    .font(.headline)
                    .foregroundColor(.white)
                Text("\(wallet.balance) \(wallet.preferredBalanceUnit)")
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.8))
            }

            Spacer()
        }
        .padding()
        .background(
            LinearGradient(
                gradient: Gradient(colors: WalletGradient.gradientsFor(type: wallet.type)),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .cornerRadius(10)
        )
        .shadow(color: Color.black.opacity(0.2), radius: 5, x: 0, y: 2)
    }
}

struct WalletRowView_Previews: PreviewProvider {
    static var previews: some View {
        WalletRowView(wallet: Wallet(
            id: UUID(),
            label: "Legacy Wallet",
            balance: "1.2 BTC",
            type: .legacyWallet,
            preferredBalanceUnit: "BTC",
            receiveAddress: "1BoatSLRHtKNngkdXEeobR76b53LETtpyT",
            transactions: [
                Transaction(
                    id: UUID(),
                    time: "2023-10-10 10:00",
                    memo: "Payment for services",
                    type: .received,
                    amount: "0.1 BTC"
                )
            ],
            xpub: "xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiK...",
            hideBalance: false,
            paymentCode: nil
        ))
        .previewLayout(.sizeThatFits)
    }
}
