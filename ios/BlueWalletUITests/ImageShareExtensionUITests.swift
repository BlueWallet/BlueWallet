import XCTest

final class ImageShareExtensionUITests: XCTestCase {
    private let photos = XCUIApplication(bundleIdentifier: "com.apple.mobileslideshow")

    override func setUpWithError() throws {
        continueAfterFailure = false
        #if targetEnvironment(macCatalyst)
        throw XCTSkip("Image share-service UI coverage is intentionally iOS-only")
        #endif
    }

    func testBlueWalletIsOfferedForSharingAnImage() throws {
        photos.launch()

        let firstPhoto = photos.images.element(boundBy: 0)
        guard firstPhoto.waitForExistence(timeout: 10) else {
            throw XCTSkip("Add an image to the simulator photo library before running this test")
        }
        firstPhoto.tap()

        let shareButton = photos.buttons.matching(
            NSPredicate(format: "label == %@ OR identifier == %@", "Share", "PXBarItemIdentifierShare")
        ).firstMatch
        XCTAssertTrue(shareButton.waitForExistence(timeout: 5), "Photos should expose its share button")
        shareButton.tap()

        let blueWalletShareService = photos.descendants(matching: .any)["BlueWallet"]
        XCTAssertTrue(
            blueWalletShareService.waitForExistence(timeout: 10),
            "BlueWallet should be offered by the iOS share sheet for images"
        )
    }
}
