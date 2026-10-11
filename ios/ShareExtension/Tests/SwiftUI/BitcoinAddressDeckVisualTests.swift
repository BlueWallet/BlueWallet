import SwiftUI
import XCTest

@MainActor
@available(iOS 16.0, *)
final class BitcoinAddressDeckVisualTests: XCTestCase {
    func testStackingAnimationEndpoints() throws {
        let addresses = [
            "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
            "1BoatSLRHtKNngkdXEeobR76b53LETtpyT",
            "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy",
        ]

        add(renderedAttachment(addresses: addresses, isPresented: false, name: "Address deck — animation start"))
        add(renderedAttachment(addresses: addresses, isPresented: true, name: "Address deck — animation settled"))
    }

    private func renderedAttachment(addresses: [String], isPresented: Bool, name: String) -> XCTAttachment {
        let view = BitcoinAddressDeck(
            addresses: addresses,
            isPresented: isPresented,
            automaticallyPresents: false
        )
        .frame(width: 280)
        .padding(24)
        .background(Color(uiColor: .systemBackground))
        .environment(\.colorScheme, .light)

        let renderer = ImageRenderer(content: view)
        renderer.proposedSize = ProposedViewSize(width: 328, height: 180)
        renderer.scale = 2

        let attachment = XCTAttachment(image: renderer.uiImage ?? UIImage())
        attachment.name = name
        attachment.lifetime = .keepAlways
        return attachment
    }
}
