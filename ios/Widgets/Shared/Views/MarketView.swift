//
//  MarketView.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 11/3/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//

import SwiftUI
import WidgetKit

struct MarketView: View {
    var marketData: MarketData = emptyMarketData

    var body: some View {
        VStack(alignment: .leading, spacing: 23) {
            VStack(alignment: .leading) {
                Text("Market")
                    .font(.headline)
                    .foregroundStyle(Color.textColor)
                    .bold()
                Spacer()
                marketRow(label: String(localized: "Next Block"), value: marketData.formattedNextBlock, backgroundColor: Color(red: 0.29, green: 0.86, blue: 0.73), borderColor: .containerGreen)
                Spacer()
                marketRow(label: String(localized: "Sats/\(Currency.getUserPreferredCurrency())"), value: marketData.sats, backgroundColor: Color(red: 0.97, green: 0.21, blue: 0.38), borderColor: .containerRed)
                Spacer()
                marketRow(label: String(localized: "Price"), value: marketData.price, backgroundColor: Color(red: 0.29, green: 0.86, blue: 0.73), borderColor: .containerGreen)
            }
        }
    }

    private func marketRow(label: String, value: String, backgroundColor: Color, borderColor: Color) -> some View {
        HStack(alignment: .center, spacing: 0) {
            Text(label)
                .bold()
                .lineLimit(1)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(Color.textColor)
            Spacer()
            Text(value)
                .padding(EdgeInsets(top: 2, leading: 4, bottom: 2, trailing: 4))
                .lineLimit(1)
                .minimumScaleFactor(0.1)
                .foregroundStyle(Color.widgetBackground)
                .font(.system(size: 11, weight: .semibold))
                .background(backgroundColor)
                .overlay(
                    RoundedRectangle(cornerRadius: 4.0)
                        .stroke(borderColor, lineWidth: 4.0)
                )
        }
    }
}

#Preview("Market View") {
    MarketView(marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$10,000", rate: 0))
        .previewContext(WidgetPreviewContext(family: .systemSmall))
}
