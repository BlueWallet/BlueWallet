import Foundation
import Darwin

struct SharedImageStore {
    static let appGroup = "group.io.bluewallet.bluewallet"
    static let pendingImageKey = "pendingSharedImageFilename"
    static let sharedImagesDirectory = "shared-images"
    static let notificationName = CFNotificationName(
        "io.bluewallet.bluewallet.shared-image-imported" as CFString
    )

    let containerURL: URL
    let defaults: UserDefaults
    var fileManager: FileManager = .default
    var makeIdentifier: () -> String = { UUID().uuidString }
    var now: () -> Date = Date.init
    var orphanGracePeriod: TimeInterval = 60

    static func appGroupStore(fileManager: FileManager = .default) -> SharedImageStore? {
        guard let containerURL = fileManager.containerURL(forSecurityApplicationGroupIdentifier: appGroup),
              let defaults = UserDefaults(suiteName: appGroup) else {
            return nil
        }
        return SharedImageStore(containerURL: containerURL, defaults: defaults, fileManager: fileManager)
    }

    @discardableResult
    func importImage(at sourceURL: URL) throws -> URL {
        try withStoreLock {
            try importImageWhileLocked(at: sourceURL)
        }
    }

    private func importImageWhileLocked(at sourceURL: URL) throws -> URL {
        let directory = containerURL.appendingPathComponent(Self.sharedImagesDirectory, isDirectory: true)
        try fileManager.createDirectory(at: directory, withIntermediateDirectories: true)
        let previousName = defaults.string(forKey: Self.pendingImageKey)
        let validPreviousName = previousName.flatMap { name in
            name == (name as NSString).lastPathComponent ? name : nil
        }
        cleanupOrphanedImages(in: directory, excluding: Set([validPreviousName].compactMap { $0 }))

        let sourceExtension = sourceURL.pathExtension
            .lowercased()
            .filter { $0.isLetter || $0.isNumber }
        let fileName = [makeIdentifier(), sourceExtension.isEmpty ? nil : sourceExtension]
            .compactMap { $0 }
            .joined(separator: ".")
        let destinationURL = directory.appendingPathComponent(fileName)

        try fileManager.copyItem(at: sourceURL, to: destinationURL)

        if let previousName = validPreviousName,
           previousName != fileName {
            try? fileManager.removeItem(at: directory.appendingPathComponent(previousName))
        }

        defaults.set(fileName, forKey: Self.pendingImageKey)
        defaults.synchronize()
        return destinationURL
    }

    func pendingImageURL() throws -> URL? {
        try withStoreLock { pendingImageURLWhileLocked() }
    }

    private func pendingImageURLWhileLocked() -> URL? {
        guard let requestedName = defaults.string(forKey: Self.pendingImageKey) else {
            return nil
        }

        guard !requestedName.isEmpty,
              requestedName == (requestedName as NSString).lastPathComponent else {
            clearPendingImage()
            return nil
        }

        let imageURL = containerURL
            .appendingPathComponent(Self.sharedImagesDirectory, isDirectory: true)
            .appendingPathComponent(requestedName)
        guard fileManager.fileExists(atPath: imageURL.path) else {
            clearPendingImage()
            return nil
        }
        return imageURL
    }

    func consumePendingImageURL() throws -> URL? {
        try withStoreLock {
            let imageURL = pendingImageURLWhileLocked()
            let directory = containerURL.appendingPathComponent(Self.sharedImagesDirectory, isDirectory: true)
            cleanupOrphanedImages(in: directory, excluding: Set([imageURL?.lastPathComponent].compactMap { $0 }))
            guard let imageURL else { return nil }
            // A queued image can be old. Give its consumer the full grace period
            // before a later import is allowed to sweep it as an orphan.
            try fileManager.setAttributes([.modificationDate: now()], ofItemAtPath: imageURL.path)
            clearPendingImage()
            return imageURL
        }
    }

    private func withStoreLock<T>(_ operation: () throws -> T) throws -> T {
        // The app and extension must serialize the entire read/modify/write,
        // including replacement-file deletion. A defaults comparison alone is
        // not atomic across processes. Never unlink this shared lock file.
        let lockURL = containerURL.appendingPathComponent(".shared-images.lock")
        let descriptor = open(lockURL.path, O_CREAT | O_RDWR | O_CLOEXEC, S_IRUSR | S_IWUSR)
        guard descriptor >= 0 else { throw POSIXError(POSIXErrorCode(rawValue: errno) ?? .EIO) }
        defer { close(descriptor) }
        while flock(descriptor, LOCK_EX) != 0 {
            if errno != EINTR { throw POSIXError(POSIXErrorCode(rawValue: errno) ?? .EIO) }
        }
        defer { flock(descriptor, LOCK_UN) }
        defaults.synchronize()
        return try operation()
    }

    private func cleanupOrphanedImages(in directory: URL, excluding excludedNames: Set<String>) {
        let keys: Set<URLResourceKey> = [.contentModificationDateKey, .isRegularFileKey]
        guard let files = try? fileManager.contentsOfDirectory(
            at: directory,
            includingPropertiesForKeys: Array(keys),
            options: [.skipsHiddenFiles]
        ) else {
            return
        }

        let cutoff = now().addingTimeInterval(-orphanGracePeriod)
        for fileURL in files where !excludedNames.contains(fileURL.lastPathComponent) {
            guard let values = try? fileURL.resourceValues(forKeys: keys),
                  values.isRegularFile == true,
                  let modifiedAt = values.contentModificationDate,
                  modifiedAt <= cutoff else {
                continue
            }
            try? fileManager.removeItem(at: fileURL)
        }
    }

    private func clearPendingImage() {
        defaults.removeObject(forKey: Self.pendingImageKey)
        defaults.synchronize()
    }
}
