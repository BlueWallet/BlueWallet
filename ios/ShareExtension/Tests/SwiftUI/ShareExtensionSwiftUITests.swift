import SwiftUI
import Testing
import UIKit

@MainActor
@Suite("Share extension SwiftUI")
struct ShareExtensionSwiftUITests {
    @Test("Renders processing, success, and failure states")
    @available(iOS 16.0, *)
    func rendersEveryState() throws {
        let preview = UIGraphicsImageRenderer(size: CGSize(width: 64, height: 64)).image { context in
            UIColor.systemBlue.setFill()
            context.fill(CGRect(origin: .zero, size: CGSize(width: 64, height: 64)))
        }
        let models = [
            ShareViewModel(),
            ShareViewModel(
                phase: .decision,
                previewImage: preview,
                openDestination: URL(string: "bluewallet://shared-image"),
                decodedValue: "https://bluewallet.io",
                decodedValues: ["https://bluewallet.io", "lightning:lnbc1example"]
            ),
            ShareViewModel(phase: .failure(.qrCodeNotFound), previewImage: preview),
        ]

        for model in models {
            let image = try #require(render(model: model, colorScheme: .light, dynamicTypeSize: .large, width: 390))
            #expect(image.size == CGSize(width: 390, height: 700))
        }
    }

    @Test("Requires one selection when non-Bitcoin QR codes are mixed")
    func selectsOnlyOneNonBitcoinPayload() {
        let model = ShareViewModel(
            phase: .decision,
            decodedValue: "https://bluewallet.io",
            decodedValues: ["https://bluewallet.io", "lightning:lnbc1example"]
        )
        #expect(model.requiresQRCodeSelection)
        #expect(model.valuesToOpen == ["https://bluewallet.io"])
        model.selectDecodedValue("lightning:lnbc1example")
        #expect(model.valuesToOpen == ["lightning:lnbc1example"])
    }

    @Test("Keeps multiple valid Bitcoin recipients together")
    func keepsBitcoinBatch() {
        let addresses = ["1BoatSLRHtKNngkdXEeobR76b53LETtpyT", "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy"]
        let model = ShareViewModel(phase: .decision, decodedValue: addresses[0], decodedValues: addresses)
        #expect(!model.requiresQRCodeSelection)
        #expect(model.valuesToOpen == addresses)
    }

    @Test("Adapts to dark mode, accessibility text, and narrow displays")
    @available(iOS 16.0, *)
    func adaptsToAppleDisplayTraits() throws {
        let model = ShareViewModel(phase: .failure(.unreadableImage))
        let light = try #require(render(model: model, colorScheme: .light, dynamicTypeSize: .large, width: 320))
        let darkAccessible = try #require(
            render(model: model, colorScheme: .dark, dynamicTypeSize: .accessibility3, width: 320)
        )

        #expect(light.size == darkAccessible.size)
        #expect(try #require(light.pngData()).isEmpty == false)
        #expect(try #require(darkAccessible.pngData()).isEmpty == false)
    }

    @available(iOS 16.0, *)
    private func render(
        model: ShareViewModel,
        colorScheme: ColorScheme,
        dynamicTypeSize: DynamicTypeSize,
        width: CGFloat
    ) -> UIImage? {
        let renderer = ImageRenderer(
            content: ShareView(model: model)
                .environment(\.colorScheme, colorScheme)
                .environment(\.dynamicTypeSize, dynamicTypeSize)
                .frame(width: width, height: 700)
        )
        renderer.scale = 1
        return renderer.uiImage
    }
}
