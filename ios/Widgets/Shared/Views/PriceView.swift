//
//  PriceView.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 11/8/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//

import SwiftUI
import WidgetKit

struct PriceView: View {
    var entry: PriceWidgetEntry

    var body: some View {
        switch entry.family {
        case .accessoryInline, .accessoryCircular, .accessoryRectangular:
            wrappedView(for: getView(for: entry.family), family: entry.family)
        default:
            defaultView
        }
    }

    private func getView(for family: WidgetFamily) -> some View {
        switch family {
        case .accessoryCircular:
            return AnyView(accessoryCircularView)
        case .accessoryInline:
            return AnyView(accessoryInlineView)
        case .accessoryRectangular:
            return AnyView(accessoryRectangularView)
        default:
            return AnyView(defaultView)
        }
    }

    @ViewBuilder
    private func wrappedView<Content: View>(for content: Content, family: WidgetFamily) -> some View {
        ZStack {
            if family == .accessoryRectangular {
                AccessoryWidgetBackground()
                    .clipShape(RoundedRectangle(cornerRadius: 10))
            } else {
                AccessoryWidgetBackground()
            }
            content
        }
    }

    private var accessoryCircularView: some View {
        let priceString = formattedPriceString(from: entry.currentMarketData?.rate)
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
                    .foregroundStyle(priceChangePercentage.contains("-") ? .red : .green)
            }
        }
        .widgetURL(URL(string: "bluewallet://marketprice"))
    }

    private var accessoryInlineView: some View {
        let priceString = formattedCurrencyString(from: entry.currentMarketData?.rate)
        let priceChangePercentage = formattedPriceChangePercentage(currentRate: entry.currentMarketData?.rate, previousRate: entry.previousMarketData?.rate)

        return HStack {
            Text(priceString)
                .font(.body)
                .minimumScaleFactor(0.1)
            if let priceChangePercentage = priceChangePercentage {
                Image(systemName: priceChangePercentage.contains("-") ? "arrow.down" : "arrow.up")
                    .foregroundStyle(priceChangePercentage.contains("-") ? .red : .green)
            }
        }
    }

    private var accessoryRectangularView: some View {
        let currentPrice = formattedCurrencyString(from: entry.currentMarketData?.rate)

        return VStack(alignment: .leading, spacing: 4) {
            Text("Bitcoin (\(Currency.getUserPreferredCurrency()))")
                .font(.caption)
                .foregroundStyle(.secondary)
            HStack {
                Text(currentPrice)
                    .font(.caption)
                    .fontWeight(.bold)
                if let currentMarketDataRate = entry.currentMarketData?.rate,
                   let previousMarketDataRate = entry.previousMarketData?.rate,
                   currentMarketDataRate != previousMarketDataRate {
                    Image(systemName: currentMarketDataRate > previousMarketDataRate ? "arrow.up" : "arrow.down")
                }
            }

            if let previousMarketDataPrice = entry.previousMarketData?.price, Int(entry.currentMarketData?.rate ?? 0) != Int(entry.previousMarketData?.rate ?? 0) {
                Text("From \(previousMarketDataPrice)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Text("at \(entry.currentMarketData?.formattedDate ?? "--")")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .padding(.all, 8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private var defaultView: some View {
        VStack(alignment: .trailing, spacing: nil) {
            Text("Last Updated")
                .font(.system(size: 11, weight: .regular))
                .foregroundStyle(Color.textColorLightGray)
            HStack(alignment: .lastTextBaseline) {
                Text(entry.currentMarketData?.formattedDate ?? "")
                    .lineLimit(1)
                    .foregroundStyle(.primary)
                    .font(.system(size: 13, weight: .regular))
                    .minimumScaleFactor(0.01)
                    .transition(.opacity)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 16) {
                HStack(alignment: .lastTextBaseline) {
                    Text(entry.currentMarketData?.price ?? "")
                        .lineLimit(1)
                        .foregroundStyle(.primary)
                        .font(.system(size: 28, weight: .bold))
                        .minimumScaleFactor(0.01)
                        .transition(.opacity)
                }
                if let previousMarketDataPrice = entry.previousMarketData?.price,
                   let currentMarketDataRate = entry.currentMarketData?.rate,
                   let previousMarketDataRate = entry.previousMarketData?.rate,
                   previousMarketDataRate > 0,
                   currentMarketDataRate != previousMarketDataRate {
                    HStack(alignment: .lastTextBaseline) {
                        Image(systemName: currentMarketDataRate > previousMarketDataRate ? "arrow.up" : "arrow.down")
                        Text("from")
                            .lineLimit(1)
                            .foregroundStyle(.primary)
                            .font(.system(size: 13, weight: .regular))
                            .minimumScaleFactor(0.01)
                        Text(previousMarketDataPrice)
                            .lineLimit(1)
                            .foregroundStyle(.primary)
                            .font(.system(size: 13, weight: .regular))
                            .minimumScaleFactor(0.01)
                    }
                    .transition(.slide)
                }
            }
        }
        .frame(minWidth: 0, maxWidth: .infinity, minHeight: 0, maxHeight: .infinity, alignment: .trailing)
        .padding()
    }

    private func formattedPriceString(from rate: Double?) -> String {
        let numberFormatter = NumberFormatter()
        numberFormatter.numberStyle = .decimal
        numberFormatter.maximumFractionDigits = 0
        return numberFormatter.string(from: NSNumber(value: rate ?? 0)) ?? "--"
    }

    private func formattedCurrencyString(from rate: Double?) -> String {
        let numberFormatter = NumberFormatter()
        numberFormatter.maximumFractionDigits = 0
        numberFormatter.numberStyle = .currency
        numberFormatter.currencySymbol = fiatUnit(currency: Currency.getUserPreferredCurrency())?.symbol
        return numberFormatter.string(from: NSNumber(value: rate ?? 0)) ?? "--"
    }

    private func formattedPriceChangePercentage(currentRate: Double?, previousRate: Double?) -> String? {
        guard let currentRate = currentRate, let previousRate = previousRate, previousRate > 0 else { return nil }
        let change = ((currentRate - previousRate) / previousRate) * 100
        return change == 0 ? nil : String(format: "%+.1f%%", change)
    }
}

#Preview("System Small") {
    PriceView(entry: PriceWidgetEntry(date: Date(), family: .systemSmall, currentMarketData: MarketData(nextBlock: "", sats: "", price: "$10,000", rate: 10000, dateString: "2019-09-18T17:27:00+00:00"), previousMarketData: emptyMarketData))
        .previewContext(WidgetPreviewContext(family: .systemSmall))
        .padding()
}

#Preview("Accessory Circular") {
    PriceView(entry: PriceWidgetEntry(date: Date(), family: .accessoryCircular, currentMarketData: MarketData(nextBlock: "", sats: "", price: "$10,000", rate: 10000, dateString: "2019-09-18T17:27:00+00:00"), previousMarketData: emptyMarketData))
        .previewContext(WidgetPreviewContext(family: .accessoryCircular))
}
