import SwiftUI

struct ReceiveView: View {
    var wallet: Wallet
    @State private var isLoading: Bool = true
    @State private var address: String = ""
    @State private var showSheet: Bool = false

    var body: some View {
        VStack {
            if isLoading {
                Image("loadingIndicator")
                    .resizable()
                    .frame(width: 60, height: 60)
                Text("Creating Invoice...")
                    .padding(.top, 10)
            } else {
                Text(address)
                    .multilineTextAlignment(.center)
                    .padding()
                Image("textfor")
                    .resizable()
                    .frame(width: 128, height: 128)
            }
            
            Spacer()
        }
        .navigationTitle("Receive")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button(action: { showSheet = true }) {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .sheet(isPresented: $showSheet) {
            CustomizeOptionsView()
        }
        .onAppear {
            // Simulate loading process
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                self.isLoading = false
                self.address = wallet.receiveAddress
            }
        }
    }
}

struct CustomizeOptionsView: View {
    var body: some View {
        VStack {
            Button(action: specifyMenuItemTapped) {
                Label("Customize", systemImage: "pencil")
            }
            // Add more customization options here
            Spacer()
        }
        .padding()
    }
    
    func specifyMenuItemTapped() {
        // Handle customization action
    }
}
