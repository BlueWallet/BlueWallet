import XCTest

final class ImageShareExtensionUITests: XCTestCase {
    private let bitcoinAddress = "1BoatSLRHtKNngkdXEeobR76b53LETtpyT"

    private var blueWallet: XCUIApplication {
        XCUIApplication()
    }

    private var photos: XCUIApplication {
        #if targetEnvironment(macCatalyst)
        XCUIApplication(bundleIdentifier: "com.apple.Photos")
        #else
        XCUIApplication(bundleIdentifier: "com.apple.mobileslideshow")
        #endif
    }

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testBitcoinQRCodeCanBeSharedIntoBlueWallet() throws {
        createBitcoinWallet()
        blueWallet.terminate()
        photos.launch()

        // Photos can show a one-time What's New sheet after a simulator runtime update.
        let continueButton = photos.buttons["Continue"]
        if continueButton.waitForExistence(timeout: 2) {
            continueButton.tap()
        }

        // Query the photo-grid identifier directly. photos.images.firstMatch also
        // matches the Library tab icon, which is not tappable as a photo.
        let photoTiles = photos.images.matching(identifier: "PXGGridLayout-Info")
        guard photoTiles.firstMatch.waitForExistence(timeout: 10), photoTiles.count > 0 else {
            throw XCTSkip("Seed the simulator with the generated Bitcoin QR image before running this test")
        }
        photoTiles.element(boundBy: photoTiles.count - 1).tap()

        let shareButton = photos.buttons.matching(
            NSPredicate(format: "label == %@ OR identifier == %@", "Share", "PXBarItemIdentifierShare")
        ).firstMatch
        XCTAssertTrue(shareButton.waitForExistence(timeout: 5), "Photos should expose its share button")
        shareButton.tap()

        let blueWalletShareService = photos.cells.matching(identifier: "shareCell")
            .matching(NSPredicate(format: "label == %@", "BlueWallet"))
            .firstMatch
        XCTAssertTrue(
            blueWalletShareService.waitForExistence(timeout: 10),
            "BlueWallet should be offered by the iOS share sheet for images"
        )
        blueWalletShareService.tap()

        // The extension is deliberately transport-only. Launch the containing app
        // so it consumes and processes the pending image through its launch options.
        // The extension has no UI or completion signal exposed to the containing
        // app. Give its single file-copy operation time to finish before launch.
        Thread.sleep(forTimeInterval: 2)
        blueWallet.launch()

        let addressInput = blueWallet.textFields["AddressInput"]
        XCTAssertTrue(
            addressInput.waitForExistence(timeout: 20),
            "A valid Bitcoin QR image should open BlueWallet's send flow"
        )
        XCTAssertEqual(addressInput.value as? String, bitcoinAddress)
    }

    private func createBitcoinWallet() {
        let app = blueWallet
        app.launch()

        let walletsList = app.descendants(matching: .any)["WalletsList"]
        XCTAssertTrue(walletsList.waitForExistence(timeout: 20), "BlueWallet should open its wallet list")

        let createWallet = app.descendants(matching: .any)["CreateAWallet"]
        if !createWallet.isHittable {
            walletsList.swipeLeft()
        }
        XCTAssertTrue(createWallet.waitForExistence(timeout: 5), "The wallet carousel should expose Create a Wallet")
        createWallet.tap()

        let walletName = app.textFields["WalletNameInput"]
        XCTAssertTrue(walletName.waitForExistence(timeout: 10), "The wallet creation form should open")
        walletName.tap()
        walletName.typeText("Image Share Test")

        let bitcoinWalletType = app.descendants(matching: .any)["ActivateBitcoinButton"]
        XCTAssertTrue(bitcoinWalletType.waitForExistence(timeout: 5))
        bitcoinWalletType.tap()

        let create = app.descendants(matching: .any)["Create"]
        XCTAssertTrue(create.waitForExistence(timeout: 5))
        create.tap()

        let backupScreen = app.descendants(matching: .any)["PleaseBackupScrollView"]
        XCTAssertTrue(backupScreen.waitForExistence(timeout: 20), "The Bitcoin wallet should be created")
        let acknowledgeBackup = app.descendants(matching: .any)["PleasebackupOk"]
        if !acknowledgeBackup.isHittable {
            backupScreen.swipeUp()
        }
        XCTAssertTrue(acknowledgeBackup.waitForExistence(timeout: 5))
        acknowledgeBackup.tap()
        XCTAssertTrue(walletsList.waitForExistence(timeout: 10), "Wallet creation should return to the wallet list")
    }
}
