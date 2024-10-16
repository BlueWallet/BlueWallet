import SwiftUI
import CoreImage.CIFilterBuiltins

struct ShowQRCodeView: View {
    let qrCode: String
    let label: String

    var body: some View {
        VStack {
            Text(label)
                .font(.headline)
                .padding(.bottom, 20)

            // QR code with app icon in the middle
            generateQRCodeImage(from: qrCode)
                .resizable()
                .aspectRatio(contentMode: .fit)
                .frame(width: 200, height: 200)
                .overlay(
                    Image("AppIcon") // Replace "AppIcon" with the name of your app icon asset
                        .resizable()
                        .frame(width: 50, height: 50) // Size of the app icon in the center
                )
                .padding(10) // Padding to create the white border
                .background(Color.white) // White background for the QR code to ensure scannability
                .cornerRadius(10)
        }
        .padding()
    }

    // Helper function to generate the QR code
    func generateQRCodeImage(from string: String) -> Image {
        let context = CIContext()
        let filter = CIFilter.qrCodeGenerator()
        let data = Data(string.utf8)
        filter.setValue(data, forKey: "inputMessage")

        if let outputImage = filter.outputImage {
            if let cgimg = context.createCGImage(outputImage, from: outputImage.extent) {
                return Image(uiImage: UIImage(cgImage: cgimg))
            }
        }
        return Image(systemName: "xmark.circle")
    }
}