import Foundation
import WatchConnectivity
import WatchKit

class WatchDataSource: NSObject {
    
    struct NotificationName {
        static let dataUpdated = Notification.Name(rawValue: "Notification.WalletDataSource.Updated")
    }
    
    struct Notifications {
        static let dataUpdated = Notification(name: NotificationName.dataUpdated)
    }
    
    static let shared = WatchDataSource()
    var wallets: [Wallet] = []
    let groupUserDefaults = UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue)
    
    override init() {
        super.init()
        loadWallets()
    }
    
    // MARK: - Load Wallets from Keychain
    private func loadWallets() {
        if let savedWallets: [Wallet] = Keychain.shared.load([Wallet].self, forKey: Wallet.identifier) {
            wallets = savedWallets
            WatchDataSource.postDataUpdatedNotification()
        } else {
            print("No wallets found in Keychain.")
        }
    }
    
    // MARK: - Save Wallets to Keychain
    private func saveWallets() {
        let success = Keychain.shared.save(wallets, forKey: Wallet.identifier)
        if success {
            print("Wallets saved successfully to Keychain.")
        } else {
            print("Failed to save wallets to Keychain.")
        }
    }
    
    // MARK: - Process Received Data
    func processData(data: [String: Any]) {
        if let preferredFiatCurrency = data["preferredFiatCurrency"] as? String {
            updatePreferredFiatCurrency(preferredFiatCurrency)
        } else {
            processWalletsData(walletsInfo: data)
        }
    }
    
    private func updatePreferredFiatCurrency(_ currency: String) {
      if let preferredFiatCurrencyUnit = fiatUnit(for: currency) {
            groupUserDefaults?.set(preferredFiatCurrencyUnit.endPointKey, forKey: "preferredCurrency")
            groupUserDefaults?.synchronize()
            
            #if canImport(WatchKit)
            if let extensionDelegate = WKExtension.shared().delegate as? ExtensionDelegate {
                extensionDelegate.updatePreferredFiatCurrency()
            }
            #endif
            
            print("Updated preferred fiat currency to \(currency)")
        }
    }
    
    // MARK: - Process Wallets Data
    private func processWalletsData(walletsInfo: [String: Any]) {
        guard let walletsArray = walletsInfo["wallets"] as? [[String: Any]] else { return }
        
        wallets.removeAll()
        
        for (index, entry) in walletsArray.enumerated() {
            guard let wallet = parseWallet(entry: entry, identifier: index) else { continue }
            wallets.append(wallet)
        }
        
        saveWallets()
        WatchDataSource.postDataUpdatedNotification()
    }
    
    private func parseWallet(entry: [String: Any], identifier: Int) -> Wallet? {
        guard let label = entry["label"] as? String,
              let balance = entry["balance"] as? String,
              let type = entry["type"] as? String,
              let preferredBalanceUnit = entry["preferredBalanceUnit"] as? String,
              let transactionsArray = entry["transactions"] as? [[String: Any]],
              let paymentCode = entry["paymentCode"] as? String else { return nil }
        
        let transactions = parseTransactions(transactionsArray)
        let receiveAddress = entry["receiveAddress"] as? String ?? ""
        let xpub = entry["xpub"] as? String ?? ""
        let hideBalance = entry["hideBalance"] as? Bool ?? false
        
        return Wallet(label: label, balance: balance, type: type, preferredBalanceUnit: preferredBalanceUnit,
                      receiveAddress: receiveAddress, transactions: transactions, identifier: identifier,
                      xpub: xpub, hideBalance: hideBalance, paymentCode: paymentCode)
    }
    
    private func parseTransactions(_ transactionsArray: [[String: Any]]) -> [Transaction] {
        var transactions = [Transaction]()
        
        for transactionEntry in transactionsArray {
            guard let time = transactionEntry["time"] as? String,
                  let memo = transactionEntry["memo"] as? String,
                  let amount = transactionEntry["amount"] as? String,
                  let type = transactionEntry["type"] as? String else { continue }
            
            // Validate amount format
            guard let _ = Double(amount) else {
                print("Invalid transaction amount format: \(amount)")
                continue
            }
            
            let transaction = Transaction(time: time, memo: memo, type: type, amount: amount)
            transactions.append(transaction)
        }
        
        return transactions
    }
    
    // MARK: - Notifications
    static func postDataUpdatedNotification() {
        NotificationCenter.default.post(Notifications.dataUpdated)
    }
    
    // MARK: - Lightning Invoice Request
    static func requestLightningInvoice(walletIdentifier: Int, amount: Double, description: String?, responseHandler: @escaping (_ invoice: String) -> Void) {
        guard WatchDataSource.shared.wallets.count > walletIdentifier else {
            responseHandler("")
            return
        }
        let message: [String: Any] = [
            "request": "createInvoice",
            "walletIndex": walletIdentifier,
            "amount": amount,
            "description": description ?? ""
        ]
        
        WCSession.default.sendMessage(message, replyHandler: { (reply: [String: Any]) in
            if let invoicePaymentRequest = reply["invoicePaymentRequest"] as? String, !invoicePaymentRequest.isEmpty {
                responseHandler(invoicePaymentRequest)
            } else {
                responseHandler("")
            }
        }, errorHandler: { error in
            print("Error requesting Lightning invoice:", error)
            responseHandler("")
        })
    }
    
    // MARK: - Toggle Wallet Hide Balance
    static func toggleWalletHideBalance(walletIdentifier: Int, hideBalance: Bool, responseHandler: @escaping () -> Void) {
        guard WatchDataSource.shared.wallets.count > walletIdentifier else {
            responseHandler()
            return
        }
        let message: [String: Any] = [
            "message": "hideBalance",
            "walletIndex": walletIdentifier,
            "hideBalance": hideBalance
        ]
        
        WCSession.default.sendMessage(message, replyHandler: { _ in
            responseHandler()
        }, errorHandler: { error in
            print("Error toggling wallet hide balance:", error)
            responseHandler()
        })
    }
}
