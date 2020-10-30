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

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = SimpleEntry(date: Date())
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        var entries: [SimpleEntry] = []

        // Generate a timeline consisting of five entries an hour apart, starting from the current date.
        let currentDate = Date()
        for hourOffset in 0 ..< 5 {
            let entryDate = Calendar.current.date(byAdding: .hour, value: hourOffset, to: currentDate)!
            let entry = SimpleEntry(date: entryDate)
            entries.append(entry)
        }

        let timeline = Timeline(entries: entries, policy: .atEnd)
        completion(timeline)
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
}

struct MarketWidgetEntryView : View {
    var entry: Provider.Entry

  var body: some View {
    VStack(alignment: .leading, spacing:23 , content: {
      VStack(alignment: .leading, spacing: /*@START_MENU_TOKEN@*/nil/*@END_MENU_TOKEN@*/, content: {
        Text("Market").font(.headline).foregroundColor(textColor).bold()
        Spacer()
        HStack(alignment: .center, spacing: 0, content: {
                Text("Next Block").bold().lineLimit(1).font(Font.system(size:11, weight: .medium, design: .default)).foregroundColor(textColor)
                Spacer()
                Text("26 sat/b").padding(EdgeInsets(top: 4, leading: 8, bottom: 4, trailing: 8)).background(Color(red: 0.29, green: 0.86, blue: 0.73)).cornerRadius(4.0).foregroundColor(.white)}).lineLimit(1).font(Font.system(size:11, weight: .semibold, design: .default))
        Spacer()
        HStack(alignment: .center, spacing: 0, content: {
          Text("Sats/Dollar").bold().lineLimit(1).font(Font.system(size:11, weight: .medium, design: .default)).foregroundColor(textColor)
          Spacer()
          Text("9 134").padding(EdgeInsets(top: 4, leading: 8, bottom: 4, trailing: 8)).background(Color(red: 0.97, green: 0.21, blue: 0.38)).cornerRadius(4.0).foregroundColor(.white).lineLimit(1).font(Font.system(size:11, weight: .semibold, design: .default))
        })
        Spacer()
        HStack(alignment: .center, spacing: 0, content: {
          Text("Price").bold().lineLimit(1).font(Font.system(size:11, weight: . medium, design: .default)).foregroundColor(textColor)
          Spacer()
          Text("$10 000").padding(EdgeInsets(top: 4, leading: 8, bottom: 4, trailing: 8)).background(Color(red: 0.29, green: 0.86, blue: 0.73)).cornerRadius(4.0).foregroundColor(.white).lineLimit(1).font(Font.system(size:11, weight: .semibold, design: .default))
        })
      }).padding(EdgeInsets(top: 18, leading: 11, bottom: 18, trailing: 11))
    }).background(Color("WidgetBackground"))
    
  }
}

@main
struct MarketWidget: Widget {
    let kind: String = "MarketWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
          MarketWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("My Widget")
        .description("This is an example widget.").supportedFamilies([.systemSmall])
    }
}

struct MarketWidget_Previews: PreviewProvider {
  
  static var previews: some View {
    Group {
      MarketWidgetEntryView(entry: SimpleEntry(date: Date()))
                              .previewContext(WidgetPreviewContext(family: .systemSmall))           .environment(\.colorScheme, .light)
      MarketWidgetEntryView(entry: SimpleEntry(date: Date()))
        .previewContext(WidgetPreviewContext(family: .systemSmall))            .environment(\.colorScheme, .dark)
    }
  }
}

struct MarketData {
  let nextBlock: String
  let sats: String
  let price: String
}

