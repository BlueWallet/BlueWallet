//
//  PriceView.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 11/8/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//

import SwiftUI
import WidgetKit

@available(iOS 14.0, *)
struct PriceView: View {
    var entry: PriceWidgetEntry

    var body: some View {
        switch entry.family {
        case .accessoryInline, .accessoryCircular, .accessoryRectangular:
            getView(for: entry.family)
        default:
            defaultView.background(Color(UIColor.systemBackground))
        }
    }

    @ViewBuilder
    private func getView(for family: WidgetFamily) -> some View {
        switch family {
        case .accessoryCircular:
            accessoryCircularView
        case .accessoryInline:
            accessoryInlineView
        case .accessoryRectangular:
            accessoryRectangularView
        default:
            defaultView
        }
    }

    private var accessoryCircularView: some View {
        let priceString = (entry.currentMarketData?.rate ?? 0).formattedPriceString()
        let priceChangePercentage = formattedPriceChangePercentage(currentRate: entry.currentMarketData?.rate, previousRate: entry.previousMarketData?.rate)

        return VStack(alignment: .center, spacing: 4) {
            Text("BTC")
                .font(.caption)
                .minimumScaleFactor(0.1)
            Text(priceString)
                .font(.body)
                .minimumScaleFactor(0.1)
                .lineLimit(1)
            if let priceChangePercentage = priceChangePercentage {
                Text(priceChangePercentage)
                    .font(.caption2)
                    .foregroundColor(priceChangePercentage.contains("-") ? .red : .green)
            }
        }
        .widgetURL(URL(string: "bluewallet://marketprice"))
    }

    private var accessoryInlineView: some View {
        let priceString = (entry.currentMarketData?.rate ?? 0).formattedCurrencyString()
        let priceChangePercentage = formattedPriceChangePercentage(currentRate: entry.currentMarketData?.rate, previousRate: entry.previousMarketData?.rate)

        return HStack {
            Text(priceString)
                .font(.body)
                .minimumScaleFactor(0.1)
            if let priceChangePercentage = priceChangePercentage {
                Image(systemName: priceChangePercentage.contains("-") ? "arrow.down" : "arrow.up")
                    .foregroundColor(priceChangePercentage.contains("-") ? .red : .green)
            }
        }
    }

    private var accessoryRectangularView: some View {
        let currentPrice = (entry.currentMarketData?.rate ?? 0).formattedCurrencyString()

        return VStack(alignment: .leading, spacing: 4) {
            Text("Bitcoin (\(Currency.getUserPreferredCurrency()))")
                .font(.caption)
                .foregroundColor(.secondary)
            HStack {
                Text(currentPrice)
                    .font(.caption)
                    .fontWeight(.bold)
                if let currentRate = entry.currentMarketData?.rate,
                   let previousRate = entry.previousMarketData?.rate,
                   currentRate != previousRate {
                    Image(systemName: currentRate > previousRate ? "arrow.up" : "arrow.down")
                }
            }

            if let previousPrice = entry.previousMarketData?.price,
               let currentRate = entry.currentMarketData?.rate,
               let previousRate = entry.previousMarketData?.rate,
               currentRate != previousRate {
                Text("From \(previousPrice)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Text("at \(entry.currentMarketData?.formattedDate ?? "--")")
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding(.all, 8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(UIColor.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private var defaultView: some View {
        VStack(alignment: .trailing, spacing: nil) {
            Text("Last Updated").font(Font.system(size: 11, weight: .regular)).foregroundColor(Color(UIColor.lightGray))
            HStack(alignment: .lastTextBaseline, spacing: nil) {
                Text(entry.currentMarketData?.formattedDate ?? "").lineLimit(1).foregroundColor(.primary).font(Font.system(size: 13, weight: .regular)).minimumScaleFactor(0.01).transition(.opacity)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 16) {
                HStack(alignment: .lastTextBaseline, spacing: nil) {
                    Text(entry.currentMarketData?.price ?? "").lineLimit(1).foregroundColor(.primary).font(Font.system(size: 28, weight: .bold)).minimumScaleFactor(0.01).transition(.opacity)
                }
                if let previousPrice = entry.previousMarketData?.price,
                   let currentRate = entry.currentMarketData?.rate,
                   let previousRate = entry.previousMarketData?.rate,
                   previousRate > 0, currentRate != previousRate {
                    HStack(alignment: .lastTextBaseline, spacing: nil) {
                        Image(systemName: currentRate > previousRate ? "arrow.up" : "arrow.down")
                        Text("from").lineLimit(1).foregroundColor(.primary).font(Font.system(size: 13, weight: .regular)).minimumScaleFactor(0.01)
                        Text(previousPrice).lineLimit(1).foregroundColor(.primary).font(Font.system(size: 13, weight: .regular)).minimumScaleFactor(0.01)
                    }.transition(.slide)
                }
            }
        }.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .trailing).padding()
    }

    private func formattedPriceChangePercentage(currentRate: Double?, previousRate: Double?) -> (change: Double, formattedString: String)? {
        guard let currentRate = currentRate, let previousRate = previousRate, previousRate > 0 else { return nil }
        let change = ((currentRate - previousRate) / previousRate) * 100
        guard change != 0 else { return nil }
        let formattedString = String(format: "%+.1f%%", change)
        return (change, formattedString)
    }
    }
}
