//
//  Utilities.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 6/4/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//

import Foundation

func percentile(_ arr: [Double], p: Double) -> Double {
    guard !arr.isEmpty else { return 0 }
    guard p >= 0, p <= 1 else { fatalError("Percentile must be between 0 and 1") }

    if p == 0 { return arr.first! }
    if p == 1 { return arr.last! }

    let index = Double(arr.count - 1) * p
    let lower = Int(floor(index))
    let upper = lower + 1
    let weight = index - Double(lower)

    if upper >= arr.count { return arr[lower] }
    return arr[lower] * (1 - weight) + arr[upper] * weight
}

func calcEstimateFeeFromFeeHistogram(numberOfBlocks: Int, feeHistogram: [[Double]]) -> Double {
    var totalVsize = 0.0
    var histogramToUse: [(fee: Double, vsize: Double)] = []

    for h in feeHistogram {
        var (fee, vsize) = (h[0], h[1])
        var timeToStop = false

        if totalVsize + vsize >= 1000000.0 * Double(numberOfBlocks) {
            vsize = 1000000.0 * Double(numberOfBlocks) - totalVsize
            timeToStop = true
        }

        histogramToUse.append((fee, vsize))
        totalVsize += vsize
        if timeToStop { break }
    }

    var histogramFlat: [Double] = []
    for hh in histogramToUse {
        histogramFlat += Array(repeating: hh.fee, count: Int(hh.vsize / 25000))
    }

    histogramFlat.sort()

    return max(2, percentile(histogramFlat, p: 0.5))
}


var numberFormatter: NumberFormatter {
    let formatter = NumberFormatter()
    formatter.numberStyle = .decimal
    formatter.maximumFractionDigits = 0
    formatter.locale = Locale.current
    return formatter
}

extension Double {
    func formattedPriceString() -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: self)) ?? "--"
    }

    func formattedCurrencyString() -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.maximumFractionDigits = 0
        formatter.currencySymbol = fiatUnit(currency: Currency.getUserPreferredCurrency())?.symbol
        return formatter.string(from: NSNumber(value: self)) ?? "--"
    }
}

extension Date {
    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: self)
    }
}
