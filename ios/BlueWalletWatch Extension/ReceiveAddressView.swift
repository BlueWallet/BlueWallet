
import SwiftUI
import EFQRCode

struct ReceiveAddressView: View {
    var wallet: Wallet
    var receiveMethod: ReceiveMethod = .Onchain
    @State private var interfaceMode: ReceiveInterfaceMode = .Address
    @State private var qrCodeImage: UIImage?

    var body: some View {
        VStack {
            if let qrCodeImage = qrCodeImage {
                Image(uiImage: qrCodeImage)
                    .resizable()
                    .scaledToFit()
                    .frame(height: 200)
            } else {
                Text(wallet.receiveAddress)
                    .font(.title)
            }
            Button(action: toggleView) {
                Text(interfaceMode == .QRCode ? "Show Address" : "Show QR Code")
            }
        }
        .onAppear {
            setupQRCode()
        }
        .navigationTitle("Receive")
    }

    private func toggleView() {
        interfaceMode = interfaceMode == .QRCode ? .Address : .QRCode
        setupQRCode()
    }

    private func setupQRCode() {
        if interfaceMode == .QRCode {
            DispatchQueue.global(qos: .userInteractive).async {
                guard let cgImage = EFQRCode.generate(for: wallet.receiveAddress) else { return }
                DispatchQueue.main.async {
                    qrCodeImage = UIImage(cgImage: cgImage)
                }
            }
        } else {
            qrCodeImage = nil
        }
    }
}

struct ReceiveAddressView_Previews: PreviewProvider {
    static var previews: some View {
      ReceiveAddressView(wallet: SampleData.createSampleWallet())
    }
}