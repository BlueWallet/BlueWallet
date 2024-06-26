import SwiftUI

struct WalletDetailsView: View {
    @ObservedObject var dataSource = WatchDataSource.shared
    @State var wallet: Wallet
    @State private var showingReceiveOptions = false
    @State private var showingBalanceOptions = false
    @State private var navigationTag: String?
  
    var body: some View {
        VStack {
            walletDetailsHeader
            transactionsList
        }
        .onAppear(perform: loadWalletDetails)
        .navigationTitle(wallet.label)
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
        .background(
            LinearGradient(
                gradient: Gradient(colors: WalletGradient.gradients(for: wallet.type)),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .edgesIgnoringSafeArea(.all)
        )
        .background(
            NavigationLink(
                destination: QRCodeView(address: navigationTag ?? "", title: navigationTag == wallet.receiveAddress ? "Address" : "XPUB"),
                isActive: Binding(
                    get: { navigationTag != nil },
                    set: { _ in navigationTag = nil }
                )
            ) {
                EmptyView()
            }
        )
        .confirmationDialog("Receive", isPresented: $showingReceiveOptions, actions: {
            Button("Address") {
                navigationTag = wallet.receiveAddress
            }
            if isXPubAvailable {
                Button("XPUB") {
                    navigationTag = wallet.xpub ?? ""
                }
            }
            if isPaymentCodeAvailable {
                Button("Payment Code") {
                    navigationTag = wallet.paymentCode ?? ""
                }
            }
            if isLightningWallet {
                Button("Create Invoice") {
                    createInvoice()
                }
            }
            Button("Cancel", role: .cancel) { }
        })
        .confirmationDialog("Balance Options", isPresented: $showingBalanceOptions, actions: {
            Button(wallet.hideBalance ? "Show Balance" : "Hide Balance") {
                toggleBalanceVisibility()
            }
            ForEach(BitcoinUnit.allCases.filter { $0 != wallet.preferredBalanceUnit && $0 != .MAX }, id: \.self) { unit in
                Button("Show Balance in \(displayName(for: unit))") {
                    wallet.preferredBalanceUnit = unit
                    WatchDataSource.shared.saveWalletChanges()
                }
            }
            Button("Cancel", role: .cancel) { }
        })
    }

    private var walletDetailsHeader: some View {
        VStack {
            HStack {
                BalanceButton(hideBalance: $wallet.hideBalance, balance: wallet.balanceInLocalCurrency) {
                    showingBalanceOptions = true
                }
                Spacer()
                QRButton {
                    showingReceiveOptions = true
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
        }
    }

    private var transactionsList: some View {
        List(wallet.transactions) { transaction in
            TransactionTableRowView(transaction: transaction)
                .padding(.horizontal)
                .padding(.vertical, 4)
        }
        .listStyle(PlainListStyle())
        .background(Color.black.opacity(0.8))
    }

    private var isLightningWallet: Bool {
        wallet.type == .LightningCustodial || wallet.type == .LightningLDK
    }

    private var isXPubAvailable: Bool {
        !(wallet.xpub?.isEmpty ?? true) && !isLightningWallet
    }

    private var isPaymentCodeAvailable: Bool {
        !(wallet.paymentCode?.isEmpty ?? true)
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
            // presentAlert(title: "Error", message: "Unable to create invoice. Please open BlueWallet on your iPhone and unlock your wallets.")
        }
    }

    private func toggleBalanceVisibility() {
        wallet.hideBalance.toggle()
        WatchDataSource.shared.saveWalletChanges()
    }

    private func displayName(for unit: BitcoinUnit) -> String {
        switch unit {
        case .BTC:
            return "BTC"
        case .SATS:
            return "sats"
        case .LOCAL_CURRENCY:
            return "Local Currency"
        default:
            return unit.rawValue
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
