import SwiftUI

@available(iOS 15.0, *)
struct CompactPriceView: View {
    @Environment(\.colorScheme) var colorScheme

    let price: String
    let lastUpdated: String
    let code: String
    let dataSource: String

    var body: some View {
        VStack(alignment: .center, spacing: 16) {
            Text(price)
                .font(.title)
                .bold()
                .foregroundColor(priceTextColor)
                .shadow(color: Color.black.opacity(0.2), radius: 1, x: 0, y: 1)
                .multilineTextAlignment(.center)
                .dynamicTypeSize(.large ... .accessibility5)
                .accessibilityLabel("Bitcoin price: \(price)")

            VStack(alignment: .center, spacing: 8) {
                Text(code)
                Text(lastUpdated)
                Text(dataSource)
            }
            .font(.subheadline)
            .foregroundColor(systemButtonTextColor)
            .multilineTextAlignment(.center)
            .accessibilityElement(children: .combine)
        }
        .padding()
        .frame(maxWidth: .infinity)
    }

    // Adaptive color for the price text using system built-in colors
    var priceTextColor: Color {
        colorScheme == .dark ? .cyan : .blue
    }

    // Use the system button text color for the secondary text
    var systemButtonTextColor: Color {
        Color.accentColor
    }
}