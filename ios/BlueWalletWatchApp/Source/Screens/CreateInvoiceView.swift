// Views/CreateInvoiceView.swift

import SwiftUI

struct CreateInvoiceView: View {
    @EnvironmentObject var dataSource: WatchDataSource
    var wallet: Wallet
    @State private var description: String = ""
    @State private var amount: String = ""
    @State private var isCreateEnabled: Bool = false
    @State private var invoice: String = ""
    @State private var showInvoice: Bool = false
    
    var body: some View {
        VStack {
            // Description Input
            TextField("Description", text: $description)
                //.textFieldStyle(RoundedBorderTextFieldStyle()) // Removed for watchOS compatibility
                .padding()
            
            // Amount Input
            NavigationLink(destination: NumericKeypadView(amount: $amount, isCreateEnabled: $isCreateEnabled)) {
                HStack {
                    Text("Amount")
                    Spacer()
                    Text(amount.isEmpty ? "Tap to add" : amount)
                        .foregroundColor(.gray)
                }
                .padding()
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(Color.gray.opacity(0.5), lineWidth: 1)
                )
            }
            .padding(.horizontal)
            
            // Separator
            Divider()
                .opacity(0.85)
                .padding([.horizontal, .top])
            
            // Create Button
            Button(action: createButtonTapped) {
                Text("Create")
                    .foregroundColor(.white)
                    .padding()
                    .frame(maxWidth: .infinity)
                    .background(isCreateEnabled ? Color.blue : Color.gray)
                    .cornerRadius(8)
            }
            .disabled(!isCreateEnabled)
            .padding([.horizontal, .top])
            
            // Invoice Display
            if showInvoice {
                VStack {
                    Text("Invoice:")
                        .font(.headline)
                    Text(invoice)
                        .font(.body)
                        .multilineTextAlignment(.center)
                        .padding()
                }
                .transition(.opacity)
            }
            
            Spacer()
        }
        .navigationTitle("Create Invoice")
        .onChange(of: amount) { newValue in
            isCreateEnabled = !newValue.isEmpty && Double(newValue) != nil
        }
    }
    
    func createButtonTapped() {
        guard let amountDouble = Double(amount) else { return }
        dataSource.requestLightningInvoice(
            walletIdentifier: dataSource.wallets.firstIndex(of: wallet) ?? 0,
            amount: amountDouble,
            description: description
        ) { invoice in
            DispatchQueue.main.async {
                self.invoice = invoice
                self.showInvoice = true
            }
        }
    }
}

struct CreateInvoiceView_Previews: PreviewProvider {
    static var previews: some View {
        CreateInvoiceView(wallet: Wallet(
            label: "My Wallet",
            balance: "0.5 BTC",
            type: .legacyWallet,
            preferredBalanceUnit: "BTC",
            receiveAddress: "1BoatSLRHtKNngkdXEeobR76b53LETtpyT",
            transactions: [],
            xpub: "xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiK...",
            hideBalance: false,
            paymentCode: "lntb1u1p0..."
        ))
        .environmentObject(WatchDataSource.shared)
    }
}
