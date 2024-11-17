import SwiftUI

enum ReceiveOption: String, Identifiable {
    var id: String { self.rawValue }
    case address = "Address"
    case xpub = "XPUB"
    case paymentCode = "Payment Code"
}

extension String: Identifiable {
    public var id: String { self }
}

struct WalletDetailsView: View {
    @ObservedObject var dataSource = WatchDataSource.shared
    @State var wallet: Wallet
    @State private var showingReceiveAlert = false
    @State private var qrCodeContent: String? = nil // Optional to manage navigation

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                walletDetailsHeader.padding()
                transactionsSection
            }
        }
        .onAppear(perform: loadWalletDetails)
        .navigationTitle(wallet.label)
        .navigationBarTitleDisplayMode(.inline)
        .background(
            LinearGradient(
                gradient: Gradient(colors: WalletGradient.gradientsFor(type: wallet.type)),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .edgesIgnoringSafeArea(.all)
        )
        .sheet(item: $qrCodeContent) { content in
            ViewQRCodeView(content: content)
        }
    }

    // MARK: - Wallet Header
    private var walletDetailsHeader: some View {
        VStack(spacing: 8) {
                BalanceButton(hideBalance: wallet.hideBalance, balance: wallet.balance) {
                    // Show balance options if needed
                }
            
            
        }
    }

    // MARK: - Transactions Section
    private var transactionsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
          HStack {Text("Transactions")
              .font(.headline)
              .foregroundColor(.primary)
              .padding(.horizontal)
            QRButton {
                qrCodeContent = wallet.receiveAddress // Directly set QR content
            }
          }
            if wallet.transactions.isEmpty {
                Text("No transactions available.")
                    .font(.body)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center )
                    .background(.black.opacity(1.0))
            } else {
                VStack(spacing: 8) {
                    ForEach(wallet.transactions) { transaction in
                        TransactionListRow(transaction: transaction)
                            .padding()
                            .background(
                                RoundedRectangle(cornerRadius: 10)
                                    .fill(Color.white.opacity(0.1))
                            )
                    }
                }.background(.black.opacity(1.0))
            }
        }
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
