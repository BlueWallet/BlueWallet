//
//  PriceWidget.swift
//  PriceWidget
//
//  Created by Marcos Rodriguez on 11/8/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//

import WidgetKit
import SwiftUI
struct Provider: TimelineProvider {
    @AppStorage("PriceWidgetPreviousMarketData") var previousMarketDataFormattedRate: String?

    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), currentMarketDate: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = SimpleEntry(date: Date(), currentMarketDate: nil)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        var entries: [SimpleEntry] = []
      

      WidgetAPI.fetchPrice(currency: WidgetAPI.getUserPreferredCurrency()) { (data, error) in
        if let data = data, let formattedRate = data.formattedRate {
          let currentMarketData = MarketData(nextBlock: "", sats: "", price: formattedRate, rate: data.rateDouble, dateString: data.lastUpdate)
          let entry = SimpleEntry(date:Date(), currentMarketDate: currentMarketData)
          if formattedRate != previousMarketDataFormattedRate {
            previousMarketDataFormattedRate = formattedRate
            entries.append(entry)
          } else {
            previousMarketDataFormattedRate = "$13,000"
          }
        }
   
        let timeline = Timeline(entries: entries, policy: .atEnd)
        completion(timeline)
      }

    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
  let currentMarketDate: MarketData?
}

struct PriceWidgetEntryView : View {
  var entry: Provider.Entry
  @AppStorage("PriceWidgetPreviousMarketData") var previousMarketDataFormattedRate: String = ""

  var priceView: some View {
    PriceView(currentMarketData: entry.currentMarketDate, previousMarketData: MarketData(nextBlock: "", sats: "", price: previousMarketDataFormattedRate, rate: 0)).padding()
  }

    var body: some View {
      priceView.background(Color.widgetBackground)
    }
}

@main
struct PriceWidget: Widget {
    let kind: String = "PriceWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            PriceWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Price")
        .description("View the current price of Bitcoin.").supportedFamilies([.systemSmall])
    }
}

struct PriceWidget_Previews: PreviewProvider {
    static var previews: some View {
        PriceWidgetEntryView(entry: SimpleEntry(date: Date(), currentMarketDate: nil))
            .previewContext(WidgetPreviewContext(family: .systemSmall))
    }
}
