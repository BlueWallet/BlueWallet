import UIKit
import CoreImage.CIFilterBuiltins
import AppIntents
import SwiftUI

@available(iOS 16.4, *)
struct GenerateQRCodeIntent: AppIntent {
    static var title: LocalizedStringResource = "Generate QR Code"
    
    static var description = IntentDescription(
        "Generates a QR code for a Bitcoin address from your wallet and exports it as an image."
    )
    
    static var parameterSummary: some ParameterSummary {
        Summary("Generate a QR code for a Bitcoin address from your selected wallet.")
    }

    @Parameter(title: "Show Label", default: true)
    var showLabel: Bool
    
    @Parameter(title: "Show Address", default: true)
    var showAddress: Bool

    enum GenerateQRCodeError: Error, LocalizedError {
        case noWalletSelected
        case invalidWalletData
        case qrCodeGenerationFailed
        case imageSavingFailed
        
        var errorDescription: String? {
            switch self {
            case .noWalletSelected, .invalidWalletData:
                return "It seems something went wrong. Please choose a wallet to use in your BlueWallet settings > General > Shortcuts."
            case .qrCodeGenerationFailed:
                return "Failed to generate the QR code."
            case .imageSavingFailed:
                return "Failed to save the QR code image."
            }
        }
    }

    func perform() async throws -> some ReturnsValue<IntentFile> {
        guard let qrCodeData = KeychainService.shared.fetchQRCodeData() else {
            throw GenerateQRCodeError.noWalletSelected
        }

        guard !qrCodeData.label.isEmpty, !qrCodeData.address.isEmpty else {
            throw GenerateQRCodeError.invalidWalletData
        }

        guard let image = renderBitcoinAddressQRCodeSnippetAsImageCoreGraphics(
            qrCode: qrCodeData.address,
            label: qrCodeData.label,
            showAddress: showAddress,
            showLabel: showLabel
        ) else {
            throw GenerateQRCodeError.qrCodeGenerationFailed
        }

        guard let imageData = image.pngData(), let fileURL = saveImageToFile(imageData) else {
            throw GenerateQRCodeError.imageSavingFailed
        }

        let intentFile = IntentFile(fileURL: fileURL, filename: "bitcoin_qr_code.png", type: .png)
        
        return .result(value: intentFile)
    }

    private func saveImageToFile(_ imageData: Data) -> URL? {
        let tempDirectory = FileManager.default.temporaryDirectory
        let fileURL = tempDirectory.appendingPathComponent("bitcoin_qr_code.png")

        do {
            try imageData.write(to: fileURL)
            return fileURL
        } catch {
            return nil
        }
    }
}

func renderBitcoinAddressQRCodeSnippetAsImageCoreGraphics(
    qrCode: String,
    label: String,
    showAddress: Bool,
    showLabel: Bool,
    size: CGSize = CGSize(width: 400, height: 400)
) -> UIImage? {
    guard let qrImage = generateQRCode(from: qrCode) else { return nil }
    
    let renderer = UIGraphicsImageRenderer(size: size)
    
    return renderer.image { context in
        context.cgContext.setFillColor(UIColor.white.cgColor)
        context.cgContext.fill(CGRect(origin: .zero, size: size))

        let qrCodeSize = CGSize(width: 200, height: 200)
        let qrCodeOrigin = CGPoint(x: (size.width - qrCodeSize.width) / 2, y: (size.height - qrCodeSize.height) / 2)
        qrImage.draw(in: CGRect(origin: qrCodeOrigin, size: qrCodeSize))

        if let appIcon = UIImage(named: "SplashIcon") {
            let iconSize = CGSize(width: 60, height: 60)
            let containerSize = CGSize(width: iconSize.width + 10, height: iconSize.height + 10)
            let iconOrigin = CGPoint(
                x: qrCodeOrigin.x + (qrCodeSize.width - iconSize.width) / 2,
                y: qrCodeOrigin.y + (qrCodeSize.height - iconSize.height) / 2
            )
            let containerOrigin = CGPoint(
                x: qrCodeOrigin.x + (qrCodeSize.width - containerSize.width) / 2,
                y: qrCodeOrigin.y + (qrCodeSize.height - containerSize.height) / 2
            )
            
            UIColor.white.setFill()
            context.cgContext.fill(CGRect(origin: containerOrigin, size: containerSize))
            UIColor.black.setStroke()
            context.cgContext.stroke(CGRect(origin: containerOrigin, size: containerSize))
            
            appIcon.draw(in: CGRect(origin: iconOrigin, size: iconSize))
        }

        if showLabel {
            let labelText = label
            let attributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.boldSystemFont(ofSize: 18),
                .foregroundColor: UIColor.black
            ]
            let textSize = labelText.size(withAttributes: attributes)
            let labelOrigin = CGPoint(x: (size.width - textSize.width) / 2, y: qrCodeOrigin.y - textSize.height - 10)
            labelText.draw(at: labelOrigin, withAttributes: attributes)
        }

        if showAddress {
            drawStyledAddress(qrCode: qrCode, context: context, size: size, qrCodeOrigin: qrCodeOrigin)
        }
    }
}

private func drawStyledAddress(qrCode: String, context: UIGraphicsImageRendererContext, size: CGSize, qrCodeOrigin: CGPoint) {
    let fontSize: CGFloat = 14
    let fontBold = UIFont.monospacedSystemFont(ofSize: fontSize, weight: .bold)
    let fontRegular = UIFont.monospacedSystemFont(ofSize: fontSize, weight: .regular)
    let attributesBold: [NSAttributedString.Key: Any] = [
        .font: fontBold,
        .foregroundColor: UIColor.black
    ]
    let attributesNormal: [NSAttributedString.Key: Any] = [
        .font: fontRegular,
        .foregroundColor: UIColor.black
    ]
    let firstFour = String(qrCode.prefix(4))
    let lastFour = String(qrCode.suffix(4))
    let middle = String(qrCode.dropFirst(4).dropLast(4))
    let middleLength = middle.count
    var minWidthDifference: CGFloat = CGFloat.greatestFiniteMagnitude
    var bestFirstMiddle = ""
    var bestSecondMiddle = ""

    for splitIndex in 0...middleLength {
        let firstMiddle = String(middle.prefix(splitIndex))
        let secondMiddle = String(middle.dropFirst(splitIndex))

        let firstLine = NSMutableAttributedString()
        firstLine.append(NSAttributedString(string: firstFour, attributes: attributesBold))
        firstLine.append(NSAttributedString(string: firstMiddle, attributes: attributesNormal))

        let secondLine = NSMutableAttributedString()
        secondLine.append(NSAttributedString(string: secondMiddle, attributes: attributesNormal))
        secondLine.append(NSAttributedString(string: lastFour, attributes: attributesBold))

        let firstLineWidth = firstLine.size().width
        let secondLineWidth = secondLine.size().width
        let widthDifference = abs(firstLineWidth - secondLineWidth)

        if widthDifference < minWidthDifference {
            minWidthDifference = widthDifference
            bestFirstMiddle = firstMiddle
            bestSecondMiddle = secondMiddle
        }
    }

    let firstLineAttributedString = NSMutableAttributedString()
    firstLineAttributedString.append(NSAttributedString(string: firstFour, attributes: attributesBold))
    firstLineAttributedString.append(NSAttributedString(string: bestFirstMiddle, attributes: attributesNormal))

    let secondLineAttributedString = NSMutableAttributedString()
    secondLineAttributedString.append(NSAttributedString(string: bestSecondMiddle, attributes: attributesNormal))
    secondLineAttributedString.append(NSAttributedString(string: lastFour, attributes: attributesBold))

    let firstLineSize = firstLineAttributedString.size()
    let secondLineSize = secondLineAttributedString.size()
    let maxLineWidth = max(firstLineSize.width, secondLineSize.width)

    let yOffsetFirstLine = qrCodeOrigin.y + 200 + 10
    let lineHeight = firstLineSize.height
    let yOffsetSecondLine = yOffsetFirstLine + lineHeight + 5
    let xPosition = (size.width - maxLineWidth) / 2

    firstLineAttributedString.draw(at: CGPoint(x: xPosition, y: yOffsetFirstLine))
    secondLineAttributedString.draw(at: CGPoint(x: xPosition, y: yOffsetSecondLine))
}
