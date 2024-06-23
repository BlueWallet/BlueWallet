import SwiftUI

struct WalletRowView: View {
    var wallet: Wallet

    var body: some View {
        VStack(alignment: .leading) {
            Text(wallet.label)
            .font(.headline).padding(.horizontal)
            Text(wallet.hideBalance ? "" : wallet.balance)
            .font(.subheadline).padding(.horizontal)
        }
        .padding()
    }
}

struct WalletRowView_Previews: PreviewProvider {
    static var previews: some View {
        let mockWallet = Wallet(
            id: UUID(),
            label: "Sample Wallet",
            balance: "$1000",
            type: .SegwitHD,
            preferredBalanceUnit: "BTC",
            receiveAddress: "address",
            xpub: "1123",
            hideBalance: false,
            paymentCode: nil
        )
        return WalletRowView(wallet: mockWallet)
            .previewLayout(.sizeThatFits)
            .padding()
    }
}
