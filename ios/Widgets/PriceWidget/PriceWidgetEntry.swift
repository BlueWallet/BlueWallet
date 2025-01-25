//
//  PriceWidgetEntry.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 10/27/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//

import AppIntents
import WidgetKit

@available(iOS 14.0, *)
public struct PriceWidgetEntry: TimelineEntry {
    public let date: Date
    public let family: WidgetFamily
    public let currentMarketData: MarketData?
    public let previousMarketData: MarketData?

    public init(date: Date, family: WidgetFamily, currentMarketData: MarketData?, previousMarketData: MarketData?) {
        self.date = date
        self.family = family
        self.currentMarketData = currentMarketData
        self.previousMarketData = previousMarketData
    }
}
