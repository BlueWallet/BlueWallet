import SwiftData
import WatchConnectivity
import Combine

@MainActor
class WatchDataSource: NSObject, ObservableObject {
    static let shared = WatchDataSource()

    @Published var wallets: [Wallet] = []
    var companionWalletsInitialized = false
    private let container: ModelContainer
    private var session: WCSession

    override init() {
        container = try! ModelContainer(for: Wallet.self, WalletTransaction.self, MarketData.self)
        session = WCSession.default
        super.init()
        session.delegate = self
        session.activate()
        loadWallets()
    }

    func loadWallets() {
        Task {
            do {
                let fetchRequest = FetchDescriptor<Wallet>()
                let results = try container.mainContext.fetch(fetchRequest)
                DispatchQueue.main.async {
                    self.wallets = results
                }
            } catch {
                print("Failed to fetch wallets: \(error)")
            }
        }
    }

    func processWalletsData(walletsInfo: [String: Any]) {
        Task {
            do {
                let context = container.mainContext
                for entry in walletsInfo[WatchDataKeys.wallets.rawValue] as? [[String: Any]] ?? [] {
                    let wallet = Wallet(
                        label: entry[WatchDataKeys.label.rawValue] as? String ?? "",
                        balance: entry[WatchDataKeys.balance.rawValue] as? String ?? "",
                        type: entry[WatchDataKeys.type.rawValue] as? String ?? "",
                        preferredBalanceUnit: entry[WatchDataKeys.preferredBalanceUnit.rawValue] as? String ?? "",
                        receiveAddress: entry[WatchDataKeys.receiveAddress.rawValue] as? String ?? "",
                        xpub: entry[WatchDataKeys.xpub.rawValue] as? String,
                        hideBalance: entry[WatchDataKeys.hideBalance.rawValue] as? Bool ?? false,
                        paymentCode: entry[WatchDataKeys.paymentCode.rawValue] as? String
                    )

                    let transactionsData = entry[WatchDataKeys.transactions.rawValue] as? [[String: Any]] ?? []
                    for txData in transactionsData {
                        let transaction = WalletTransaction(
                            id: UUID(),
                            time: txData[WatchDataKeys.time.rawValue] as? String ?? "",
                            memo: txData[WatchDataKeys.memo.rawValue] as? String ?? "",
                            amount: txData[WatchDataKeys.amount.rawValue] as? String ?? "",
                            type: txData[WatchDataKeys.type.rawValue] as? String ?? "",
                            wallet: wallet
                        )
                        wallet.transactions.append(transaction)
                    }

                    context.insert(wallet)
                }
                try await context.save()
                DispatchQueue.main.async {
                    self.loadWallets()
                }
            } catch {
                print("Failed to process wallets data: \(error)")
            }
        }
    }

    static func requestLightningInvoice(walletIdentifier: UUID, amount: Double, description: String?, responseHandler: @escaping (_ invoice: String) -> Void) {
        guard let walletIndex = WatchDataSource.shared.wallets.firstIndex(where: { $0.id == walletIdentifier }) else {
            responseHandler("")
            return
        }
        WCSession.default.sendMessage([WatchDataKeys.request.rawValue: WatchMessageType.createInvoice.rawValue, WatchDataKeys.walletIndex.rawValue: walletIndex, WatchDataKeys.amount.rawValue: amount, WatchDataKeys.description.rawValue: description ?? ""], replyHandler: { (reply: [String : Any]) in
            if let invoicePaymentRequest = reply[WatchDataKeys.invoicePaymentRequest.rawValue] as? String, !invoicePaymentRequest.isEmpty {
                responseHandler(invoicePaymentRequest)
            } else {
                responseHandler("")
            }
        }) { (error) in
            print(error)
            responseHandler("")
        }
    }

    static func toggleWalletHideBalance(walletIdentifier: UUID, hideBalance: Bool, responseHandler: @escaping (_ invoice: String) -> Void) {
        guard let walletIndex = WatchDataSource.shared.wallets.firstIndex(where: { $0.id == walletIdentifier }) else {
            responseHandler("")
            return
        }
        WCSession.default.sendMessage([WatchDataKeys.message.rawValue: WatchMessageType.hideBalance.rawValue, WatchDataKeys.walletIndex.rawValue: walletIndex, WatchDataKeys.hideBalanceKey.rawValue: hideBalance], replyHandler: { (reply: [String : Any]) in
            responseHandler("")
        }) { (error) in
            print(error)
            responseHandler("")
        }
    }

  func processData(data: [String: Any]) {
      if let preferredFiatCurrency = data[WatchDataKeys.preferredFiatCurrency.rawValue] as? String,
         let preferredFiatCurrencyUnit = fiatUnit(currency: preferredFiatCurrency) {
          let fiatCurrencyData = ["preferredCurrency": preferredFiatCurrencyUnit.endPointKey]
          UserDefaults.standard.set(fiatCurrencyData, forKey: WatchDataKeys.preferredCurrency.rawValue)
      } else if let isWalletsInitialized = data[WatchDataKeys.isWalletsInitialized.rawValue] as? Bool {
          companionWalletsInitialized = isWalletsInitialized
      } else {
          WatchDataSource.shared.processWalletsData(walletsInfo: data)
      }
  }
}

extension WatchDataSource: WCSessionDelegate {
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if activationState == .activated {
            loadWallets()
        }
    }
    
    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String : Any]) {
        processData(data: applicationContext)
    }
    
    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String : Any] = [:]) {
        processData(data: userInfo)
    }

    func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {
        processData(data: message)
    }
}
