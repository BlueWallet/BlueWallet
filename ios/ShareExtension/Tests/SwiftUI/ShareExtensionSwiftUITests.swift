import SwiftUI
import Testing
import UIKit

@MainActor
@Suite("Share extension SwiftUI")
struct ShareExtensionSwiftUITests {
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
