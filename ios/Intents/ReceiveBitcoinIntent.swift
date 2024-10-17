import AppIntents
import SwiftUI

@available(iOS 16.0, *)
struct ReceiveBitcoinIntent: AppIntent {
    static var title: LocalizedStringResource = "Receive Bitcoin"
    
    static var description = IntentDescription(
        "Fetches and displays the Bitcoin receive address and label as a QR code from your BlueWallet wallet."
    )
    
    static var parameterSummary: some ParameterSummary {
        Summary("Receive Bitcoin from your selected wallet")
    }

    func perform() async throws -> some IntentResult & ProvidesDialog & ShowsSnippetView {
        // Fetch the wallet information (label and address) from Keychain
        guard let qrCodeData = KeychainManager.shared.fetchQRCodeData() else {
            return .dialog("No wallet data found. Please set up your wallet in BlueWallet.")
                .snippet(FailureView(errorMessage: "No wallet data found."))
        }

        // Ensure both label and address exist
        guard !qrCodeData.label.isEmpty, !qrCodeData.address.isEmpty else {
            return .dialog("Incomplete wallet data. Ensure both label and address are set.")
                .snippet(FailureView(errorMessage: "Missing label or address."))
        }

        // Success: Display the wallet label and QR code
        return .dialog("Here is your Bitcoin address:")
            .snippet(ReceiveBitcoinView(qrCode: qrCodeData.address, label: qrCodeData.label))
    }
}

// The SwiftUI view for displaying the wallet QR code and label
@available(iOS 16.0, *)
struct ReceiveBitcoinView: View {
    let qrCode: String
    let label: String
    
    var body: some View {
        VStack {
            Text(label)
                .font(.title)
                .padding(.bottom, 10)

            if let qrImage = generateQRCode(from: qrCode) {
                Image(uiImage: qrImage)
                    .resizable()
                    .frame(width: 200, height: 200)
                    .aspectRatio(contentMode: .fit)
                    .overlay(
                        Image("Splashicon")
                            .resizable()
                            .frame(width: 50, height: 50)
                    )
            } else {
                Text("Unable to generate QR code.")
                    .font(.body)
                    .foregroundColor(.red)
            }

            Text(buildStyledAddress(qrCode: qrCode))
                .font(.subheadline)
                .padding(.top, 10)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
    
    // Helper function to generate a QR code from a string
    private func generateQRCode(from string: String) -> UIImage? {
        let data = string.data(using: .ascii)
        let filter = CIFilter(name: "CIQRCodeGenerator")
        filter?.setValue(data, forKey: "inputMessage")
        if let outputImage = filter?.outputImage {
            let context = CIContext()
            if let cgImage = context.createCGImage(outputImage, from: outputImage.extent) {
                return UIImage(cgImage: cgImage)
            }
        }
        return nil
    }
}

// Failure view to display when wallet data is missing or incomplete
@available(iOS 16.0, *)
struct FailureView: View {
    let errorMessage: String
    
    var body: some View {
        VStack {
            Text("Error")
                .font(.title)
                .foregroundColor(.red)
                .padding()

            Text(errorMessage)
                .font(.body)
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)
                .padding()
        }
    }
}