import CoreSpotlight
import Foundation
import React
import UniformTypeIdentifiers

@objc(SpotlightModule)
final class SpotlightModule: NSObject {
    private static let indexName = "io.bluewallet.search"
    static let pendingURLKey = "SpotlightPendingURL"

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
            let items = input.compactMap(Self.searchableItem)
            index.deleteAllSearchableItems { [index] error in
                if let error {
                    reject("spotlight_delete_failed", error.localizedDescription, error)
                    return
                }
                guard !items.isEmpty else {
                    resolve(0)
                    return
                }
                index.indexSearchableItems(items) { error in
                    if let error {
                        reject("spotlight_index_failed", error.localizedDescription, error)
                    } else {
                        resolve(items.count)
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

    private static func searchableItem(from item: SpotlightItem) -> CSSearchableItem? {
        guard let url = URL(string: item.url), !item.identifier.isEmpty, !item.title.isEmpty else { return nil }
        let attributes = CSSearchableItemAttributeSet(contentType: .item)
        attributes.title = item.title
        attributes.displayName = item.title
        attributes.contentDescription = item.description
        attributes.keywords = item.keywords
        attributes.textContent = ([item.title, item.description].compactMap { $0 } + item.keywords).joined(separator: " ")
        attributes.contentURL = url
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

private struct SpotlightItem: Decodable {
    let identifier: String
    let domain: String
    let title: String
    let description: String?
    let keywords: [String]
    let url: String
    let relatedIdentifier: String?
    let rankingHint: Int
    let lastUsedAt: TimeInterval?
    let userCreated: Bool?
    let userCurated: Bool?
}
