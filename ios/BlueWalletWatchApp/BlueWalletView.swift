import SwiftUI
import WatchConnectivity

struct BlueWalletView: View {
    @ObservedObject var dataSource: WatchDataSource = .shared
    @State private var qrContent: String? = nil

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
                            NavigationLink(destination: WalletDetailsView(wallet: wallet)) {
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
                .sheet(item: $qrContent) { content in
                    ViewQRCodeView(content: content)
                }
            }
        }
        .onAppear {
            WCSession.default.activate()
        }
    }
}

struct BlueWalletView_Previews: PreviewProvider {
    static var previews: some View {
        BlueWalletView()
            .environmentObject(WatchDataSource.mock)
    }
}
