//
//  BlueWalletUITests.swift
//  BlueWalletUITests
//
//  Created by Marcos Rodriguez on 12/6/23.
//  Copyright © 2023 BlueWallet. All rights reserved.
//

import XCTest
import UIKit

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

    /// Opt in on a fresh iPad simulator or isolated Mac Catalyst test app.
    func testNativeMenuKeyboardAndAccessibility() throws {
        guard ProcessInfo.processInfo.environment["HEADER_MENU_UI_AUDIT"] == "1" else {
            throw XCTSkip("Set TEST_RUNNER_HEADER_MENU_UI_AUDIT=1 to run the native menu audit")
        }
        let wallets = app.descendants(matching: .any).matching(identifier: "Wallets").firstMatch
        XCTAssertTrue(wallets.waitForExistence(timeout: 120), "Wallet overview must finish loading")
        XCTAssertFalse(app.buttons["HeaderMenuButton"].exists)
        if #available(iOS 17.0, macCatalyst 17.0, *) {
            try app.performAccessibilityAudit(for: [.sufficientElementDescription, .elementDetection])
        }

        // Sending is unavailable without a selected wallet; its shortcut must do nothing.
        app.typeKey("s", modifierFlags: [.command, .shift])
        XCTAssertTrue(wallets.exists)
        app.typeKey("a", modifierFlags: [.command, .shift])
        let close = app.buttons["NavigationCloseButton"]
        XCTAssertTrue(close.waitForExistence(timeout: 30), "Close stays accessible in the header")
        if #available(iOS 17.0, macCatalyst 17.0, *) {
            try app.performAccessibilityAudit(for: [.sufficientElementDescription, .elementDetection])
        }
        // Import belongs to the overview, so it is disabled while Add Wallet is active.
        app.typeKey("i", modifierFlags: [.command])
        XCTAssertTrue(close.exists)
        app.typeKey("w", modifierFlags: [.command])
        XCTAssertTrue(wallets.waitForExistence(timeout: 30))
        XCTAssertFalse(close.exists)

        app.typeKey("i", modifierFlags: [.command])
        let importClose = app.buttons["Close"].firstMatch
        XCTAssertTrue(importClose.waitForExistence(timeout: 30))
        app.typeKey(XCUIKeyboardKey.escape.rawValue, modifierFlags: [])
        XCTAssertTrue(wallets.waitForExistence(timeout: 30))
        XCTAssertFalse(importClose.exists)

        #if targetEnvironment(macCatalyst)
        let walletMenu = app.menuBars.menuBarItems["Wallet"]
        XCTAssertTrue(walletMenu.exists)
        walletMenu.click()
        let send = app.menuItems["Send…"]
        XCTAssertTrue(send.exists)
        XCTAssertFalse(send.isEnabled)
        #endif
    }

}


@MainActor
final class HeaderMenuNativeTests: XCTestCase {
    func testNativeStatesShortcutsAndDisabledDispatch() throws {
        let controller = MenuElementsController()
        controller.setHeaderMenu(#"""
        [{"id":"category:recipients","title":"Recipients","children":[
          {"id":"header:send:AddRecipient","title":"Add Recipient","state":true,
           "shortcut":{"input":"n","modifiers":["command","shift"]}},
          {"id":"header:send:ExportTransaction","title":"Export…","disabled":true,
           "shortcut":{"input":"e","modifiers":["command","shift"]}},
          {"id":"header:send:remove","title":"Remove Recipient","destructive":true,"state":"mixed"},
          {"id":"header:send:NavigationCloseButton","title":"Close",
           "shortcut":{"input":"w","modifiers":["command"]}}
        ]}]
        """#)
        let menu = try XCTUnwrap(controller.headerMenuElements().first as? UIMenu)
        XCTAssertEqual(menu.title, "Recipients")
        let add = try XCTUnwrap(menu.children[0] as? UIKeyCommand)
        XCTAssertEqual(add.input, "n")
        XCTAssertEqual(add.modifierFlags, [.command, .shift])
        XCTAssertEqual(add.state, .on)
        XCTAssertEqual(add.propertyList as? String, "header:send:AddRecipient")
        let export = try XCTUnwrap(menu.children[1] as? UIKeyCommand)
        XCTAssertTrue(export.attributes.contains(.disabled))
        let remove = try XCTUnwrap(menu.children[2] as? UIAction)
        XCTAssertEqual(remove.state, .mixed)
        XCTAssertTrue(remove.attributes.contains(.destructive))
        XCTAssertTrue(controller.isHeaderActionEnabled("header:send:AddRecipient"))
        XCTAssertFalse(controller.isHeaderActionEnabled("header:send:ExportTransaction"))
        XCTAssertEqual(controller.closeKeyCommands().first?.input, UIKeyCommand.inputEscape)

        var dispatched: [String] = []
        let observer = NotificationCenter.default.addObserver(forName: Notification.Name("BlueWalletMenuAction"),
                                                              object: controller, queue: nil) { notification in
            if let id = notification.userInfo?["action"] as? String { dispatched.append(id) }
        }
        defer { NotificationCenter.default.removeObserver(observer) }
        controller.perform("header:send:ExportTransaction")
        controller.perform("header:send:AddRecipient")
        XCTAssertEqual(dispatched, ["header:send:AddRecipient"])
        controller.setHeaderMenu("[]")
        controller.perform("header:send:AddRecipient")
        XCTAssertEqual(dispatched.count, 1)
        XCTAssertTrue(controller.closeKeyCommands().isEmpty)
    }
}
