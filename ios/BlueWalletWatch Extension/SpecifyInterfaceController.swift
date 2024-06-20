//
//  SpecifyInterfaceController.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 3/23/19.

//

import SwiftUI
import WatchConnectivity

struct SpecifyInterfaceView: View {
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
                    amount = Double(newValue)
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
        if wallet.type == WalletGradient.LightningCustodial.rawValue || wallet.type == WalletGradient.LightningLDK.rawValue {
            amountText = ""
        }
    }

    private func createInvoice() {
        if dataSource.companionWalletsInitialized {
            WatchDataSource.requestLightningInvoice(walletIdentifier: wallet.id, amount: amount ?? 0, description: descriptionText) { _ in
                // handle response
            }
        } else {
            showAlert = true
        }
    }
}

struct SpecifyInterfaceView_Previews: PreviewProvider {
    static var previews: some View {
        let context = PersistenceController.preview.container.viewContext
        let mockWallet = Wallet.createMockWallet(context: context)
        
        return SpecifyInterfaceView(wallet: mockWallet)
            .environment(\.managedObjectContext, context)
    }
}
