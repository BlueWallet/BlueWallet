// QRCode.swift

import SwiftUI
import CoreGraphics
import EFQRCode

/// A class responsible for generating QR codes with an embedded logo using CoreGraphics.
class QRCodeGenerator {
    /// The name of the logo image to embed in the QR code.
    /// Ensure this image is added to your Assets catalog.
    private let logoName: String
    
    /// Initializes the QRCode generator with a specified logo.
    /// - Parameter logoName: The name of the logo image in the Assets catalog.
    init(logoName: String = "AppIcon") { // Replace "AppIconLogo" with your logo's asset name
        self.logoName = logoName
    }
    
    /// Generates a QR code `Image` from a given string, embedding the specified logo at the center.
    /// - Parameter string: The string to encode in the QR code.
    /// - Returns: A SwiftUI `Image` containing the QR code with the embedded logo.
    func generateQRCode(from string: String) -> Image {
        // Create a grayscale color space
        let colorSpace = CGColorSpaceCreateDeviceGray()
        
        // Define black color (0 intensity) with full opacity
        guard let blackColor = CGColor(colorSpace: colorSpace, components: [0, 1]) else {
            fatalError("Unable to create black CGColor")
        }
        
        // Define white color (1 intensity) with full opacity
        guard let whiteColor = CGColor(colorSpace: colorSpace, components: [1, 1]) else {
            fatalError("Unable to create white CGColor")
        }
        
        // Generate QR code data using EFQRCode
        guard let cgImage = EFQRCode.generate(
          for: string,
            size: EFIntSize(width: 300, height: 300),
            backgroundColor: whiteColor,       // Use the created white CGColor
            foregroundColor: blackColor        // Use the created black CGColor
        ) else {
            // Return a default image if QR generation fails
            return Image(systemName: "qrcode")
        }
        
        let qrUIImage = UIImage(cgImage: cgImage)
        
        // Load the logo image from Assets
        guard let logo = UIImage(named: logoName) else {
            // If logo not found, return the QR code without logo
            return Image(uiImage: qrUIImage)
        }
        
        // Embed the logo into the QR code
        let finalImage = embedLogo(qrImage: qrUIImage, logoImage: logo)
        
        // Return the final image as a SwiftUI Image
        if let finalUIImage = finalImage {
            return Image(uiImage: finalUIImage)
        } else {
            // Fallback to QR code without logo if embedding fails
            return Image(uiImage: qrUIImage)
        }
    }
    
    /// Embeds a logo image at the center of the QR code.
    /// - Parameters:
    ///   - qrImage: The QR code image as `UIImage`.
    ///   - logoImage: The logo image as `UIImage`.
    /// - Returns: A `UIImage` representing the QR code with the embedded logo.
    private func embedLogo(qrImage: UIImage, logoImage: UIImage) -> UIImage? {
        let size = qrImage.size
        
        // Calculate the logo size (e.g., 20% of the QR code size)
        let logoScale: CGFloat = 0.2
        let logoSize = CGSize(width: size.width * logoScale, height: size.height * logoScale)
        
        // Begin image context to draw QR code and logo
        UIGraphicsBeginImageContextWithOptions(size, false, 0.0)
        qrImage.draw(in: CGRect(origin: .zero, size: size))
        
        // Calculate the position to center the logo
        let logoOrigin = CGPoint(x: (size.width - logoSize.width) / 2,
                                 y: (size.height - logoSize.height) / 2)
        
        // Draw the logo
        logoImage.draw(in: CGRect(origin: logoOrigin, size: logoSize))
        
        // Retrieve the final image
        let finalImage = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()
        
        return finalImage
    }
}
