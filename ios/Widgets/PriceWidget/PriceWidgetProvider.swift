//
//  PriceWidgetProvider.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 10/27/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//


import WidgetKit
import SwiftUI

@available(iOS 16.0, *)
struct PriceWidgetProvider: TimelineProvider {
    typealias Entry = PriceWidgetEntry

    func placeholder(in context: Context) -> PriceWidgetEntry {
        createEntry(date: Date(), family: context.family, currentMarketData: previewMarketData)
    }

    func getSnapshot(in context: Context, completion: @escaping (PriceWidgetEntry) -> Void) {
        let entry: PriceWidgetEntry
        if context.isPreview {
            entry = createEntry(date: Date(), family: context.family, currentMarketData: previewMarketData)
        } else {
            let fallbackMarketData = WidgetMarketDataStore.loadFallback()
            entry = createEntry(date: Date(), family: context.family, currentMarketData: fallbackMarketData)
        }
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PriceWidgetEntry>) -> Void) {
        let userPreferredCurrency = Currency.getUserPreferredCurrency()
        if userPreferredCurrency != Currency.getLastSelectedCurrency() {
            Currency.saveNewSelectedCurrency()
        }

        Task {
            let previousMarketData = WidgetMarketDataStore.previousMarketData() ?? emptyMarketData
            let currentMarketData = await WidgetMarketDataLoader.loadPriceData(currency: userPreferredCurrency)
            let entry = createEntry(
                date: Date(),
                family: context.family,
                currentMarketData: currentMarketData,
                previousMarketData: previousMarketData
            )
            let timeline = Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(15 * 60)))
            completion(timeline)
        }
    }

    private func createEntry(date: Date, family: WidgetFamily, currentMarketData: MarketData, previousMarketData: MarketData = emptyMarketData) -> PriceWidgetEntry {
        PriceWidgetEntry(date: date, family: family, currentMarketData: currentMarketData, previousMarketData: previousMarketData)
    }
}
