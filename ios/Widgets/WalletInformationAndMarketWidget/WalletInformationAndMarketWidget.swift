//
//  WalletInformationAndMarketWidget.swift
//  WalletInformationAndMarketWidget
//
//  Created by Marcos Rodriguez on 10/29/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//

import WidgetKit
import SwiftUI

struct WalletInformationAndMarketWidgetProvider: TimelineProvider {
    typealias Entry = WalletInformationAndMarketWidgetEntry

    func placeholder(in context: Context) -> WalletInformationAndMarketWidgetEntry {
        return WalletInformationAndMarketWidgetEntry.placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (WalletInformationAndMarketWidgetEntry) -> ()) {
        if context.isPreview {
            completion(WalletInformationAndMarketWidgetEntry.placeholder)
            return
        }
        Task {
            let data = await WidgetDataLoader.shared.cachedWalletData(cacheKey: .walletInformationAndMarket)
            completion(WalletInformationAndMarketWidgetEntry(date: Date(), marketData: data.marketData, allWalletsBalance: data.walletData))
        }
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        Task {
            let data = await WidgetDataLoader.shared.loadWalletAndMarketData(cacheKey: .walletInformationAndMarket)
            let entry = WalletInformationAndMarketWidgetEntry(date: Date(), marketData: data.marketData, allWalletsBalance: data.walletData)
            let timeline = Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(900)))
            completion(timeline)
        }
    }

}

struct WalletInformationAndMarketWidgetEntry: TimelineEntry {
    let date: Date
    let marketData: MarketData
    var allWalletsBalance: WalletData = WalletData(balance: 0)
    static var placeholder = WalletInformationAndMarketWidgetEntry(date: Date(), marketData: MarketData(nextBlock: "...", sats: "...", price: "...", rate: 0), allWalletsBalance: WalletData(balance: 0, latestTransactionTime: LatestTransaction(isUnconfirmed: false, epochValue: 1568804029000)))
}

struct WalletInformationAndMarketWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: WalletInformationAndMarketWidgetEntry

    var body: some View {
        switch family {
        case .accessoryRectangular:
            accessoryRectangularView
        case .systemLarge:
            largeLayout
                .containerBackground(Color.widgetBackground, for: .widget)
        default:
            mediumLayout
                .containerBackground(Color.widgetBackground, for: .widget)
        }
    }

    private var accessoryRectangularView: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(entry.allWalletsBalance.formattedBalanceBTC)
                .font(.caption)
                .fontWeight(.bold)
                .lineLimit(1)
                .minimumScaleFactor(0.5)
            Text(entry.marketData.price)
                .font(.caption2)
            Text(entry.marketData.formattedNextBlock)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .containerBackground(for: .widget) {
            AccessoryWidgetBackground()
        }
    }

    private var largeLayout: some View {
        VStack(alignment: .leading, spacing: 0) {
            WalletInformationView(allWalletsBalance: entry.allWalletsBalance, marketData: entry.marketData)
                .padding()
                .background(Color.widgetBackground)
            MarketView(marketData: entry.marketData)
                .padding()
                .background(Color.secondaryWidgetBackground)
            SendReceiveButtons()
                .padding(.all, 10)
                .background(Color.secondaryWidgetBackground)
        }
    }

    private var mediumLayout: some View {
        HStack(spacing: 0) {
            WalletInformationView(allWalletsBalance: entry.allWalletsBalance, marketData: entry.marketData)
                .padding()
                .background(Color.widgetBackground)
            MarketView(marketData: entry.marketData)
                .padding()
                .background(Color.secondaryWidgetBackground)
        }
    }
}

struct WalletInformationAndMarketWidget: Widget {
    let kind: String = "WalletInformationAndMarketWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WalletInformationAndMarketWidgetProvider()) { entry in
            WalletInformationAndMarketWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Wallet and Market")
        .description("View your total wallet balance and network prices.")
        #if os(watchOS)
        .supportedFamilies([.accessoryRectangular])
        #else
        .supportedFamilies([.systemMedium, .systemLarge])
        #endif
        .contentMarginsDisabled()
    }
}

#Preview("System Medium", as: .systemMedium) {
    WalletInformationAndMarketWidget()
} timeline: {
    WalletInformationAndMarketWidgetEntry(date: Date(), marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$10,000", rate: 0), allWalletsBalance: WalletData(balance: 10000, latestTransactionTime: LatestTransaction(isUnconfirmed: false, epochValue: 1568804029000)))
}

#Preview("System Large", as: .systemLarge) {
    WalletInformationAndMarketWidget()
} timeline: {
    WalletInformationAndMarketWidgetEntry(date: Date(), marketData: MarketData(nextBlock: "26", sats: "9 134", price: "$10,000", rate: 0), allWalletsBalance: WalletData(balance: 10000, latestTransactionTime: LatestTransaction(isUnconfirmed: false, epochValue: 1568804029000)))
}
