import SwiftUI

struct WalletDetailsView: View {
    @ObservedObject var dataSource = WatchDataSource.shared
    @State var wallet: Wallet
    @State private var showingActionSheet = false
    @State private var navigationTag: String?

    var body: some View {
            VStack {
                walletDetailsHeader
                transactionsList
            }
            .onAppear(perform: loadWalletDetails)
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Text(wallet.label)
                        .font(.headline)
                        .lineLimit(1)
                        .truncationMode(.tail)
                        .accessibilityAddTraits(.isHeader)
                        .foregroundColor(.white)
                }
            }
            .toolbarBackground(
                LinearGradient(
                  gradient: Gradient(colors: WalletGradient.gradients(for: wallet.type)),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ),
                for: .navigationBar
            )
            .toolbarBackground(.visible, for: .navigationBar)
            .navigationDestination(isPresented: Binding(
                get: { navigationTag != nil },
                set: { _ in navigationTag = nil }
            )) {
                if let tag = navigationTag {
                    QRCodeView(address: tag, title: navigationTag == wallet.receiveAddress ? "Address" : "XPUB")
                }
            }
            .confirmationDialog("Receive", isPresented: $showingActionSheet, actions: {
                if isXPubAvailable {
                    Button("XPUB") {
                        navigationTag = wallet.xpub ?? ""
                    }
                }
                Button("Address") {
                    navigationTag = wallet.receiveAddress
                }
                if isLightningWallet {
                    Button("Create Invoice") {
                        createInvoice()
                    }
                }
                Button("Cancel", role: .cancel) { }
            })
        
    }

    private var walletDetailsHeader: some View {
        VStack {
            HStack {
                Text(wallet.hideBalance ? "" : wallet.balance)
                    .font(.subheadline)
                    .foregroundColor(.white)
                Spacer()
                Button(action: {
                    showingActionSheet = true
                }) {
                    Image(systemName: "qrcode")
                        .font(.title2)
                }
                .foregroundColor(.white)
                .frame(width: 28, height: 28)
                .background(Color.black.opacity(0.5))
                .clipShape(Circle())
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
        }
        .background(
            LinearGradient(
                gradient: Gradient(colors: WalletGradient.gradients(for: wallet.type)),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
    }

    private var transactionsList: some View {
        List(wallet.transactions) { transaction in
            TransactionTableRowView(transaction: transaction)
                .padding(.horizontal)
                .padding(.vertical, 4)
        }
        .listStyle(PlainListStyle())
    }

    private var isLightningWallet: Bool {
        wallet.type == .LightningCustodial || wallet.type == .LightningLDK
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
//            presentAlert(title: "Error", message: "Unable to create invoice. Please open BlueWallet on your iPhone and unlock your wallets.")
        }
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
