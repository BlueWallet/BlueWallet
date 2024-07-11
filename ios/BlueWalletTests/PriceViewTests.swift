//
//  PriceViewTests.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 7/10/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//

import XCTest
import SwiftUI
import WidgetKit

@testable import BlueWallet

class PriceViewTests: XCTestCase {

    func testAccessoryCircularView() {
        guard #available(iOS 16.0, *) else { return }
        let entry = PriceWidgetEntry(date: Date(), family: .accessoryCircular, currentMarketData: MockData.currentMarketData, previousMarketData: MockData.previousMarketData)
        let view = PriceView(entry: entry)
        let exp = expectation(description: "Test Circular View")
        DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) {
            XCTAssertNotNil(view.body)
            exp.fulfill()
        }
        waitForExpectations(timeout: 10.0, handler: nil)
    }

    func testAccessoryInlineView() {
        guard #available(iOS 16.0, *) else { return }
        let entry = PriceWidgetEntry(date: Date(), family: .accessoryInline, currentMarketData: MockData.currentMarketData, previousMarketData: MockData.previousMarketData)
        let view = PriceView(entry: entry)
        let exp = expectation(description: "Test Inline View")
        DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) {
            XCTAssertNotNil(view.body)
            exp.fulfill()
        }
        waitForExpectations(timeout: 10.0, handler: nil)
    }

    func testAccessoryRectangularView() {
        guard #available(iOS 16.0, *) else { return }
        let entry = PriceWidgetEntry(date: Date(), family: .accessoryRectangular, currentMarketData: MockData.currentMarketData, previousMarketData: MockData.previousMarketData)
        let view = PriceView(entry: entry)
        let exp = expectation(description: "Test Rectangular View")
        DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) {
            XCTAssertNotNil(view.body)
            exp.fulfill()
        }
        waitForExpectations(timeout: 10.0, handler: nil)
    }

    func testDefaultView() {
        let entry = PriceWidgetEntry(date: Date(), family: .systemSmall, currentMarketData: MockData.currentMarketData, previousMarketData: MockData.previousMarketData)
        let view = PriceView(entry: entry)
        let exp = expectation(description: "Test Default View")
        DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) {
            XCTAssertNotNil(view.body)
            exp.fulfill()
        }
        waitForExpectations(timeout: 10.0, handler: nil)
    }

    func testNoChangeCircularView() {
        guard #available(iOS 16.0, *) else { return }
        let entry = PriceWidgetEntry(date: Date(), family: .accessoryCircular, currentMarketData: MockData.noChangeMarketData, previousMarketData: MockData.noChangeMarketData)
        let view = PriceView(entry: entry)
        let exp = expectation(description: "Test No Change Circular View")
        DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) {
            XCTAssertNotNil(view.body)
            exp.fulfill()
        }
        waitForExpectations(timeout: 10.0, handler: nil)
    }
}
