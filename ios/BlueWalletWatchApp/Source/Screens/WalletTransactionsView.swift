import SwiftUI

enum ReceiveOption: String, Identifiable {
    var id: String { self.rawValue }
    case address = "Address"
    case xpub = "XPUB"
    case paymentCode = "Payment Code"
}

// Option 1: Create a specific type
struct WalletIdentifier: Identifiable {
    let value: String
    var id: String { value }
}

// Option 2: Create a private extension
private extension String {
    var asID: String { self }
}

// Add the new struct
struct QRCodeContent: Identifiable {
    let id = UUID()
    let content: String
}

struct WalletTransactionsView: View {
    @ObservedObject var dataSource = WatchDataSource.shared
    @State var wallet: Wallet
    @State private var showingReceiveAlert = false
    @State private var qrCodeContent: QRCodeContent? = nil
    var body: some View {
      transactionsSection
        .listStyle(.automatic)
        .onAppear(perform: loadWalletDetails)
        .navigationTitle(wallet.label)
        .navigationBarTitleDisplayMode(.automatic)
        .toolbar {
            ToolbarItem(placement: .automatic) {
                QRButton {
                      qrCodeContent = QRCodeContent(content: wallet.receiveAddress)
                    
                }
            }
        }
        .sheet(item: $qrCodeContent) { qrCode in
            ViewQRCodeView(content: qrCode.content)
        }
    }

    // MARK: - Wallet Header
    private var walletDetailsHeader: some View {
        VStack(spacing: 8) {
                BalanceButton(hideBalance: wallet.hideBalance, balance: wallet.balance) {
                }
        }
    }

    // MARK: - Transactions Section
    private var transactionsSection: some View {
        List {
            Section(header:
                Text("Transactions")
                    .font(.headline)
                    .foregroundColor(.primary)
            ) {
                if wallet.transactions.isEmpty {
                    Text("No transactions available.")
                        .font(.body)
                        .foregroundColor(.secondary)
                        .frame(maxWidth: .infinity, alignment: .center)
                } else {
                    ForEach(wallet.transactions) { transaction in
                        TransactionListRow(transaction: transaction)
                    }
                }
            }
        }
        .listStyle(.plain)
    }

    // MARK: - Helper Methods
    private var isXPubAvailable: Bool {
        !(wallet.xpub.isEmpty) && wallet.type != .lightningCustodianWallet
    }

    private var isPaymentCodeAvailable: Bool {
        !(wallet.paymentCode?.isEmpty ?? true)
    }

    private func loadWalletDetails() {
        if let updatedWallet = dataSource.wallets.first(where: { $0.id == wallet.id }) {
            wallet = updatedWallet
        }
    }
}

struct WalletTransactionsView_Previews: PreviewProvider {
    static var previews: some View {
      WalletTransactionsView(wallet: Wallet.mock)
    }
}
