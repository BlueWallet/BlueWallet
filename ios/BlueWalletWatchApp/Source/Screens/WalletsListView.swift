import SwiftUI

struct WalletsListView: View {
    @EnvironmentObject var dataSource: WatchDataSource
    @State private var navigationTitle: String = "Wallets"
    @State private var transactionsSectionVisible = false
    @State private var transactionsHeaderVisible = true
    @State private var anyWalletRowVisible = false

    var body: some View {
        NavigationStack {
            if dataSource.wallets.isEmpty {
                VStack {
                    Spacer()
                    Text("No wallets available. Please, add one by opening BlueWallet on your iPhone.")
                        .multilineTextAlignment(.center)
                        .padding()
                    Spacer()
                }
                .navigationTitle("BlueWallet")
            } else {
                List {
                    ForEach(dataSource.wallets) { wallet in
                        WalletListRow(
                            wallet: wallet
                        )
                        .listRowInsets(EdgeInsets())
                    }
                    
                    if transactionsSectionVisible {
                        Section(header: transactionsHeader) {
                            ForEach(getRecentTransactions()) { transaction in
                                TransactionListRow(transaction: transaction)
                                    .frame(maxWidth: .infinity, alignment: .leading) // Full width
                                    .background(Color.black) // Black background
                                    .padding(0) // Remove padding
                            }
                        }
                    }
                }
                .listStyle(PlainListStyle()) // Use plain list style to minimize padding
                .onAppear {
                  //  dataSource.loadWallets()
                }
                .navigationTitle(navigationTitle)
                .navigationBarTitleDisplayMode(.inline)
            }
        }
    }

    private var transactionsHeader: some View {
        Text("Transactions")
            .font(.title3)
            .opacity(transactionsHeaderVisible ? 1 : 0)
            .padding(.vertical)
            .animation(.easeInOut, value: transactionsHeaderVisible)
    }

    private func getRecentTransactions() -> [Transaction] {
        let allTransactions = dataSource.wallets.flatMap { $0.transactions }
        return allTransactions.sorted(by: { $0.time > $1.time }).prefix(10).map { $0 }
    }
}

struct WalletsListView_Previews: PreviewProvider {
  let mocks = Wallet.mock
    static var previews: some View {
        WalletsListView()
            .environmentObject(WatchDataSource.shared)
    }
}
