//
//  PriceWidget.swift
//  PriceWidget
//
//  Created by Marcos Rodriguez on 11/8/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//

import WidgetKit
import SwiftUI

struct PriceWidget: Widget {
    let kind: String = "PriceWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PriceWidgetProvider()) { entry in
            PriceWidgetEntryView(entry: entry)
                .containerBackground(Color.widgetBackground, for: .widget)
        }
        .configurationDisplayName("Price")
        .description("View the current price of Bitcoin.")
        #if os(watchOS)
        .supportedFamilies([.accessoryCircular, .accessoryInline, .accessoryRectangular])
        #else
        .supportedFamilies([.systemSmall, .accessoryCircular, .accessoryInline, .accessoryRectangular])
        #endif
        .contentMarginsDisabled()
    }
}

let previewMarketData = MarketData(nextBlock: "", sats: "", price: "$10,000", rate: 10000, dateString: "2019-09-18T17:27:00+00:00")

struct PreviewData {
    static let entry = PriceWidgetEntry(
        date: Date(),
        family: .systemSmall,
        currentMarketData: previewMarketData,
        previousMarketData: emptyMarketData
    )
}

#Preview("System Small", as: .systemSmall) {
    PriceWidget()
} timeline: {
    PreviewData.entry
}

#Preview("Accessory Circular", as: .accessoryCircular) {
    PriceWidget()
} timeline: {
    PreviewData.entry
}

#Preview("Accessory Inline", as: .accessoryInline) {
    PriceWidget()
} timeline: {
    PreviewData.entry
}

#Preview("Accessory Rectangular", as: .accessoryRectangular) {
    PriceWidget()
} timeline: {
    PreviewData.entry
}
