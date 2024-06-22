import Foundation
import EFQRCode
import SwiftUI

struct ViewQRCodefaceView: View {
    var address: String
    @State private var qrCodeImage: UIImage?

    var body: some View {
        VStack {
            if let qrCodeImage = qrCodeImage {
                Image(uiImage: qrCodeImage)
                    .resizable()
                    .scaledToFit()
                    .frame(height: 200)
            } else {
                Text(address)
                    .font(.title)
            }
            Button(action: toggleView) {
                Text(qrCodeImage != nil ? "Show Address" : "Show QR Code")
            }
        }
        .onAppear {
            generateQRCode()
        }
        .navigationTitle("View QR Code")
    }

    private func toggleView() {
        if qrCodeImage != nil {
            qrCodeImage = nil
        } else {
            generateQRCode()
        }
    }

    private func generateQRCode() {
        DispatchQueue.global(qos: .userInteractive).async {
            guard let cgImage = EFQRCode.generate(for: address) else { return }
            DispatchQueue.main.async {
                qrCodeImage = UIImage(cgImage: cgImage)
            }
        }
    }
}

struct ViewQRCodefaceView_Previews: PreviewProvider {
    static var previews: some View {
        ViewQRCodefaceView(address: "Sample Address")
    }
}
