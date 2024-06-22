import Foundation
import SwiftData

@MainActor
class MarketDataManager: ObservableObject {
    @Published var marketData: MarketData?

    private let container: ModelContainer

  init() async {
        container = try! ModelContainer(for: MarketData.self)
        await fetchMarketData()
    }

    func saveMarketData(_ data: MarketData) async {
        do {
            let context = container.mainContext
            context.insert(data)
            try context.save()
            self.marketData = data
        } catch {
            print("Failed to save MarketData: \(error)")
        }
    }

    func fetchMarketData() async {
        do {
            let fetchRequest = FetchDescriptor<MarketData>()
            let results = try container.mainContext.fetch(fetchRequest)
            self.marketData = results.first
        } catch {
            print("Failed to fetch MarketData: \(error)")
        }
    }
}
