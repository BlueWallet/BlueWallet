import SwiftUI
import WatchConnectivity

struct BlueWalletView: View {
    @ObservedObject var dataSource: WatchDataSource = .shared
    @State private var qrContent: QRCodeContent? = nil
    @State private var showingErrorAlert = false  // Added property

    var body: some View {
        VStack {
            if !WCSession.default.isCompanionAppInstalled {
                Spacer()
                Text("Your Apple Watch is not paired with an iPhone. Please pair it to sync with BlueWallet.")
                    .multilineTextAlignment(.center)
                    .padding()
                    .transition(.opacity)
                Spacer()
            } else if !dataSource.isDataLoaded {
                Spacer()
                ProgressView("Loading wallets...")
                    .progressViewStyle(CircularProgressViewStyle())
                    .transition(.opacity)
                Spacer()
            } else if dataSource.wallets.isEmpty {
                Spacer()
                Text("No wallets available. Please, add one by opening BlueWallet on your iPhone.")
                    .multilineTextAlignment(.center)
                    .padding()
                    .transition(.opacity)
                Spacer()
            } else {
                List {
                    ForEach(dataSource.wallets) { wallet in
                        VStack(alignment: .leading) {
                            NavigationLink(destination: WalletTransactionsView(wallet: wallet)) {
                                WalletListRow(wallet: wallet)
                            }
                        }
                        .listRowInsets(.init())
                        .padding(.vertical, 4)
                    }
                }
                .listStyle(CarouselListStyle())
                .navigationTitle("BlueWallet")
                .navigationBarTitleDisplayMode(.automatic)
                .sheet(item: $qrContent) { qrCode in
                    ViewQRCodeView(content: qrCode.content)
                }
            }
        }
        .onAppear {
            WCSession.default.activate()
        }
        // Observe changes to dataLoadError
        .onReceive(dataSource.$dataLoadError) { error in
            if error != nil {
                showingErrorAlert = true
            }
        }
        // Present the alert when an error occurs
        .alert(isPresented: $showingErrorAlert) {
            Alert(
                title: Text("Unable to Load Data"),
                message: Text(dataSource.dataLoadError ?? "An unexpected error occurred while loading your wallets. Please try again."),
                dismissButton: .default(Text("OK")) {
                    showingErrorAlert = false
                    dataSource.dataLoadError = nil  // Reset the error after dismissal
                }
            )
        }
    }
}

struct BlueWalletView_Previews: PreviewProvider {
    static var previews: some View {
        BlueWalletView()
            .environmentObject(WatchDataSource.mock)
    }
}
