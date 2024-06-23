import SwiftUI

struct QRCodeView: View {
    var address: String
    @State private var selectedPage = 0

    var body: some View {
        TabView(selection: $selectedPage) {
            VStack {
                // QR code generation view here
                Text("QR Code Placeholder")
                    .font(.largeTitle)
            }
            .tag(0)

            VStack {
                Text("QR Code String Value")
                    .font(.headline)
                Text(address)
                    .font(.subheadline)
                    .padding()
            }
            .tag(1)
        }
        .tabViewStyle(PageTabViewStyle())
        .navigationTitle("QR Code")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct QRCodeView_Previews: PreviewProvider {
    static var previews: some View {
        QRCodeView(address: "Sample Address")
    }
}
