//
//  BlueWalletUITests.swift
//  BlueWalletUITests
//
//  Created by Marcos Rodriguez on 3/1/25.
//  Copyright © 2025 BlueWallet. All rights reserved.
//

import XCTest

final class BlueWalletUITests: XCTestCase {

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    override func tearDownWithError() throws {
    }

    @MainActor
    func testWalletsListAppears() throws {
        let app = XCUIApplication()
        app.launch()
        
        let walletsList = app.otherElements["WalletsList"]
        XCTAssertTrue(walletsList.waitForExistence(timeout: 10), "WalletsList should appear within 10 seconds")
        XCTAssertTrue(walletsList.exists)
    }

    @MainActor
    func testLaunchPerformance() throws {
        if #available(macOS 10.15, iOS 13.0, tvOS 13.0, watchOS 7.0, *) {
            measure(metrics: [XCTApplicationLaunchMetric()]) {
                XCUIApplication().launch()
            }
        }
    }
}
