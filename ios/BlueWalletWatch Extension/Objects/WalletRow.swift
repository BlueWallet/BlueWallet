import SwiftUI

struct WalletRow: View {
    var wallet: Wallet

    var body: some View {
        HStack {
            VStack(alignment: .leading) {
                Text(wallet.label)
                    .font(.headline)
                Text(wallet.hideBalance ? "" : wallet.balance)
                    .font(.subheadline)
            }
            Spacer()
            Image(systemName: "wallet.pass")
                .resizable()
                .scaledToFit()
                .frame(height: 50)
        }
        .padding()
    }
}

struct WalletRow_Previews: PreviewProvider {
    static var previews: some View {
        let mockWallet = Wallet(
            id: UUID(),
            label: "Sample Wallet",
            balance: "$1000",
            type: "HDsegwitP2SH",
            preferredBalanceUnit: "BTC",
            receiveAddress: "address",
            hideBalance: false
        )
        
        return WalletRow(wallet: mockWallet)
    }
}
