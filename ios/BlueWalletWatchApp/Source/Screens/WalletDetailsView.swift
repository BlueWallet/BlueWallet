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
              gradient: Gradient(colors: WalletGradient.gradientsFor(type: wallet.type)),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .edgesIgnoringSafeArea(.all)
        )
        .background(
            NavigationLink(
              destination: ViewQRCodeView(wallet: wallet),
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
                  navigationTag = wallet.xpub
                }
            }
            if isPaymentCodeAvailable {
                Button("Payment Code") {
                    navigationTag = wallet.paymentCode ?? ""
                }
            }
            Button("Cancel", role: .cancel) { }
        })
        .confirmationDialog("Balance Options", isPresented: $showingBalanceOptions, actions: {
            Button(wallet.hideBalance ? "Show Balance" : "Hide Balance") {
                toggleBalanceVisibility()
            }
            
            Button("Cancel", role: .cancel) { }
        })
    }

    private var walletDetailsHeader: some View {
        VStack {
            HStack {
              BalanceButton(hideBalance: wallet.hideBalance, balance: wallet.balance) {
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
          TransactionListRow(transaction: transaction)
                .padding(.horizontal)
                .padding(.vertical, 4)
        }
        .listStyle(PlainListStyle())
        .background(Color.black.opacity(0.8))
    }

    private var isLightningWallet: Bool {
      wallet.type == .lightningCustodianWallet
    }

    private var isXPubAvailable: Bool {
      !(wallet.xpub.isEmpty) && !isLightningWallet
    }

    private var isPaymentCodeAvailable: Bool {
        !(wallet.paymentCode?.isEmpty ?? true)
    }

    private func loadWalletDetails() {
        if let updatedWallet = dataSource.wallets.first(where: { $0.id == wallet.id }) {
            wallet = updatedWallet
        }
    }

  private func toggleBalanceVisibility() {
//        wallet.hideBalance.toggle()
//        WatchDataSource.shared.saveWalletChanges()
    }
}

extension Optional where Wrapped == String {
    var isNilOrEmpty: Bool {
        self?.isEmpty ?? true
    }
}
