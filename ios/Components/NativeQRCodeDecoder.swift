import Foundation

@objc(SharedImageModule)
final class SharedImageModule: NSObject, NativeSharedImageModuleSpec {
    @objc static func moduleName() -> String! { "SharedImageModule" }
    @objc static func requiresMainQueueSetup() -> Bool { false }

    @objc(popPendingImage:reject:)
    func popPendingImage(
        _ resolve: RCTPromiseResolveBlock,
        reject: RCTPromiseRejectBlock
    ) {
        guard let defaults = UserDefaults(suiteName: "group.io.bluewallet.bluewallet") else {
            reject("shared_storage_unavailable", "BlueWallet shared storage is unavailable.", nil)
            return
        }

        let value = defaults.string(forKey: "pendingSharedQRCode")
        defaults.removeObject(forKey: "pendingSharedQRCode")
        resolve(value.map { ["value": $0] })
    }
}
