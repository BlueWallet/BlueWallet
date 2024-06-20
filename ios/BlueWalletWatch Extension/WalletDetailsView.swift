//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 3/11/19.

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
            Image(WalletGradient(rawValue: wallet.type)?.imageString ?? "wallet")
                .resizable()
                .scaledToFit()
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
        List(wallet.transactionsArray) { transaction in
            TransactionTableRowView(transaction: transaction)
        }
    }

    private var isLightningWallet: Bool {
        wallet.type == WalletGradient.LightningCustodial.rawValue || wallet.type == WalletGradient.LightningLDK.rawValue
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
        let context = PersistenceController.preview.container.viewContext
        let mockWallet = Wallet.createMockWallet(context: context)
        
        return WalletDetailsView(wallet: mockWallet)
            .environment(\.managedObjectContext, context)
    }
}
