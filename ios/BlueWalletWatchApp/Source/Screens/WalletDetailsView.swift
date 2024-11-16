//
//  WalletDetailsView.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 11/16/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//


// Views/WalletDetailsView.swift

import SwiftUI

struct WalletDetailsView: View {
    @EnvironmentObject var dataSource: WatchDataSource
    @State var wallet: Wallet
    @State private var showReceive = false
    @State private var showViewXPUB = false
    @State private var showCreateInvoice = false
    @State private var showNoTransactionsLabel: Bool = false
    @State private var isBalanceVisible: Bool = true
    @State private var transactions: [Transaction] = []
    
    var body: some View {
        VStack {
            // Wallet Information
            HStack {
                Image("walletHD")
                    .resizable()
                    .frame(width: 50, height: 50)
                    .cornerRadius(8)
                VStack(alignment: .leading) {
                    if isBalanceVisible {
                        Text("Balance: \(wallet.balance)")
                            .font(.headline)
                    } else {
                        Text("Balance: *****")
                            .font(.headline)
                    }
                    Text(wallet.label)
                }
                Spacer()
            }
            .onTapGesture {
                withAnimation {
                    isBalanceVisible.toggle()
                }
            }
            .padding()
            
            // Action Buttons
            HStack(spacing: 10) {
                NavigationLink(destination: ReceiveView(wallet: wallet)) {
                    Text("Receive")
                        .foregroundColor(.white)
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color(red: 0.800, green: 0.867, blue: 0.976))
                        .cornerRadius(8)
                }
                
                NavigationLink(destination: ViewXPUBView(wallet: wallet)) {
                    Text("View XPUB")
                        .foregroundColor(.white)
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color(red: 0.800, green: 0.867, blue: 0.976))
                        .cornerRadius(8)
                }
                
                NavigationLink(destination: CreateInvoiceView(wallet: wallet)) {
                    Text("Create Invoice")
                        .foregroundColor(.white)
                        .padding()
                        .frame(maxWidth: .infinity)
                        .background(Color(red: 0.800, green: 0.867, blue: 0.976))
                        .cornerRadius(8)
                }
            }
            .padding([.horizontal, .bottom])
            
            // Transactions List
            if transactions.isEmpty {
                Text("No Transactions")
                    .opacity(showNoTransactionsLabel ? 1 : 0)
                    .animation(.easeIn, value: showNoTransactionsLabel)
                    .onAppear {
                        showNoTransactionsLabel = true
                    }
            } else {
                List(transactions) { transaction in
                    TransactionRowView(transaction: transaction)
                }
            }
            
            Spacer()
        }
        .navigationTitle("Transactions")
        .onAppear {
            // Load transactions for the wallet
            self.transactions = wallet.transactions
            if transactions.isEmpty {
                showNoTransactionsLabel = true
            } else {
                showNoTransactionsLabel = false
            }
        }
    }
}

struct WalletDetailsView_Previews: PreviewProvider {
    static var previews: some View {
        WalletDetailsView(wallet: Wallet(
            label: "My Wallet",
            balance: "0.5 BTC",
            type: .legacyWallet,
            preferredBalanceUnit: "BTC",
            receiveAddress: "1BoatSLRHtKNngkdXEeobR76b53LETtpyT",
            transactions: [
              Transaction(time: "2023-10-10 10:00", memo: "Payment for services", type: .received, amount: "0.1 BTC")
            ],
            xpub: "xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiK...",
            hideBalance: false,
            paymentCode: "lntb1u1p0..."
        ))
        .environmentObject(WatchDataSource.shared)
    }
}
