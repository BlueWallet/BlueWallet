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
    static var lastSuccessfulEntry: PriceWidgetEntry?

    func placeholder(in context: Context) -> PriceWidgetEntry {
        createEntry(date: Date(), family: context.family, currentMarketData: previewMarketData)
    }

    func getSnapshot(in context: Context, completion: @escaping (PriceWidgetEntry) -> Void) {
        let entry: PriceWidgetEntry
        if context.isPreview {
            entry = createEntry(date: Date(), family: context.family, currentMarketData: previewMarketData)
        } else {
            entry = createEntry(date: Date(), family: context.family, currentMarketData: emptyMarketData)
        }
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PriceWidgetEntry>) -> Void) {
        var entries: [PriceWidgetEntry] = []

        let userPreferredCurrency = Currency.getUserPreferredCurrency()
        if userPreferredCurrency != Currency.getLastSelectedCurrency() {
            Currency.saveNewSelectedCurrency()
        }

        Task {
            do {
                if let data = try await MarketAPI.fetchPrice(currency: userPreferredCurrency), let formattedRate = data.formattedRate {
                    let currentMarketData = MarketData(nextBlock: "", sats: "", price: formattedRate, rate: data.rateDouble, dateString: data.lastUpdate)
                    let previousMarketData = PriceWidgetProvider.lastSuccessfulEntry?.currentMarketData

                    let entry = createEntry(
                        date: Date(),
                        family: context.family,
                        currentMarketData: currentMarketData,
                        previousMarketData: previousMarketData ?? emptyMarketData
                    )
                    PriceWidgetProvider.lastSuccessfulEntry = entry
                    entries.append(entry)
                } else {
                    if let lastEntry = PriceWidgetProvider.lastSuccessfulEntry {
                        entries.append(lastEntry)
                    } else {
                        let entry = createEntry(date: Date(), family: context.family, currentMarketData: emptyMarketData)
                        entries.append(entry)
                    }
                }
            } catch {
                if let lastEntry = PriceWidgetProvider.lastSuccessfulEntry {
                    entries.append(lastEntry)
                } else {
                    let entry = createEntry(date: Date(), family: context.family, currentMarketData: emptyMarketData)
                    entries.append(entry)
                }
            }

            let timeline = Timeline(entries: entries, policy: .atEnd)
            completion(timeline)
        }
    }

    private func createEntry(date: Date, family: WidgetFamily, currentMarketData: MarketData, previousMarketData: MarketData = emptyMarketData) -> PriceWidgetEntry {
        PriceWidgetEntry(date: date, family: family, currentMarketData: currentMarketData, previousMarketData: previousMarketData)
    }
}
