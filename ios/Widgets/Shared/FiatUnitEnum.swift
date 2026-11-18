import AppIntents
import Foundation

@available(iOS 16.0, *)
struct FiatCurrency: AppEntity, Hashable, Identifiable {
    let id: String
    let name: String
    let source: String

    init(unit: FiatUnit) {
        id = unit.endPointKey
        name = unit.country ?? unit.endPointKey
        source = unit.source
    }

    fileprivate init(id: String, name: String, source: String) {
        self.id = id
        self.name = name
        self.source = source
    }

    static var typeDisplayRepresentation: TypeDisplayRepresentation {
        TypeDisplayRepresentation(name: "Currency")
    }

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(
            title: "\(id) — \(name)",
            subtitle: "Source: \(source)"
        )
    }

    static var defaultQuery = FiatCurrencyQuery()
}

@available(iOS 16.0, *)
struct FiatCurrencyQuery: EntityQuery {
    func entities(for identifiers: [FiatCurrency.ID]) async throws -> [FiatCurrency] {
        let currenciesByID = Dictionary(uniqueKeysWithValues: FiatCurrency.all.map { ($0.id, $0) })
        return identifiers.compactMap { currenciesByID[$0] }
    }

    func suggestedEntities() async throws -> [FiatCurrency] {
        FiatCurrency.all
    }

    func currency(for code: String) -> FiatCurrency? {
        FiatCurrency.all.first { $0.id == code.uppercased() }
    }

    var defaultCurrency: FiatCurrency {
        currency(for: "USD") ?? FiatCurrency(id: "USD", name: "US Dollar", source: "Kraken")
    }
}

@available(iOS 16.0, *)
private extension FiatCurrency {
    static let all: [FiatCurrency] = {
        Bundle.main.decode([String: FiatUnit].self, from: "fiatUnits.json")
            .values
            .map(FiatCurrency.init(unit:))
            .sorted { $0.name.localizedStandardCompare($1.name) == .orderedAscending }
    }()
}
