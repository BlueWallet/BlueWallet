import AppIntents
import SwiftUI

@available(iOS 16.4, *)
struct ReceiveBitcoinIntent: AppIntent {
    static var title: LocalizedStringResource = "Receive Bitcoin"
    
    static var description = IntentDescription(
        "Fetches and displays the Bitcoin receive address and label as a QR code from your BlueWallet wallet."
    )
    
    static var parameterSummary: some ParameterSummary {
        Summary("Receive Bitcoin from your selected wallet")
    }


  func perform() async throws -> some IntentResult & ProvidesDialog {
        guard let qrCodeData = KeychainService.shared.fetchQRCodeData() else {
            return .result(dialog: IntentDialog("No wallet data found. Please set up your wallet in BlueWallet."))
        }

        guard !qrCodeData.label.isEmpty, !qrCodeData.address.isEmpty else {
            return .result(dialog: IntentDialog("Incomplete wallet data. Ensure both label and address are set."))
        }

        guard let qrCodeImage = generateQRCode(from: qrCodeData.address) else {
            return .result(dialog: IntentDialog("Unable to generate QR code for the Bitcoin address."))
        }

        guard let qrCodeBase64String = qrCodeImage.jpegData(compressionQuality: 0.8)?.base64EncodedString() else {
            return .result(dialog: IntentDialog("Failed to encode QR code as image."))
        }

        let formattedAddress = formatAddressForDisplay(qrCodeData.address)
        let dialogMessage = "\(qrCodeData.label)\nBitcoin Address: \(formattedAddress)\n\nQR Code:\n[data:image/jpeg;base64,\(qrCodeBase64String)]"

      return .result(dialog: IntentDialog(stringLiteral: dialogMessage))
    }

    private func generateQRCode(from string: String) -> UIImage? {
        let data = string.data(using: .ascii)
        let filter = CIFilter(name: "CIQRCodeGenerator")
        filter?.setValue(data, forKey: "inputMessage")
        filter?.setValue("L", forKey: "inputCorrectionLevel")

        if let outputImage = filter?.outputImage {
            let context = CIContext()
            if let cgImage = context.createCGImage(outputImage, from: outputImage.extent) {
                return UIImage(cgImage: cgImage)
            }
        }
        return nil
    }

    private func formatAddressForDisplay(_ address: String) -> String {
        let firstFour = address.prefix(4)
        let lastFour = address.suffix(4)
        let middle = address.dropFirst(4).dropLast(4)
        let halfIndex = middle.index(middle.startIndex, offsetBy: middle.count / 2)

        let firstMiddle = middle[..<halfIndex]
        let secondMiddle = middle[halfIndex...]

        return "\(firstFour) \(firstMiddle)\n\(secondMiddle) \(lastFour)"
    }
}
