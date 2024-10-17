import SwiftUI
import CoreImage.CIFilterBuiltins

struct ReceiveBitcoinView: View {
    let qrCode: String
    let label: String
    
    // Generate a QR code image from the given string
    private func generateQRCode(from string: String) -> UIImage? {
        let context = CIContext()
        let filter = CIFilter.qrCodeGenerator()
        
        filter.message = Data(string.utf8)
        
        if let outputImage = filter.outputImage {
            if let cgImage = context.createCGImage(outputImage.transformed(by: CGAffineTransform(scaleX: 10, y: 10)), from: outputImage.extent) {
                return UIImage(cgImage: cgImage)
            }
        }
        return nil
    }
    
    var body: some View {
        VStack {
            // Display the QR code with the app icon in the center
            if let qrImage = generateQRCode(from: qrCode) {
                ZStack {
                    Image(uiImage: qrImage)
                        .resizable()
                        .scaledToFit()
                        .frame(width: 200, height: 200) // Adjust size as needed
                    
                    // App icon in the center
                    Image("AppIcon") // Ensure your app icon is included in the asset catalog
                        .resizable()
                        .frame(width: 50, height: 50)
                        .clipShape(Circle())
                        .overlay(Circle().stroke(Color.white, lineWidth: 2)) // White border to improve visibility
                }
                .padding()
            }

            // Wallet label
            Text(label)
                .font(.headline)
                .padding(.top, 10)
            
            // QR code value (bold first and last 4 characters)
            formattedQRCodeText(qrCode: qrCode)
                .font(.subheadline)
                .padding(.top, 5)
        }
        .padding()
        .background(Color.white)
        .cornerRadius(10)
    }
    
    // Function to format the QR code value (first and last four bold)
    @ViewBuilder
    private func formattedQRCodeText(qrCode: String) -> some View {
        let start = qrCode.prefix(4)
        let end = qrCode.suffix(4)
        let middle = qrCode.dropFirst(4).dropLast(4)
        
        Text(start).bold() + Text(middle) + Text(end).bold()
    }
}
