//
//  BlueWalletUITest.swift
//  BlueWalletUITests
//
//  Created by Marcos Rodriguez on 2/28/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//

import XCTest

final class BlueWalletUITest: XCTestCase {
  
  override func setUpWithError() throws {
        continueAfterFailure = false
    }

    override func tearDownWithError() throws {
        // Put teardown code here. This method is called after the invocation of each test method in the class.
    }

    func testAppLaunchesAndShowsSettingsButton() throws {
        let app = XCUIApplication()
        app.launch()

        let settingsButton = app.buttons["SettingsButton"]

        // Wait for the settings button to appear to make sure the app has finished launching and is displaying its initial UI.
        let exists = NSPredicate(format: "exists == true")
        expectation(for: exists, evaluatedWith: settingsButton, handler: nil)
        
        // Wait for a maximum of 10 seconds for the settings button to appear
        waitForExpectations(timeout: 10, handler: nil)

        // Assert that the settings button is not only present but also hittable (visible and interactable)
        XCTAssertTrue(settingsButton.isHittable, "The settings button should be visible and interactable")
    }
}
