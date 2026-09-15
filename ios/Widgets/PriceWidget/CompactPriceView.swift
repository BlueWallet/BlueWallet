import SwiftUI

@available(iOS 16.0, *)
struct CompactPriceView: View {
    let price: String
    let lastUpdated: String
    let code: String
    let dataSource: String

    var body: some View {
        VStack(spacing: 16) {
            Text(price)
                .font(.title2.weight(.semibold))
                .monospacedDigit()
                .lineLimit(1)
                .minimumScaleFactor(0.65)
                .allowsTightening(true)

            VStack(spacing: 8) {
                LabeledContent("Currency", value: code)
                LabeledContent("Updated", value: lastUpdated)
                LabeledContent("Source", value: dataSource)
            }
            .font(.subheadline)
        }
        .padding()
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Bitcoin market rate")
        .accessibilityValue("\(price), \(code). Updated \(lastUpdated). Source: \(dataSource).")
    }
}

@available(iOS 16.0, *)
struct CompactPriceView_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            CompactPriceView(
                price: "$50,000",
                lastUpdated: "Oct 10, 2023 at 10:00 AM",
                code: "USD",
                dataSource: "CoinDesk"
            )
            .previewDisplayName("Market rate")

            CompactPriceView(
                price: "N/A",
                lastUpdated: "--",
                code: "USD",
                dataSource: "Error fetching data"
            )
            .previewDisplayName("Unavailable")
        }
        .padding()
    }
}
