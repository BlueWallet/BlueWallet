//
//  PriceWidgetProvider.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 10/27/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//


import WidgetKit
import SwiftUI

struct PriceWidgetProvider: TimelineProvider {
    typealias Entry = PriceWidgetEntry

    func placeholder(in context: Context) -> PriceWidgetEntry {
        PriceWidgetEntry(date: Date(), family: context.family, currentMarketData: previewMarketData, previousMarketData: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (PriceWidgetEntry) -> Void) {
        if context.isPreview {
            completion(PriceWidgetEntry(date: Date(), family: context.family, currentMarketData: previewMarketData, previousMarketData: nil))
            return
        }
        Task {
            let data = await WidgetDataLoader.shared.cachedPriceData()
            completion(PriceWidgetEntry(date: Date(), family: context.family, currentMarketData: data.current, previousMarketData: data.previous))
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PriceWidgetEntry>) -> Void) {
        Task {
            let data = await WidgetDataLoader.shared.loadPriceData()
            let entry = PriceWidgetEntry(date: Date(), family: context.family, currentMarketData: data.current, previousMarketData: data.previous)
            let timeline = Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(900)))
            completion(timeline)
        }
    }
}
