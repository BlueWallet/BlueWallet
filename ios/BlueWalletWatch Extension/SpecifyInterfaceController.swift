import SwiftUI

struct SpecifyAmountView: View {
    @ObservedObject var dataSource = WatchDataSource.shared
    var wallet: Wallet
    @State private var descriptionText: String = ""
    @State private var amountText: String = "0"
    @State private var amount: Double? = nil
    @State private var showAlert = false

    var body: some View {
        VStack {
            TextField("Description", text: $descriptionText)
            TextField("Amount", text: $amountText)
                .onChange(of: amountText) { newValue in
                    amount = Double(newValue) ?? 0.0
                }
            Button(action: createInvoice) {
                Text("Create")
            }
            .disabled(amount == nil || amount! <= 0)
        }
        .alert(isPresented: $showAlert) {
            Alert(title: Text("Error"), message: Text("Unable to create invoice. Please open BlueWallet on your iPhone and unlock your wallets."), dismissButton: .default(Text("OK")))
        }
        .onAppear {
            setupView()
        }
        .navigationTitle("Specify Invoice")
    }

    private func setupView() {
        if wallet.type == .LightningCustodial || wallet.type == .LightningLDK {
            amountText = ""
        }
    }

    private func createInvoice() {
        if dataSource.companionWalletsInitialized {
            Task {
                do {
                  let invoice = try await dataSource.handleLightningInvoiceCreateRequest(walletIndex: UUID().hashValue, amount: amount ?? 0, description: descriptionText)
                    print("Invoice created: \(invoice)")
                } catch {
                    print("Failed to create invoice: \(error)")
                    showAlert = true
                }
            }
        } else {
            showAlert = true
        }
    }
}

struct SpecifyAmountView_Previews: PreviewProvider {
    static var previews: some View {
        let sampleWallet = SampleData.createSampleWallet()
        return SpecifyAmountView(wallet: sampleWallet)
    }
}
