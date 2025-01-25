//
//  PriceWidget.swift
//  PriceWidget
//
//  Created by Marcos Rodriguez on 11/8/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//

import WidgetKit
import SwiftUI

@available(iOS 16.0, *)
struct PriceWidget: Widget {
    let kind: String = "PriceWidget"

  var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PriceWidgetProvider()) { entry in
            PriceWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Price")
        .description("View the current price of Bitcoin.")
        .supportedFamilies(supportedFamilies)
        .contentMarginsDisabledIfAvailable() 
    }

  @available(iOS 16.0, *)
  private var supportedFamilies: [WidgetFamily] {
        if #available(iOSApplicationExtension 16.0, *) {
            return [.systemSmall, .accessoryCircular, .accessoryInline, .accessoryRectangular]
        } else {
            return [.systemSmall]
        }
    }
}

@available(iOS 16.0, *)
struct PriceWidget_Previews: PreviewProvider {
  static var previews: some View {
        Group {
            PriceWidgetEntryView(entry: PreviewData.entry)
                .previewContext(WidgetPreviewContext(family: .systemSmall))
            if #available(iOSApplicationExtension 16.0, *) {
                PriceWidgetEntryView(entry: PreviewData.entry)
                    .previewContext(WidgetPreviewContext(family: .accessoryCircular))
                PriceWidgetEntryView(entry: PreviewData.entry)
                    .previewContext(WidgetPreviewContext(family: .accessoryInline))
                PriceWidgetEntryView(entry: PreviewData.entry)
                    .previewContext(WidgetPreviewContext(family: .accessoryRectangular))
            }
        }
    }
}

let previewMarketData = MarketData(nextBlock: "", sats: "", price: "$10,000", rate: 10000, dateString: "2019-09-18T17:27:00+00:00")

@available(iOS 14.0, *)
struct PreviewData {
    static let entry = PriceWidgetEntry(
        date: Date(),
        family: .systemSmall,
        currentMarketData: previewMarketData,
        previousMarketData: emptyMarketData
    )
}

@available(iOS 14.0, *)
extension WidgetConfiguration
{
  @available(iOS 15.0, *)
  func contentMarginsDisabledIfAvailable() -> some WidgetConfiguration
    {
        if #available(iOSApplicationExtension 17.0, *)
        {
            return self.contentMarginsDisabled()
        }
        else
        {
            return self
        }
    }
}
