import SwiftUI

struct WalletDetailsView: View {
    @ObservedObject var dataSource = WatchDataSource.shared
    @State var wallet: Wallet
    @State private var showingActionSheet = false
    @State private var navigationTag: String?

    var body: some View {
        NavigationStack {
            VStack {
                walletDetailsHeader
                transactionsList
            }
            .onAppear(perform: loadWalletDetails)
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
              ToolbarItem(placement: .topBarTrailing) {
                              Text(wallet.label)
                                  .font(.headline)
                                  .lineLimit(1)
                                  .truncationMode(.tail)
                                  .accessibilityAddTraits(.isHeader)
                          }
               
            }
          
            .navigationDestination(isPresented: Binding(
                get: { navigationTag != nil },
                set: { _ in navigationTag = nil }
            )) {
                QRCodeView(address: navigationTag ?? "")
            }
        }
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
                        .font(.title2) // Make the icon smaller
                }
                .foregroundColor(.white)
                .frame(width: 28, height: 28)
                .background(Color.black.opacity(0.5))
                .clipShape(Circle())
                .actionSheet(isPresented: $showingActionSheet) {
                    var buttons: [ActionSheet.Button] = [
                        .default(Text("Address")) {
                            navigationTag = wallet.receiveAddress
                        },
                        .default(Text("XPUB")) {
                            navigationTag = wallet.xpub ?? ""
                        }
                    ]
                    if isLightningWallet {
                        buttons.append(.default(Text("Create Invoice")) {
                            createInvoice()
                        })
                    }
                    buttons.append(.cancel())

                    return ActionSheet(
                        title: Text("Receive"),
                        message: Text("Select an option"),
                        buttons: buttons
                    )
                }
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
