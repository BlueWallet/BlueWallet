import SwiftUI

struct WalletListRow: View {
    let wallet: Wallet

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 5) {
                Text(wallet.label)
                    .font(.headline)
                    .foregroundColor(.white)
                
                if wallet.hideBalance {
                    Image(systemName: "eye.slash")
                        .font(.subheadline)
                        .foregroundColor(.white)
                } else {
                    Text(Balance.formatBalance(Decimal(string: wallet.balance) ?? 0, toUnit: wallet.preferredBalanceUnit))
                        .font(.subheadline)
                        .foregroundColor(.white)
                }
            }
            .padding(.leading, 16)
            .padding(.vertical, 8)
            
            Spacer()
        }
        .frame(maxWidth: .infinity, minHeight: 80)
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

struct WalletListRow_Previews: PreviewProvider {
    static var previews: some View {
        WalletListRow(wallet: Wallet(
            id: UUID(),
            label: "Legacy Wallet",
            balance: "120000000",
            type: .legacyWallet,
            chain: .onchain,
            preferredBalanceUnit: .btc,
            receiveAddress: "1BoatSLRHtKNngkdXEeobR76b53LETtpyT",
            transactions: [
                Transaction(
                    id: UUID(),
                    time: "2023-10-10 10:00",
                    memo: "Payment for services",
                    type: .received,
                    amount: "10000000"
                )
            ],
            xpub: "xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiK...",
            hideBalance: false,
            paymentCode: nil
        ))
        .previewLayout(.sizeThatFits)
    }
}
