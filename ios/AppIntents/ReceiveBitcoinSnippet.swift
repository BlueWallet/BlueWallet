import SwiftUI
import CoreImage.CIFilterBuiltins

@available(iOS 16.4, *)
struct ReceiveBitcoinSnippet: View {
    let qrCode: String
    
    @Environment(\.colorScheme) var colorScheme

    var body: some View {
        VStack {
            if let qrImage = generateQRCode(from: qrCode) {
                Image(uiImage: qrImage)
                    .interpolation(.none)
                    .resizable()
                    .frame(width: 200, height: 200)
                    .aspectRatio(contentMode: .fit)
                    .overlay(
                        Image("SplashIcon")
                            .resizable()
                            .frame(width: 50, height: 50)
                            .background(colorScheme == .dark ? Color.black.opacity(0.75) : Color.white.opacity(0.75))
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
                .foregroundColor(colorScheme == .dark ? .white : .black)
        }
        .padding()
        .background(colorScheme == .dark ? Color.black : Color.white)
        .cornerRadius(10)
        .shadow(color: colorScheme == .dark ? Color.white.opacity(0.3) : Color.black.opacity(0.1), radius: 5) 
    }

    private func generateQRCode(from string: String) -> UIImage? {
        let data = string.data(using: .utf8)
        let filter = CIFilter.qrCodeGenerator()
        filter.setValue(data, forKey: "inputMessage")
        if let outputImage = filter.outputImage {
            let scaledImage = outputImage.transformed(by: CGAffineTransform(scaleX: 10, y: 10))
            let context = CIContext()
            if let cgImage = context.createCGImage(scaledImage, from: scaledImage.extent) {
                return UIImage(cgImage: cgImage)
            }
        }
        return nil
    }

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
}
