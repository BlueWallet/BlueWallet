import SwiftUI
import SwiftData
import Combine

// Extend the Wallet model to store balance in local currency
extension Wallet {
    var balanceInLocalCurrency: String {
        let exchangeRate = WatchDataSource.shared.exchangeRate ?? 1.0
        if let balanceInBTC = Double(balance.dropFirst()), wallet.preferredBalanceUnit == .LOCAL_CURRENCY {
            return "\(balanceInBTC * exchangeRate)"
        }
        return balance
    }
}

// Extend the WalletTransaction model to store amount in local currency
extension WalletTransaction {
    var amountInLocalCurrency: String {
        let exchangeRate = WatchDataSource.shared.exchangeRate ?? 1.0
        if let amountInBTC = Double(amount.dropFirst()), wallet.preferredBalanceUnit == .LOCAL_CURRENCY {
            return "\(amountInBTC * exchangeRate)"
        }
        return amount
    }
}

@MainActor
class WatchDataSource: ObservableObject {
    static let shared = WatchDataSource()
    @Published var wallets: [Wallet] = []
    @Published var exchangeRate: Double?
    var companionWalletsInitialized = false
    private var context: ModelContext!

    init() {
        initializeModelContext()
        fetchExchangeRate()
    }

    private func initializeModelContext() {
        do {
            let container = try ModelContainer(for: Wallet.self, WalletTransaction.self, MarketData.self)
            self.context = ModelContext(container)
            loadWallets()
        } catch {
            print("ModelContainer initialization failed: \(error). Deleting existing data.")
            deleteExistingData()
            do {
                let container = try ModelContainer(for: Wallet.self, WalletTransaction.self, MarketData.self)
                self.context = ModelContext(container)
                loadWallets()
            } catch {
                fatalError("Re-initialization failed: \(error)")
            }
        }
    }

    private func deleteExistingData() {
        let fileManager = FileManager.default
        if let url = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first?.appendingPathComponent("default.store") {
            do {
                if fileManager.fileExists(atPath: url.path) {
                    try fileManager.removeItem(at: url)
                    print("Existing data deleted.")
                }
            } catch {
                print("Failed to delete existing data: \(error)")
            }
        }
    }

    func loadWallets() {
        Task {
            do {
                let fetchRequest = FetchDescriptor<Wallet>()
                let fetchedWallets = try context.fetch(fetchRequest)
                DispatchQueue.main.async {
                    self.wallets = fetchedWallets
                }
            } catch {
                print("Failed to fetch wallets: \(error)")
            }
        }
    }

    func initializeSampleData() {
        do {
            let sampleWallets = SampleData.createAllSampleWallets()
            sampleWallets.forEach { wallet in
                context.insert(wallet)
            }
            try context.save()
        } catch {
            print("Failed to insert sample data: \(error)")
        }
    }

    func handleLightningInvoiceCreateRequest(walletIndex: Int, amount: Double, description: String?) async throws -> String {
        let wallet = wallets[walletIndex]
        // Assuming the wallet has a method to create an invoice.
        let invoiceRequest = try wallet.createInvoice(amount: amount, description: description)
        return invoiceRequest
    }

    func processWalletsData(walletsInfo: [String: Any]) {
        Task {
            var newWallets: [Wallet] = []
            for entry in walletsInfo[WatchDataKeys.wallets.rawValue] as? [[String: Any]] ?? [] {
                var wallet = Wallet(
                    id: entry[WatchDataKeys.id.rawValue] as? UUID ?? UUID(),
                    label: entry[WatchDataKeys.label.rawValue] as? String ?? "",
                    balance: entry[WatchDataKeys.balance.rawValue] as? String ?? "",
                    type: entry[WatchDataKeys.type.rawValue] as? WalletType ?? .SegwitNative,
                    preferredBalanceUnit: entry[WatchDataKeys.preferredBalanceUnit.rawValue] as? BitcoinUnit ?? .BTC,
                    receiveAddress: entry[WatchDataKeys.receiveAddress.rawValue] as? String ?? "",
                    xpub: entry[WatchDataKeys.xpub.rawValue] as? String,
                    hideBalance: entry[WatchDataKeys.hideBalance.rawValue] as? Bool ?? false,
                    paymentCode: entry[WatchDataKeys.paymentCode.rawValue] as? String,
                    createdAt: entry[WatchDataKeys.createdAt.rawValue] as? Date ?? Date()
                )

                let transactionsData = entry[WatchDataKeys.transactions.rawValue] as? [[String: Any]] ?? []
                var newTransactions: [WalletTransaction] = []
                for txData in transactionsData {
                    let transaction = WalletTransaction(
                        id: UUID(),
                        time: txData[WatchDataKeys.time.rawValue] as? String ?? "",
                        memo: txData[WatchDataKeys.memo.rawValue] as? String ?? "",
                        amount: txData[WatchDataKeys.amount.rawValue] as? String ?? "",
                        type: txData[WatchDataKeys.type.rawValue] as? WalletTransactionType ?? .Received,
                        wallet: wallet
                    )
                    newTransactions.append(transaction)
                }
                wallet.addTransactions(newTransactions)
                newWallets.append(wallet)
            }
            do {
                try context.save()
                DispatchQueue.main.async {
                    self.wallets.append(contentsOf: newWallets)
                }
            } catch {
                print("Failed to save wallets: \(error)")
            }
        }
    }

    func processData(data: [String: Any]) {
        if let preferredFiatCurrency = data[WatchDataKeys.preferredFiatCurrency.rawValue] as? String, let preferredFiatCurrencyUnit = fiatUnit(currency: preferredFiatCurrency) {
            Task {
                let marketData = MarketData(nextBlock: "", sats: "", price: "", rate: 0, dateString: "", lastUpdate: nil)
                do {
                    context.insert(marketData)
                    try context.save()
                } catch {
                    print("Failed to save market data: \(error)")
                }
            }
        } else if let isWalletsInitialized = data[WatchDataKeys.isWalletsInitialized.rawValue] as? Bool {
            companionWalletsInitialized = isWalletsInitialized
        } else {
            WatchDataSource.shared.processWalletsData(walletsInfo: data)
        }
    }

    private func fetchExchangeRate() {
        let preferredCurrency = Currency.getUserPreferredCurrency()
        MarketAPI.fetchPrice(currency: preferredCurrency) { [weak self] dataStore, error in
            guard let self = self else { return }
            if let dataStore = dataStore {
                DispatchQueue.main.async {
                    self.exchangeRate = dataStore.rateDouble
                }
            } else {
                print("Failed to fetch exchange rate: \(String(describing: error))")
            }
        }
    }

    func saveWalletChanges() {
        do {
            try context.save()
        } catch {
            print("Failed to save wallet changes: \(error)")
        }
    }
}
