import SwiftUI

struct WalletsListView: View {
    @ObservedObject var dataSource = WatchDataSource.shared
    @State private var navigationTitle: String = "Wallets"
    @State private var transactionsSectionVisible = false
    @State private var transactionsHeaderVisible = true

    var body: some View {
        NavigationView {
            ScrollViewReader { proxy in
                List {
                    Section(header: EmptyView()) {
                        ForEach(dataSource.wallets) { wallet in
                            NavigationLink(destination: WalletDetailsView(wallet: wallet)) {
                                WalletRowView(wallet: wallet)
                            }
                            .listRowBackground(
                                LinearGradient(
                                    gradient: Gradient(colors: WalletGradient.gradients(for: wallet.type)),
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                                .cornerRadius(8)
                            )
                            .listRowInsets(EdgeInsets())
                            .background(GeometryReader { geo -> Color in
                                let minY = geo.frame(in: .global).minY
                                DispatchQueue.main.async {
                                    if minY < 100 && navigationTitle != "Transactions" {
                                        withAnimation {
                                            navigationTitle = "Wallets"
                                            transactionsHeaderVisible = true
                                        }
                                    }
                                }
                                return Color.clear
                            })
                        }
                    }
                    
                    Section(header: transactionsHeader) {
                        ForEach(getRecentTransactions(), id: \.id) { transaction in
                            TransactionTableRowView(transaction: transaction)
                                .padding(.horizontal)
                                .padding(.vertical, 4)
                                .background(GeometryReader { geo -> Color in
                                    let minY = geo.frame(in: .global).minY
                                    DispatchQueue.main.async {
                                        if minY < 100 {
                                            withAnimation {
                                                navigationTitle = "Transactions"
                                                transactionsSectionVisible = true
                                                transactionsHeaderVisible = false
                                            }
                                        } else if transactionsSectionVisible {
                                            withAnimation {
                                                transactionsSectionVisible = false
                                                navigationTitle = "Wallets"
                                                transactionsHeaderVisible = true
                                            }
                                        }
                                    }
                                    return Color.clear
                                })
                        }
                    }
                }
                .listStyle(PlainListStyle())
                .onAppear {
                    dataSource.loadWallets()
                }
                .navigationTitle(navigationTitle)
                .navigationBarTitleDisplayMode(.automatic)
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

    private func getRecentTransactions() -> [WalletTransaction] {
        let allTransactions = dataSource.wallets.flatMap { $0.transactions }
        return allTransactions.sorted(by: { $0.time > $1.time }).prefix(10).map { $0 }
    }
}

struct WalletsListView_Previews: PreviewProvider {
    static var previews: some View {
        WalletsListView()
    }
}
