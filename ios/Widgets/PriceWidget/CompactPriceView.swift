import SwiftUI

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
                .multilineTextAlignment(.center)
                .dynamicTypeSize(.large ... .accessibility5)
                .foregroundStyle(textColor)
                .accessibilityLabel(String(localized: "Bitcoin price: \(price)"))

            VStack(alignment: .center, spacing: 8) {
                Text(code)
                    .shadow(color: shadowColor, radius: 1, x: 0, y: 1)
                Text(lastUpdated)
                    .shadow(color: shadowColor, radius: 1, x: 0, y: 1)
                Text(dataSource)
                    .shadow(color: shadowColor, radius: 1, x: 0, y: 1)
            }
            .font(.subheadline)
            .foregroundStyle(textColor)
            .multilineTextAlignment(.center)
            .accessibilityElement(children: .combine)
        }
        .padding()
        .frame(maxWidth: .infinity)
    }

    private var textColor: Color {
        colorScheme == .dark ? .white : .black
    }

    private var shadowColor: Color {
        textColor.opacity(0.2)
    }
}

#Preview("Compact Price View") {
    ZStack {
        LinearGradient(
            gradient: Gradient(colors: [.blue, .purple]),
            startPoint: .top,
            endPoint: .bottom
        )
        .ignoresSafeArea()

        CompactPriceView(
            price: "$50,000",
            lastUpdated: "Last updated: Oct 10, 2023",
            code: "BTC",
            dataSource: "Data source: CoinDesk"
        )
    }
}
