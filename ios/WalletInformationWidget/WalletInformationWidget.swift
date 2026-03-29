//
//  WalletInformationWidget.swift
//  WalletInformationWidget
//
//  Created by Marcos Rodriguez on 10/29/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//

import WidgetKit
import SwiftUI

struct WalletInformationWidgetProvider: TimelineProvider {
    typealias Entry = WalletInformationWidgetEntry

    func placeholder(in context: Context) -> WalletInformationWidgetEntry {
        return WalletInformationWidgetEntry.placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (WalletInformationWidgetEntry) -> ()) {
        if context.isPreview {
            completion(WalletInformationWidgetEntry.placeholder)
            return
        }
        Task {
            let data = await WidgetDataLoader.shared.cachedWalletData(cacheKey: .walletInformation)
            completion(WalletInformationWidgetEntry(date: Date(), marketData: data.marketData, allWalletsBalance: data.walletData))
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        Task {
            let data = await WidgetDataLoader.shared.loadWalletAndPriceData(cacheKey: .walletInformation)
            let entry = WalletInformationWidgetEntry(date: Date(), marketData: data.marketData, allWalletsBalance: data.walletData)
            let timeline = Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(900)))
            completion(timeline)
        }
    }
}

struct WalletInformationWidgetEntry: TimelineEntry {
    let date: Date
    let marketData: MarketData
    var allWalletsBalance: WalletData = WalletData(balance: 0)
}

extension WalletInformationWidgetEntry {
    static var placeholder: WalletInformationWidgetEntry {
        WalletInformationWidgetEntry(date: Date(), marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$10,000", rate: 10000), allWalletsBalance: WalletData(balance: 1000000, latestTransactionTime: LatestTransaction(isUnconfirmed: false, epochValue: 1568804029000)))
    }
}

struct WalletInformationWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: WalletInformationWidgetEntry

    var body: some View {
        switch family {
        case .accessoryCircular:
            accessoryCircularView
        case .accessoryRectangular:
            accessoryRectangularView
        default:
            WalletInformationView(allWalletsBalance: entry.allWalletsBalance, marketData: entry.marketData)
                .padding()
                .containerBackground(Color.widgetBackground, for: .widget)
        }
    }

    private var accessoryCircularView: some View {
        VStack(spacing: 2) {
            Image(systemName: "bitcoinsign.circle")
                .font(.caption)
            Text(entry.allWalletsBalance.formattedBalanceBTC)
                .font(.caption2)
                .minimumScaleFactor(0.5)
                .lineLimit(1)
        }
        .containerBackground(for: .widget) {
            AccessoryWidgetBackground()
        }
    }

    private var accessoryRectangularView: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("Balance")
                .font(.caption)
                .fontWeight(.bold)
            Text(entry.allWalletsBalance.formattedBalanceBTC)
                .font(.caption)
                .minimumScaleFactor(0.5)
                .lineLimit(1)
            Text(entry.marketData.price)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .containerBackground(for: .widget) {
            AccessoryWidgetBackground()
        }
    }
}

struct WalletInformationWidget: Widget {
    let kind: String = "WalletInformationWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WalletInformationWidgetProvider()) { entry in
            WalletInformationWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Balance")
        .description("View your accumulated balance.")
        #if os(watchOS)
        .supportedFamilies([.accessoryRectangular, .accessoryCircular])
        #else
        .supportedFamilies([.systemSmall])
        #endif
        .contentMarginsDisabled()
    }
}

#Preview("Wallet Information", as: .systemSmall) {
    WalletInformationWidget()
} timeline: {
    WalletInformationWidgetEntry(date: Date(), marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$10,000", rate: Double(0)), allWalletsBalance: WalletData(balance: 0, latestTransactionTime: LatestTransaction(isUnconfirmed: nil, epochValue: nil)))
}
