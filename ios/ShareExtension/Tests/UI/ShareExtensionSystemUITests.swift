import XCTest

final class ShareExtensionSystemUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUp() {
        super.setUp()
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["--share-extension-ui-test-host"]
        app.launch()
        XCTAssertTrue(app.buttons["share-test.single-bitcoin"].waitForExistence(timeout: 10))
    }

    func testSingleBitcoinQRCodeOpensBlueWallet() throws {
        try openExtension(from: "share-test.single-bitcoin")
        let extensionUI = runningExtension()
        XCTAssertTrue(element("share-extension.decision", in: extensionUI).waitForExistence(timeout: 15))
        XCTAssertTrue(element("share-extension.qr-preview", in: extensionUI).exists)
        extensionUI.buttons["share-extension.open"].tap()
        let status = app.staticTexts["share-test.status"]
        XCTAssertTrue(status.waitForExistence(timeout: 10))
        expectation(for: NSPredicate(format: "label == %@", "Opened shared QR payload"), evaluatedWith: status)
        waitForExpectations(timeout: 10)
    }

    func testMultipleBitcoinQRCodesShowAddressDeck() throws {
        try openExtension(from: "share-test.multiple-bitcoin")
        let extensionUI = runningExtension()
        XCTAssertTrue(element("share-extension.address-deck", in: extensionUI).waitForExistence(timeout: 15))
        XCTAssertEqual(extensionUI.descendants(matching: .any).matching(identifier: "share-extension.address-card").count, 2)
        extensionUI.buttons["share-extension.close"].tap()
    }

    func testMixedQRCodesRequireSelection() throws {
        try openExtension(from: "share-test.mixed")
        let extensionUI = runningExtension()
        XCTAssertTrue(element("share-extension.selection", in: extensionUI).waitForExistence(timeout: 15))
        let choices = extensionUI.descendants(matching: .any).matching(identifier: "share-extension.selection-choice")
        XCTAssertEqual(choices.count, 2)
        choices.element(boundBy: 1).tap()
        XCTAssertTrue(choices.element(boundBy: 1).isSelected)
        extensionUI.buttons["share-extension.close"].tap()
    }

    func testImageWithoutQRCodeShowsFailureAndCloses() throws {
        try openExtension(from: "share-test.no-qr")
        let extensionUI = runningExtension()
        XCTAssertTrue(element("share-extension.failure", in: extensionUI).waitForExistence(timeout: 15))
        XCTAssertTrue(element("share-extension.help", in: extensionUI).exists)
        extensionUI.buttons["share-extension.close"].tap()
        XCTAssertTrue(app.buttons["share-test.no-qr"].waitForExistence(timeout: 10))
    }

    private func openExtension(from hostButton: String) throws {
        app.buttons[hostButton].tap()
        let activity = app.descendants(matching: .any).matching(NSPredicate(format: "label == 'BlueWallet'")).firstMatch
        guard activity.waitForExistence(timeout: 10) else {
            throw XCTSkip("The simulator did not expose BlueWallet in the system share sheet. Install the containing app and enable the extension once.")
        }
        activity.tap()
    }

    private func runningExtension() -> XCUIApplication {
        XCUIApplication(bundleIdentifier: "io.bluewallet.bluewallet.ShareExtension")
    }

    private func element(_ identifier: String, in application: XCUIApplication) -> XCUIElement {
        application.descendants(matching: .any).matching(identifier: identifier).firstMatch
    }
}
