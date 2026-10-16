import Foundation

@objc(SharedImageModule)
final class SharedImageModule: NSObject, NativeSharedImageModuleBridgeSpec {
    private let maximumPayloadAge: TimeInterval = 120
    private let valueKey = "pendingSharedQRCode"
    private let valuesKey = "pendingSharedQRValues"
    private let createdAtKey = "pendingSharedQRCodeCreatedAt"
    private let nonceKey = "pendingSharedQRCodeNonce"
    private let versionKey = "pendingSharedQRCodeVersion"

    @objc static func moduleName() -> String! { "SharedImageModule" }
    @objc static func requiresMainQueueSetup() -> Bool { false }

    @objc(decodeImage:resolve:reject:)
    func decodeImage(
        _ base64Image: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        DispatchQueue.global(qos: .userInitiated).async {
            guard let data = Data(base64Encoded: base64Image, options: .ignoreUnknownCharacters) else {
                reject("invalid_image", "The selected image could not be read.", nil)
                return
            }

            do {
                resolve(try QRCodeImageDecoder.decode(data: data))
            } catch {
                reject("unreadable_image", "The selected image could not be read.", error)
            }
        }
    }

    @objc(popPendingImage:reject:)
    func popPendingImage(
        _ resolve: RCTPromiseResolveBlock,
        reject: RCTPromiseRejectBlock
    ) {
        guard let defaults = UserDefaults(suiteName: "group.io.bluewallet.bluewallet") else {
            reject("shared_storage_unavailable", "BlueWallet shared storage is unavailable.", nil)
            return
        }

        defaults.synchronize()
        let value = defaults.string(forKey: valueKey)
        let values = defaults.stringArray(forKey: valuesKey)
        let createdAt = defaults.double(forKey: createdAtKey)
        let nonce = defaults.string(forKey: nonceKey)
        let version = defaults.integer(forKey: versionKey)
        defaults.removeObject(forKey: valueKey)
        defaults.removeObject(forKey: valuesKey)
        defaults.removeObject(forKey: createdAtKey)
        defaults.removeObject(forKey: nonceKey)
        defaults.removeObject(forKey: versionKey)

        let age = Date().timeIntervalSince1970 - createdAt
        guard nonce != nil, createdAt > 0, age >= -5, age <= maximumPayloadAge else {
            resolve(nil)
            return
        }
        if version == 2, let values, !values.isEmpty {
            resolve(["values": values])
        } else if version == 1, let value {
            resolve(["value": value])
        } else {
            resolve(nil)
        }
    }
}
