//
//  BlueWalletUITests.swift
//  BlueWalletUITests
//
//  Created by Marcos Rodriguez on 12/6/23.
//  Copyright © 2023 BlueWallet. All rights reserved.
//

import XCTest

class BlueWalletUITests: XCTestCase {

    override func setUp() {
        super.setUp()
        continueAfterFailure = false
        XCUIApplication().launch()
    }

    func testAppLaunchesSuccessfully() {
        let app = XCUIApplication()
        
        // Check that the app is in the foreground
        XCTAssertEqual(app.state, .runningForeground)
    }
}
