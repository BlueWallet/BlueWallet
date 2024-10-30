import SwiftUI

@available(iOS 15.0, *)
struct CompactPriceView: View {
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
                .accessibilityLabel("Bitcoin price: \(price)")

            VStack(alignment: .center, spacing: 8) {
                Text("\(code)")
                Text("\(lastUpdated)")
                Text("\(dataSource)")
            }
            .font(.subheadline)
            .foregroundColor(.secondary)
            .multilineTextAlignment(.center)
            .accessibilityElement(children: .combine)
        }
        .padding()
        .frame(maxWidth: .infinity)
    }
}
