//
//  BlueWalletUITests.swift
//  BlueWalletUITests
//
//  Created by Marcos Rodriguez on 12/6/23.
//  Copyright © 2023 BlueWallet. All rights reserved.
//

import XCTest

class BlueWalletUITests: XCTestCase {

    var app: XCUIApplication!

    override func setUp() {
        super.setUp()
        continueAfterFailure = false

        // Initialize the XCUIApplication instance
        app = XCUIApplication()
        
        // Add a launch argument to differentiate between Mac Catalyst and iOS
        #if targetEnvironment(macCatalyst)
        app.launchArguments.append("--macCatalyst")
        #else
        app.launchArguments.append("--iOS")
        #endif

        app.launch()
    }

    func testAppLaunchesSuccessfully() {
        XCTAssertEqual(app.state, .runningForeground, "App should be running in the foreground")

        #if targetEnvironment(macCatalyst)
        XCTAssertTrue(app.windows.count > 0, "There should be at least one window in Mac Catalyst")
        #else
        XCTAssertTrue(app.buttons.count > 0, "There should be at least one button on iOS")
        #endif
    }
}
