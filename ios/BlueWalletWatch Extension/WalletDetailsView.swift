import SwiftUI

struct WalletDetailsView: View {
    @ObservedObject var dataSource = WatchDataSource.shared
    @State var wallet: Wallet

    var body: some View {
        VStack {
            walletDetailsHeader
            transactionsList
        }
        .onAppear(perform: loadWalletDetails)
        .navigationTitle(wallet.label)
    }

    private var walletDetailsHeader: some View {
        VStack {
            Text(wallet.label)
                .font(.headline)
            Text(wallet.hideBalance ? "" : wallet.balance)
                .font(.subheadline)
            LinearGradient(gradient: Gradient(colors: WalletGradient.gradients(for: wallet.type)), startPoint: .top, endPoint: .bottom)
                .mask(
                    Image(systemName: "wallet.pass")
                        .resizable()
                        .scaledToFit()
                )
                .frame(height: 50)
            HStack {
                if isLightningWallet {
                    Button("Create Invoice", action: createInvoice)
                        .padding()
                }
                if !wallet.receiveAddress.isEmpty {
                    Button("Receive", action: receive)
                        .padding()
                }
                if isXPubAvailable {
                    Button("View XPUB", action: viewXPub)
                        .padding()
                }
            }
        }
    }

    private var transactionsList: some View {
      List(wallet.transactions) { transaction in
            TransactionTableRowView(transaction: transaction)
        }
    }

    private var isLightningWallet: Bool {
        wallet.type == WalletType.LightningCustodial || wallet.type == WalletType.LightningLDK
    }

    private var isXPubAvailable: Bool {
        !(wallet.xpub?.isEmpty ?? true) && !isLightningWallet
    }

    private func loadWalletDetails() {
        if let updatedWallet = dataSource.wallets.first(where: { $0.id == wallet.id }) {
            wallet = updatedWallet
        }
    }

    private func createInvoice() {
        if dataSource.companionWalletsInitialized {
            // Navigate to create invoice view
        } else {
            // Show error
            presentAlert(title: "Error", message: "Unable to create invoice. Please open BlueWallet on your iPhone and unlock your wallets.")
        }
    }

    private func receive() {
        // Navigate to receive view
    }

    private func viewXPub() {
        // Navigate to view XPUB
    }

    private func presentAlert(title: String, message: String) {
        // Present an alert
    }
}

extension Optional where Wrapped == String {
    var isNilOrEmpty: Bool {
        self?.isEmpty ?? true
    }
}

struct WalletDetailsView_Previews: PreviewProvider {
    static var previews: some View {
        WalletDetailsView(wallet: SampleData.createSampleWallet())
    }
}
