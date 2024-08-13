import SwiftUI
import EFQRCode

struct QRCodeView: View {
    var address: String
    var title: String
    @State private var selectedPage = 0
    @State private var qrCodeImage: UIImage?

    var body: some View {
        TabView(selection: $selectedPage) {
            VStack {
                if let qrCodeImage = qrCodeImage {
                    Image(uiImage: qrCodeImage)
                        .resizable()
                        .scaledToFit()
                        .padding()
                } else {
                    Text("Generating QR Code...")
                        .padding()
                }
            }
            .tag(0)

            VStack {
                ScrollView {
                    Text(address)
                        .font(.subheadline)
                        .multilineTextAlignment(.center) // This allows the text to have multiple lines
                        .padding()
                }
            }
            .tag(1)
        }
        .tabViewStyle(PageTabViewStyle())
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
        .onAppear(perform: generateQRCode)
    }

    private func generateQRCode() {
        DispatchQueue.global(qos: .userInitiated).async {
            if let qrCodeCGImage = EFQRCode.generate(
                for: self.address,
                watermark: nil
            ) {
                let qrCodeUIImage = UIImage(cgImage: qrCodeCGImage)
                DispatchQueue.main.async {
                    self.qrCodeImage = qrCodeUIImage
                }
            } else {
                DispatchQueue.main.async {
                    self.qrCodeImage = nil
                }
            }
        }
    }
}

struct QRCodeView_Previews: PreviewProvider {
    static var previews: some View {
        QRCodeView(address: "Sample Address", title: "Address")
    }
}
