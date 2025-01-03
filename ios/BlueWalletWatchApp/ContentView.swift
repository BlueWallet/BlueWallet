import SwiftUI

struct ContentView: View {
    var body: some View {
        BlueWalletView()
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
            .environmentObject(WatchDataSource.shared)
    }
}
