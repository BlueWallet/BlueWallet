import SwiftUI

@available(iOS 16.4, *)
struct ReceiveBitcoinSnippet: View {
    let qrCode: String
    let label: String
    
    var body: some View {
        VStack {
            Text(label)
                .font(.headline) // Use headline for the label
                .padding(.bottom, 10)

            if let qrImage = generateQRCode(from: qrCode) {
                Image(uiImage: qrImage)
                    .resizable()
                    .frame(width: 200, height: 200)
                    .aspectRatio(contentMode: .fit)
                    .overlay(
                        Image("AppIcon")  // Add your app icon in the overlay
                            .resizable()
                            .frame(width: 50, height: 50)
                    )
            } else {
                Text("Unable to generate QR code.")
                    .font(.body)
                    .foregroundColor(.red)
            }

            buildStyledAddress(qrCode: qrCode)
                .font(.subheadline)
                .padding(.top, 10)
                .multilineTextAlignment(.center)
        }
        .padding()
    }
  
    // Build styled address helper
    private func buildStyledAddress(qrCode: String) -> some View {
        let firstFour = Text(qrCode.prefix(4)).fontWeight(.heavy).monospaced()
        let lastFour = Text(qrCode.suffix(4)).fontWeight(.heavy).monospaced()
        
        let middle = qrCode.dropFirst(4).dropLast(4)
        let halfIndex = middle.index(middle.startIndex, offsetBy: middle.count / 2)
        let firstMiddle = Text(middle[..<halfIndex]).monospaced()
        let secondMiddle = Text(middle[halfIndex...]).monospaced()

        return VStack(alignment: .center, spacing: 5) {
            HStack {
                firstFour
                Text("  ")
                firstMiddle
            }
            .frame(maxWidth: .infinity, alignment: .center)

            HStack {
                secondMiddle
                Text("  ")
                lastFour
            }
            .frame(maxWidth: .infinity, alignment: .center)
        }
        .lineLimit(nil)
        .multilineTextAlignment(.center)
        .padding(.vertical, 10)
    }

    // QR code generation helper
    private func generateQRCode(from string: String) -> UIImage? {
        let data = string.data(using: .ascii)
        let filter = CIFilter(name: "CIQRCodeGenerator")
        filter?.setValue(data, forKey: "inputMessage")
        filter?.setValue("L", forKey: "inputCorrectionLevel") // Error correction level

        if let outputImage = filter?.outputImage {
            let context = CIContext()
            if let cgImage = context.createCGImage(outputImage, from: outputImage.extent) {
                return UIImage(cgImage: cgImage)
            }
        }
        return nil
    }
}
