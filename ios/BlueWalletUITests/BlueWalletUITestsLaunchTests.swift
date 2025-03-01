//
//  BlueWalletUITestsLaunchTests.swift
//  BlueWalletUITests
//
//  Created by Marcos Rodriguez on 3/1/25.
//  Copyright © 2025 BlueWallet. All rights reserved.
//

import XCTest

final class BlueWalletUITestsLaunchTests: XCTestCase {

    override class var runsForEachTargetApplicationUIConfiguration: Bool {
        true
    }

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    @MainActor
    func testLaunch() throws {
        let app = XCUIApplication()
        app.launch()

        // Wait for WalletsList to appear before taking screenshot
        let walletsList = app.otherElements["WalletsList"]
        walletsList.waitForExistence(timeout: 10)

        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = "Launch Screen"
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
