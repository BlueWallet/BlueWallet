import SwiftUI
import CoreImage.CIFilterBuiltins

@available(iOS 16.4, *)
struct WalletAddressSnippet: View {
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

    private func buildStyledAddress(qrCode: String) -> some View {
        let firstFour = Text(qrCode.prefix(4)).fontWeight(.heavy).monospaced()
        let lastFour = Text(qrCode.suffix(4)).fontWeight(.heavy).monospaced()
        let middle = qrCode.dropFirst(4).dropLast(4)
        let halfIndex = middle.index(middle.startIndex, offsetBy: middle.count / 2)
        let firstMiddle = Text(middle[..<halfIndex]).monospaced()
        let secondMiddle = Text(middle[halfIndex...]).monospaced()

        return VStack(alignment: .center, spacing: 4) {
            HStack {
                firstFour
                Text(" ")
                firstMiddle
            }
            .frame(maxWidth: .infinity, alignment: .center)

            HStack {
                secondMiddle
                Text(" ")
                lastFour
            }
            .frame(maxWidth: .infinity, alignment: .center)
        }
        .lineLimit(nil)
        .multilineTextAlignment(.center)
        .padding(.vertical, 10)
    }
}

func generateQRCode(from string: String) -> UIImage? {
    let data = ("bitcoin:\(string)").data(using: .utf8)
    let filter = CIFilter.qrCodeGenerator()
    filter.setValue(data, forKey: "inputMessage")

    if let outputImage = filter.outputImage {
        let scaledImage = outputImage.transformed(by: CGAffineTransform(scaleX: 12, y: 12))
        let context = CIContext()

        if let cgImage = context.createCGImage(scaledImage, from: scaledImage.extent) {
            let qrCodeImage = UIImage(cgImage: cgImage)

            let iconSize = CGSize(width: 80, height: 80)
            let containerSize = CGSize(width: iconSize.width + 15, height: iconSize.height + 15)
            let renderer = UIGraphicsImageRenderer(size: CGSize(width: 400, height: 400))

            return renderer.image { context in
                context.cgContext.setFillColor(UIColor.clear.cgColor)
                context.fill(CGRect(x: 0, y: 0, width: 400, height: 400))

                qrCodeImage.draw(in: CGRect(origin: .zero, size: CGSize(width: 400, height: 400)))

                let containerOrigin = CGPoint(
                    x: (400 - containerSize.width) / 2,
                    y: (400 - containerSize.height) / 2
                )
                let containerRect = CGRect(origin: containerOrigin, size: containerSize)

                UIColor.white.setFill()
                context.fill(containerRect)

                UIColor.black.setStroke()
                context.stroke(containerRect)

                if let appIcon = UIImage(named: "SplashIcon") {
                    let iconOrigin = CGPoint(
                        x: containerOrigin.x + 7.5,
                        y: containerOrigin.y + 7.5
                    )
                    appIcon.draw(in: CGRect(origin: iconOrigin, size: iconSize))
                }
            }
        }
    }
    return nil
}
