import AppKit
import CoreImage
import CoreImage.CIFilterBuiltins
import Foundation

guard CommandLine.arguments.count == 2 else {
    fatalError("Usage: generate-bitcoin-qr.swift <output.png>")
}

let filter = CIFilter.qrCodeGenerator()
filter.message = Data("bitcoin:1BoatSLRHtKNngkdXEeobR76b53LETtpyT".utf8)
filter.correctionLevel = "M"

guard let image = filter.outputImage?.transformed(by: CGAffineTransform(scaleX: 12, y: 12)) else {
    fatalError("Could not generate the Bitcoin QR image")
}

let context = CIContext()
guard let cgImage = context.createCGImage(image, from: image.extent),
      let png = NSBitmapImageRep(cgImage: cgImage).representation(using: .png, properties: [:]) else {
    fatalError("Could not encode the Bitcoin QR image")
}

try png.write(to: URL(fileURLWithPath: CommandLine.arguments[1]), options: .atomic)
