import SwiftUI
struct WalletRow: View {
    var wallet: Wallet

    var body: some View {
        VStack(alignment: .leading) {
            Text(wallet.label)
                .font(.headline)
            Text(wallet.balance)
                .font(.subheadline)
        }
    }
}

struct WalletRow_Previews: PreviewProvider {
    static var previews: some View {
        let mockWallet = SampleData.createSampleWallet()
        WalletRow(wallet: mockWallet)
    }
}
