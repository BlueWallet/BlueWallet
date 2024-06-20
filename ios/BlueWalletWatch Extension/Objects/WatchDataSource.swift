import Foundation
import WatchConnectivity
import CoreData
import Combine

class WatchDataSource: NSObject, ObservableObject {
    static let shared = WatchDataSource()
    
    @Published var wallets: [Wallet] = []
    var companionWalletsInitialized = false
    private let container = PersistenceController.shared.container
    private var session: WCSession

    override init() {
        session = WCSession.default
        super.init()
        session.delegate = self
        session.activate()
        loadWallets()
    }

    func loadWallets() {
        let fetchRequest: NSFetchRequest<Wallet> = Wallet.fetchRequest()
        do {
            wallets = try container.viewContext.fetch(fetchRequest)
        } catch {
            print("Failed to fetch wallets: \(error)")
        }
    }

    func processWalletsData(walletsInfo: [String: Any]) {
        let context = container.viewContext
        context.perform {
            for entry in walletsInfo["wallets"] as? [[String: Any]] ?? [] {
                let wallet = Wallet(context: context)
                wallet.id = UUID()
                wallet.label = entry["label"] as? String ?? ""
                wallet.balance = entry["balance"] as? String ?? ""
                wallet.type = entry["type"] as? String ?? ""
                wallet.preferredBalanceUnit = entry["preferredBalanceUnit"] as? String ?? ""
                wallet.receiveAddress = entry["receiveAddress"] as? String ?? ""
                wallet.xpub = entry["xpub"] as? String
                wallet.hideBalance = entry["hideBalance"] as? Bool ?? false
                wallet.paymentCode = entry["paymentCode"] as? String
                
                let transactionsData = entry["transactions"] as? [[String: Any]] ?? []
                for txData in transactionsData {
                    let transaction = Transaction(context: context)
                    transaction.id = UUID()
                    transaction.time = txData["time"] as? String ?? ""
                    transaction.memo = txData["memo"] as? String ?? ""
                    transaction.amount = txData["amount"] as? String ?? ""
                    transaction.type = txData["type"] as? String ?? ""
                    transaction.wallet = wallet
                    wallet.addTransaction(transaction)
                }
                self.wallets.append(wallet)
            }
            do {
                try context.save()
            } catch {
                print("Failed to save wallets: \(error)")
            }
        }
    }

    static func requestLightningInvoice(walletIdentifier: UUID, amount: Double, description: String?, responseHandler: @escaping (_ invoice: String) -> Void) {
        guard let walletIndex = WatchDataSource.shared.wallets.firstIndex(where: { $0.id == walletIdentifier }) else {
            responseHandler("")
            return
        }
        WCSession.default.sendMessage(["request": "createInvoice", "walletIndex": walletIndex, "amount": amount, "description": description ?? ""], replyHandler: { (reply: [String : Any]) in
            if let invoicePaymentRequest = reply["invoicePaymentRequest"] as? String, !invoicePaymentRequest.isEmpty {
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
        WCSession.default.sendMessage(["message": "hideBalance", "walletIndex": walletIndex, "hideBalance": hideBalance], replyHandler: { (reply: [String : Any]) in
            responseHandler("")
        }) { (error) in
            print(error)
            responseHandler("")
        }
    }

    func processData(data: [String: Any]) {
        if let preferredFiatCurrency = data["preferredFiatCurrency"] as? String, let preferredFiatCurrencyUnit = fiatUnit(currency: preferredFiatCurrency) {
            let fiatCurrencyData = ["preferredCurrency": preferredFiatCurrencyUnit.endPointKey]
            UserDefaults.standard.set(fiatCurrencyData, forKey: "preferredCurrency")

            let extensionDelegate = ExtensionDelegate()
            extensionDelegate.updatePreferredFiatCurrency()
        } else if let isWalletsInitialized = data["isWalletsInitialized"] as? Bool {
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
