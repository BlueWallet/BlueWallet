import CoreSpotlight
import CryptoKit
import Foundation
import React
import UniformTypeIdentifiers

@objc(SpotlightModule)
final class SpotlightModule: NSObject {
    private static let indexName = "io.bluewallet.search"
    static let activityType = "io.bluewallet.spotlight.open"
    private static let indexStateVersion = 1
    private static let indexedItemsKey = "SpotlightIndexedItems"
    private static let donatedActivityIdentifiersKey = "SpotlightDonatedActivityIdentifiers"
    static let pendingURLKey = "SpotlightPendingURL"
    static let activityIdentifierKey = "SpotlightItemIdentifier"

    private var currentActivity: NSUserActivity?

    static func moduleName() -> String! { "SpotlightModule" }
    static func requiresMainQueueSetup() -> Bool { false }

    private var index: CSSearchableIndex {
        CSSearchableIndex(name: Self.indexName, protectionClass: .complete)
    }

    @objc
    func replaceIndex(_ itemsJSON: String,
                      resolve: @escaping RCTPromiseResolveBlock,
                      reject: @escaping RCTPromiseRejectBlock) {
        guard let data = itemsJSON.data(using: .utf8) else {
            reject("spotlight_invalid_json", "Unable to encode Spotlight items", nil)
            return
        }

        do {
            let input = try JSONDecoder().decode([SpotlightItem].self, from: data)
            let encoder = JSONEncoder()
            encoder.outputFormatting = [.sortedKeys]
            var searchableItems: [String: CSSearchableItem] = [:]
            var fingerprints: [String: String] = [:]
            for item in input {
                guard let searchableItem = Self.searchableItem(from: item) else { continue }
                let encodedItem = try encoder.encode(item)
                searchableItems[item.identifier] = searchableItem
                fingerprints[item.identifier] = SHA256.hash(data: encodedItem).map { String(format: "%02x", $0) }.joined()
            }
            let newState = SpotlightIndexState(version: Self.indexStateVersion)
            let stateData = try JSONEncoder().encode(newState)
            let index = index
            let defaults = UserDefaults.standard
            let previousFingerprints = defaults.dictionary(forKey: Self.indexedItemsKey) as? [String: String]
            let identifiers = Set(fingerprints.keys)
            let removedIdentifiers = Set(previousFingerprints?.keys.map { $0 } ?? []).subtracting(identifiers)
            let changedItems = searchableItems.compactMap { identifier, item in
                previousFingerprints?[identifier] == fingerprints[identifier] ? nil : item
            }
            index.fetchLastClientState { previousStateData, stateError in
                if let stateError {
                    reject("spotlight_state_failed", stateError.localizedDescription, stateError)
                    return
                }
                let previousState = previousStateData.flatMap { try? JSONDecoder().decode(SpotlightIndexState.self, from: $0) }
                let canUpdateIncrementally = previousState?.version == Self.indexStateVersion && previousFingerprints != nil
                let items = canUpdateIncrementally ? changedItems : Array(searchableItems.values)
                index.beginBatch()

                let finishBatch: (Error?) -> Void = { operationError in
                    index.endBatch(withClientState: stateData) { batchError in
                        if let error = operationError ?? batchError {
                            reject("spotlight_index_failed", error.localizedDescription, error)
                        } else {
                            defaults.set(fingerprints, forKey: Self.indexedItemsKey)
                            resolve(searchableItems.count)
                        }
                    }
                }

                let indexItems: (@escaping (Error?) -> Void) -> Void = { completion in
                    guard !items.isEmpty else {
                        completion(nil)
                        return
                    }
                    index.indexSearchableItems(items, completionHandler: completion)
                }

                guard canUpdateIncrementally else {
                    index.deleteAllSearchableItems { error in
                        if let error {
                            finishBatch(error)
                        } else {
                            indexItems(finishBatch)
                        }
                    }
                    return
                }

                indexItems { indexError in
                    if let indexError {
                        finishBatch(indexError)
                        return
                    }
                    guard !removedIdentifiers.isEmpty else {
                        finishBatch(nil)
                        return
                    }
                    index.deleteSearchableItems(withIdentifiers: Array(removedIdentifiers)) { error in
                        finishBatch(error)
                    }
                }
            }
        } catch {
            reject("spotlight_invalid_json", error.localizedDescription, error)
        }
    }

    @objc
    func deleteIndex(_ resolve: @escaping RCTPromiseResolveBlock,
                     reject: @escaping RCTPromiseRejectBlock) {
        clearActivity()
        let defaults = UserDefaults.standard
        defaults.removeObject(forKey: Self.indexedItemsKey)
        let donatedIdentifiers = defaults.stringArray(forKey: Self.donatedActivityIdentifiersKey) ?? []
        if !donatedIdentifiers.isEmpty {
            NSUserActivity.deleteSavedUserActivities(withPersistentIdentifiers: donatedIdentifiers) {}
            defaults.removeObject(forKey: Self.donatedActivityIdentifiersKey)
        }
        index.deleteAllSearchableItems { error in
            if let error {
                reject("spotlight_delete_failed", error.localizedDescription, error)
            } else {
                resolve(nil)
            }
        }
    }

    @objc
    func popPendingURL(_ resolve: @escaping RCTPromiseResolveBlock,
                       reject: @escaping RCTPromiseRejectBlock) {
        let defaults = UserDefaults.standard
        let url = defaults.string(forKey: Self.pendingURLKey)
        defaults.removeObject(forKey: Self.pendingURLKey)
        resolve(url)
    }

    @objc
    func donateActivity(_ identifier: String, title: String) {
        guard !identifier.isEmpty, !title.isEmpty else { return }
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            self.currentActivity?.invalidate()

            let attributes = CSSearchableItemAttributeSet(contentType: .item)
            attributes.title = title
            attributes.relatedUniqueIdentifier = identifier

            let activity = NSUserActivity(activityType: Self.activityType)
            activity.title = title
            activity.userInfo = [Self.activityIdentifierKey: identifier]
            activity.contentAttributeSet = attributes
            activity.isEligibleForPrediction = true
            activity.isEligibleForSearch = false
            let persistentIdentifier = "spotlight:\(identifier)"
            activity.persistentIdentifier = NSUserActivityPersistentIdentifier(persistentIdentifier)
            activity.becomeCurrent()
            self.currentActivity = activity

            let defaults = UserDefaults.standard
            var identifiers = Set(defaults.stringArray(forKey: Self.donatedActivityIdentifiersKey) ?? [])
            identifiers.insert(persistentIdentifier)
            defaults.set(Array(identifiers), forKey: Self.donatedActivityIdentifiersKey)
        }
    }

    @objc
    func clearActivity() {
        DispatchQueue.main.async { [weak self] in
            self?.currentActivity?.invalidate()
            self?.currentActivity = nil
        }
    }

    private static func searchableItem(from item: SpotlightItem) -> CSSearchableItem? {
        guard !item.identifier.isEmpty, !item.title.isEmpty else { return nil }
        let attributes = CSSearchableItemAttributeSet(contentType: .item)
        attributes.title = item.title
        attributes.displayName = item.title
        attributes.contentDescription = item.description
        attributes.keywords = item.keywords
        attributes.textContent = ([item.title, item.description].compactMap { $0 } + item.keywords).joined(separator: " ")
        attributes.relatedUniqueIdentifier = item.relatedIdentifier
        attributes.rankingHint = NSNumber(value: item.rankingHint)
        attributes.userOwned = NSNumber(value: true)
        attributes.userCreated = NSNumber(value: item.userCreated ?? false)
        attributes.userCurated = NSNumber(value: item.userCurated ?? false)
        attributes.supportsNavigation = NSNumber(value: true)
        if let lastUsedAt = item.lastUsedAt {
            attributes.lastUsedDate = Date(timeIntervalSince1970: lastUsedAt)
        }
        let searchable = CSSearchableItem(
            uniqueIdentifier: item.identifier,
            domainIdentifier: item.domain,
            attributeSet: attributes
        )
        searchable.expirationDate = nil
        return searchable
    }
}

private struct SpotlightItem: Codable {
    let identifier: String
    let domain: String
    let title: String
    let description: String?
    let keywords: [String]
    let relatedIdentifier: String?
    let rankingHint: Int
    let lastUsedAt: TimeInterval?
    let userCreated: Bool?
    let userCurated: Bool?
}

private struct SpotlightIndexState: Codable {
    let version: Int
}
