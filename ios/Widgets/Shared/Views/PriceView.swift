//
//  PriceView.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 11/8/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//

import SwiftUI
import WidgetKit

@available(iOS 16.0, *)
struct PriceView: View {
  var entry: PriceWidgetEntry
  
  var body: some View {
    switch entry.family {
    case .accessoryInline, .accessoryCircular, .accessoryRectangular:
      if #available(iOSApplicationExtension 16.0, *) {
        wrappedView(for: getView(for: entry.family), family: entry.family)
      } else {
        getView(for: entry.family)
      }
    default:
      defaultView.background(Color(UIColor.systemBackground))
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
    if #available(iOSApplicationExtension 16.0, *) {
      ZStack {
        if family == .accessoryRectangular {
          AccessoryWidgetBackground()
            .background(Color(UIColor.systemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 10))
        } else {
          AccessoryWidgetBackground()
        }
        content
      }
    } else {
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
          .foregroundColor(priceChangePercentage.contains("-") ? .red : .green)
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
          .foregroundColor(priceChangePercentage.contains("-") ? .red : .green)
      }
    }
  }
  
  private var accessoryRectangularView: some View {
    let currentPrice = formattedCurrencyString(from: entry.currentMarketData?.rate)
    
    return VStack(alignment: .leading, spacing: 4) {
      Text("Bitcoin (\(Currency.getUserPreferredCurrency()))")
        .font(.caption)
        .foregroundColor(.secondary)
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
    VStack(alignment: .trailing, spacing: nil, content: {
      Text("Last Updated").font(Font.system(size: 11, weight: .regular)).foregroundColor(Color(UIColor.lightGray))
      HStack(alignment: .lastTextBaseline, spacing: nil, content: {
        Text(entry.currentMarketData?.formattedDate ?? "").lineLimit(1).foregroundColor(.primary).font(Font.system(size: 13, weight: .regular)).minimumScaleFactor(0.01).transition(.opacity)
      })
      Spacer()
      VStack(alignment: .trailing, spacing: 16, content: {
        HStack(alignment: .lastTextBaseline, spacing: nil, content: {
          Text(entry.currentMarketData?.price ?? "").lineLimit(1).foregroundColor(.primary).font(Font.system(size: 28, weight: .bold)).minimumScaleFactor(0.01).transition(.opacity)
        })
        if let previousMarketDataPrice = entry.previousMarketData?.price, let currentMarketDataRate = entry.currentMarketData?.rate, let previousMarketDataRate = entry.previousMarketData?.rate, previousMarketDataRate > 0, currentMarketDataRate != previousMarketDataRate {
          HStack(alignment: .lastTextBaseline, spacing: nil, content: {
            Image(systemName: currentMarketDataRate > previousMarketDataRate ? "arrow.up" : "arrow.down")
            Text("from").lineLimit(1).foregroundColor(.primary).font(Font.system(size: 13, weight: .regular)).minimumScaleFactor(0.01)
            Text(previousMarketDataPrice).lineLimit(1).foregroundColor(.primary).font(Font.system(size: 13, weight: .regular)).minimumScaleFactor(0.01)
          }).transition(.slide)
        }
      })
    }).frame(minWidth: 0, maxWidth: .infinity, minHeight: 0, maxHeight: .infinity, alignment: .trailing).padding()
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

@available(iOS 16.0, *)
struct PriceView_Previews: PreviewProvider {
  static var previews: some View {
    Group {
      PriceView(entry: PriceWidgetEntry(date: Date(), family: .systemSmall, currentMarketData: MarketData(nextBlock: "", sats: "", price: "$10,000", rate: 10000, dateString: "2019-09-18T17:27:00+00:00"), previousMarketData: emptyMarketData))
        .previewContext(WidgetPreviewContext(family: .systemSmall)).padding()
      if #available(iOSApplicationExtension 16.0, *) {
        PriceView(entry: PriceWidgetEntry(date: Date(), family: .accessoryCircular, currentMarketData: MarketData(nextBlock: "", sats: "", price: "$10,000", rate: 10000, dateString: "2019-09-18T17:27:00+00:00"), previousMarketData: emptyMarketData))
          .previewContext(WidgetPreviewContext(family: .accessoryCircular))
        PriceView(entry: PriceWidgetEntry(date: Date(), family: .accessoryInline, currentMarketData: MarketData(nextBlock: "", sats: "", price: "$10,000", rate: 10000, dateString: "2019-09-18T17:27:00+00:00"), previousMarketData: emptyMarketData))
          .previewContext(WidgetPreviewContext(family: .accessoryInline))
        PriceView(entry: PriceWidgetEntry(date: Date(), family: .accessoryRectangular, currentMarketData: MarketData(nextBlock: "", sats: "", price: "$10,000", rate: 10000, dateString: "2019-09-18T17:27:00+00:00"), previousMarketData: emptyMarketData))
          .previewContext(WidgetPreviewContext(family: .accessoryRectangular))
      }
    }
  }
}
