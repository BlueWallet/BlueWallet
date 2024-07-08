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
    VStack {
      Text("BTC")
        .font(.caption)
        .minimumScaleFactor(0.1)
      if let preferredFiatCurrencySymbol = fiatUnit(currency: Currency.getUserPreferredCurrency())?.symbol, let rateAbbreviated = entry.currentMarketData?.rate.abbreviated {
        Text("\(preferredFiatCurrencySymbol)\(rateAbbreviated)")
          .font(.title3)
          .minimumScaleFactor(0.1)
      } else {
        Text("--")
          .font(.title)
          .fontWeight(.bold)
      }
    }
    .widgetURL(URL(string: "bluewallet://marketprice"))
  }
  
  private var accessoryInlineView: some View {
    HStack {
      if let preferredFiatCurrencySymbol = fiatUnit(currency: Currency.getUserPreferredCurrency())?.symbol, let rateAbbreviated = entry.currentMarketData?.rate.abbreviated {
        Text("BTC \(preferredFiatCurrencySymbol)\(rateAbbreviated)")
          .font(.body)
      } else {
        Text("BTC --")
          .font(.body)
      }
    }
  }
  
  private var accessoryRectangularView: some View {
    VStack(alignment: .leading, spacing: 4) {
      Text("Bitcoin Price")
        .font(.caption)
        .foregroundColor(.secondary)
      HStack {
        Text(entry.currentMarketData?.price ?? "--")
          .font(.title2)
          .fontWeight(.bold)
        if let currentMarketDataRate = entry.currentMarketData?.rate, let previousMarketDataRate = entry.previousMarketData?.rate, previousMarketDataRate > 0 {
          Image(systemName: currentMarketDataRate > previousMarketDataRate ? "arrow.up" : "arrow.down")
            .foregroundColor(currentMarketDataRate > previousMarketDataRate ? .green : .red)
        }
      }
      .minimumScaleFactor(0.01)
      
      if let previousMarketDataPrice = entry.previousMarketData?.price {
        Text("From \(previousMarketDataPrice)")
          .font(.caption)
          .foregroundColor(.secondary)
      }
      
      Text("Last Updated: \(entry.currentMarketData?.formattedDate ?? "--")")
        .font(.caption2)
        .foregroundColor(.secondary)
    }
    .padding()
  }
  
  private var defaultView: some View {
    VStack(alignment: .trailing, spacing: nil, content: {
      Text("Last Updated").font(Font.system(size: 11, weight: .regular, design: .default)).foregroundColor(.textColorLightGray)
      HStack(alignment: .lastTextBaseline, spacing: nil, content: {
        Text(entry.currentMarketData?.formattedDate ?? "").lineLimit(1).foregroundColor(.textColor).font(Font.system(size:13, weight: .regular, design: .default)).minimumScaleFactor(0.01).transition(.opacity)
      })
      Spacer()
      VStack(alignment: .trailing, spacing: 16, content: {
        HStack(alignment: .lastTextBaseline, spacing: nil, content: {
          Text(entry.currentMarketData?.price ?? "").lineLimit(1).foregroundColor(.textColor).font(Font.system(size:28, weight: .bold, design: .default)).minimumScaleFactor(0.01).transition(.opacity)
        })
        if let previousMarketDataPrice = entry.previousMarketData?.price, let currentMarketDataRate = entry.currentMarketData?.rate, let previousMarketDataRate = entry.previousMarketData?.rate, previousMarketDataRate > 0, currentMarketDataRate != previousMarketDataRate {
          HStack(alignment: .lastTextBaseline, spacing: nil, content: {
            Image(systemName: currentMarketDataRate > previousMarketDataRate  ?  "arrow.up" : "arrow.down")
            Text("from").lineLimit(1).foregroundColor(.textColor).font(Font.system(size:13, weight: .regular, design: .default)).minimumScaleFactor(0.01)
            Text(previousMarketDataPrice).lineLimit(1).foregroundColor(.textColor).font(Font.system(size:13, weight: .regular, design: .default)).minimumScaleFactor(0.01)
          }).transition(.slide)
        }
      })
    }).frame(minWidth: 0, maxWidth: .infinity, minHeight: 0, maxHeight: .infinity, alignment: .trailing).padding()
  }
}

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
