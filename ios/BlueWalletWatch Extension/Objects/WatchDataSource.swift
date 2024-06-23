import Foundation
import SwiftData
import Combine

@MainActor
class WatchDataSource: ObservableObject {
    static let shared = WatchDataSource()
    @Published var wallets: [Wallet] = []
    var companionWalletsInitialized = false
    private var context: ModelContext!

    init() {
        initializeModelContext()
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
            let sampleWallet = SampleData.createSampleWallet()
            context.insert(sampleWallet)
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
                    preferredBalanceUnit: entry[WatchDataKeys.preferredBalanceUnit.rawValue] as? String ?? "",
                    receiveAddress: entry[WatchDataKeys.receiveAddress.rawValue] as? String ?? "",
                    xpub: entry[WatchDataKeys.xpub.rawValue] as? String,
                    hideBalance: entry[WatchDataKeys.hideBalance.rawValue] as? Bool ?? false,
                    paymentCode: entry[WatchDataKeys.paymentCode.rawValue] as? String
                )

                let transactionsData = entry[WatchDataKeys.transactions.rawValue] as? [[String: Any]] ?? []
                var newTransactions: [WalletTransaction] = []
                for txData in transactionsData {
                    let transaction = WalletTransaction(
                        id: UUID(),
                        time: txData[WatchDataKeys.time.rawValue] as? String ?? "",
                        memo: txData[WatchDataKeys.memo.rawValue] as? String ?? "",
                        amount: txData[WatchDataKeys.amount.rawValue] as? String ?? "",
                        type: txData[WatchDataKeys.type.rawValue] as? String ?? "",
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
}
