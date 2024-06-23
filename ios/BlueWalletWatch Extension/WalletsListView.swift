import SwiftUI

struct WalletsListView: View {
    @ObservedObject var dataSource = WatchDataSource.shared
    @State private var navigationTitle: String = "Wallets"
    @State private var transactionsSectionVisible = false
    @State private var transactionsHeaderVisible = true
    @State private var anyWalletRowVisible = false

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
                                let frame = geo.frame(in: .global)
                                DispatchQueue.main.async {
                                    let threshold: CGFloat = 100
                                    if frame.minY > threshold && frame.minY < frame.maxY {
                                        anyWalletRowVisible = true
                                    } else if frame.maxY < threshold {
                                        anyWalletRowVisible = false
                                    }
                                    if anyWalletRowVisible {
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
                                    let frame = geo.frame(in: .global)
                                    DispatchQueue.main.async {
                                        let threshold: CGFloat = 100
                                        if frame.minY < threshold && frame.minY < frame.maxY {
                                            withAnimation {
                                                navigationTitle = "Transactions"
                                                transactionsSectionVisible = true
                                                transactionsHeaderVisible = false
                                            }
                                        } else if transactionsSectionVisible && frame.minY > threshold {
                                            withAnimation {
                                                transactionsSectionVisible = false
                                                if anyWalletRowVisible {
                                                    navigationTitle = "Wallets"
                                                    transactionsHeaderVisible = true
                                                }
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
