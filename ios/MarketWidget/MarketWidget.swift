//
//  MarketWidget.swift
//  MarketWidget
//
//  Created by Marcos Rodriguez on 10/29/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//

import WidgetKit
import SwiftUI

let textColor = Color("TextColor")
let emptyMarketData = MarketData(nextBlock: "...", sats: "...", price: "...")

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> SimpleEntry {
    SimpleEntry(date: Date(), marketData: emptyMarketData)
  }
  
  func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
    let entry: SimpleEntry
    if (context.isPreview) {
      entry = SimpleEntry(date: Date(), marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$10 000"))
    } else {
      entry = SimpleEntry(date: Date(), marketData: emptyMarketData)
    }
    completion(entry)
  }
  
  func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
    var entries: [SimpleEntry] = []
    let userPreferredCurrency = API.getUserPreferredCurrency();
    API.fetchPrice(currency: userPreferredCurrency, completion: { (result, error) in
      guard let result = result else {
        let timeline = Timeline(entries: entries, policy: .atEnd)
        completion(timeline)
        return
      }
      let entry = SimpleEntry(date: Date(), marketData: MarketData(nextBlock: "...", sats: "...", price: result.formattedRate ?? "..."))
      entries.append(entry)
      let timeline = Timeline(entries: entries, policy: .atEnd)
      completion(timeline)
    })
  }
}

struct SimpleEntry: TimelineEntry {
  let date: Date
  let marketData: MarketData
}

struct MarketWidgetEntryView : View {
  var entry: Provider.Entry
  @State var userPreferredCurrency: String = API.getUserPreferredCurrency()
  
  var body: some View {
    VStack(alignment: .leading, spacing:23 , content: {
      VStack(alignment: .leading, spacing: /*@START_MENU_TOKEN@*/nil/*@END_MENU_TOKEN@*/, content: {
        Text("Market").font(.headline).foregroundColor(textColor).bold()
        Spacer()
        HStack(alignment: .center, spacing: 0, content: {
                Text("Next Block").bold().lineLimit(1).font(Font.system(size:11, weight: .medium, design: .default)).foregroundColor(textColor).frame(maxWidth: .infinity, alignment: .leading)
                Text(entry.marketData.formattedNextBlock).lineLimit(1).padding(EdgeInsets(top: 4, leading: 8, bottom: 4, trailing: 8)).background(Color(red: 0.29, green: 0.86, blue: 0.73)).cornerRadius(4.0).foregroundColor(.white)}).lineLimit(1).font(Font.system(size:11, weight: .semibold, design: .default)).frame(maxWidth: .infinity, alignment: .trailing)
        Spacer()
        HStack(alignment: .center, spacing: 0, content: {
          Text("Sats/Dollar").bold().lineLimit(1).font(Font.system(size:11, weight: .medium, design: .default)).foregroundColor(textColor)
          Spacer()
          Text(entry.marketData.sats == "..." ? "..." : entry.marketData.sats ).padding(EdgeInsets(top: 4, leading: 8, bottom: 4, trailing: 8)).background(Color(red: 0.97, green: 0.21, blue: 0.38)).cornerRadius(4.0).foregroundColor(.white).lineLimit(1).font(Font.system(size:11, weight: .semibold, design: .default))
        })
        Spacer()
        HStack(alignment: .center, spacing: 0, content: {
          Text("Price").bold().lineLimit(1).font(Font.system(size:11, weight: . medium, design: .default)).foregroundColor(textColor)
          Spacer()
          Text(entry.marketData.price == "..." ? "..." : entry.marketData.price).padding(EdgeInsets(top: 4, leading: 8, bottom: 4, trailing: 8)).background(Color(red: 0.29, green: 0.86, blue: 0.73)).cornerRadius(4.0).foregroundColor(.white).lineLimit(1).font(Font.system(size:11, weight: .semibold, design: .default))
        })
      }).padding(EdgeInsets(top: 18, leading: 11, bottom: 18, trailing: 11))
    }).background(Color("WidgetBackground"))}
  
  func verifyIfUserPreferredCurrencyHasChanged() {
    if API.getLastSelectedCurrency() != userPreferredCurrency {
      API.saveNewSelectedCurrency()
      WidgetCenter.shared.reloadAllTimelines()
    }
  }
}

@main
struct MarketWidget: Widget {
  let kind: String = "MarketWidget"
  
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: Provider()) { entry in
      MarketWidgetEntryView(entry: entry)
    }
    .configurationDisplayName("Market")
    .description("Stay up to date with network prices.").supportedFamilies([.systemSmall])
  }
}

struct MarketWidget_Previews: PreviewProvider {
  static var previews: some View {
    MarketWidgetEntryView(entry: SimpleEntry(date: Date(), marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$10 000")))
      .previewContext(WidgetPreviewContext(family: .systemSmall))
  }
}


struct MarketData {
  let nextBlock: String
  let sats: String
  let price: String
  
  var formattedNextBlock: String {
    return nextBlock == "..." ? "..." : #"\#(nextBlock) sat/b"#
  }
}

