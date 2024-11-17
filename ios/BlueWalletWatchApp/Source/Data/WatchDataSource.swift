// Data/WatchDataSource.swift

import Foundation
import WatchConnectivity
import Security
import Combine
import ClockKit

/// Represents the group user defaults keys.
/// Ensure these match the keys used in your iOS app for sharing data.

/// Handles WatchConnectivity and data synchronization between iOS and Watch apps.
class WatchDataSource: NSObject, ObservableObject, WCSessionDelegate {
    // MARK: - Singleton Instance
    
    static let shared = WatchDataSource()
    
    // MARK: - Published Properties
    
    /// The list of wallets to be displayed on the Watch app.
    @Published var wallets: [Wallet] = []
    
    // MARK: - Private Properties
    
    private let groupUserDefaults = UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue)
    private let keychain = KeychainHelper.shared
    private let session: WCSession
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Initializer
    
    private override init() {
        if WCSession.isSupported() {
            self.session = WCSession.default
        } else {
            fatalError("WCSession is not supported on this device.")
        }
        super.init()
        self.session.delegate = self
        // Activation handled externally via startSession()
        loadKeychainData()
        setupBindings()
    }
    
    // MARK: - Public Methods
    
    /// Starts the WatchConnectivity session.
    func startSession() {
        // Check if keychain has existing wallets data before activating session
        if let existingData = keychain.retrieve(service: UserDefaultsGroupKey.WatchAppBundleIdentifier.rawValue, account: UserDefaultsGroupKey.BundleIdentifier.rawValue),
           !existingData.isEmpty {
            session.activate()
        } else {
            print("Keychain is empty. Skipping WCSession activation.")
        }
    }
    
    /// Deactivates the WatchConnectivity session (if needed).
    /// Note: WCSession does not provide a deactivate method, but you can handle any necessary cleanup here.
    func deactivateSession() {
        // Handle any necessary cleanup here.
    }
    
    // MARK: - Data Binding
    
    /// Sets up bindings to observe changes to `wallets` and perform actions accordingly.
    private func setupBindings() {
        // Observe changes to wallets and perform actions if needed.
        $wallets
            .sink { [weak self] updatedWallets in
                self?.saveWalletsToKeychain()
                self?.reloadComplications()
            }
            .store(in: &cancellables)
    }
    
    // MARK: - Keychain Operations
    
    /// Loads wallets data from the Keychain asynchronously.
    private func loadKeychainData() {
        DispatchQueue.global(qos: .background).async { [weak self] in
            guard let self = self else { return }
            guard let existingData = self.keychain.retrieve(service: UserDefaultsGroupKey.WatchAppBundleIdentifier.rawValue, account: UserDefaultsGroupKey.BundleIdentifier.rawValue),
                  let decodedWallets = try? JSONDecoder().decode([Wallet].self, from: existingData) else {
                print("No existing wallets data found in Keychain.")
                return
            }
            
            // Filter wallets to include only on-chain wallets.
            let onChainWallets = decodedWallets.filter { $0.chain == .onchain }
            
            DispatchQueue.main.async {
                if onChainWallets != self.wallets {
                    self.wallets = onChainWallets
                    print("Loaded \(onChainWallets.count) on-chain wallets from Keychain.")
                }
            }
        }
    }
    
    /// Saves the current wallets data to the Keychain asynchronously.
    private func saveWalletsToKeychain() {
        DispatchQueue.global(qos: .background).async { [weak self] in
            guard let self = self else { return }
            guard let encodedData = try? JSONEncoder().encode(self.wallets) else {
                print("Failed to encode wallets.")
                return
            }
            let success = self.keychain.save(encodedData, service: UserDefaultsGroupKey.WatchAppBundleIdentifier.rawValue, account: UserDefaultsGroupKey.BundleIdentifier.rawValue)
            if success {
                print("Successfully saved wallets to Keychain.")
            } else {
                print("Failed to save wallets to Keychain.")
            }
        }
    }
    
    // MARK: - WatchConnectivity Methods
    
    /// Handles the activation completion of the WCSession.
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if let error = error {
            print("WCSession activation failed with error: \(error.localizedDescription)")
        } else {
            print("WCSession activated with state: \(activationState.rawValue)")
            // Optionally, perform actions based on activation state.
            // For example, send current wallets data to iOS app.
            sendCurrentWalletsData()
        }
    }
    
    /// Handles received messages from the iOS app.
    func session(_ session: WCSession, didReceiveMessage message: [String : Any], replyHandler: @escaping ([String : Any]) -> Void) {
        processReceivedData(message)
    }
    
    /// Handles received application context updates from the iOS app.
    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String : Any]) {
        if applicationContext.isEmpty { return }
        processReceivedData(applicationContext)
    }
    
    // MARK: - Data Processing
    
    /// Processes received data from the iOS app.
    /// - Parameter data: The data received either as a message or application context.
    private func processReceivedData(_ data: [String: Any]) {
        if let preferredFiatCurrency = data["preferredFiatCurrency"] as? String {
            // Handle preferred fiat currency update.
            groupUserDefaults?.set(preferredFiatCurrency, forKey: "preferredCurrency")
            
            // Fetch and update market data based on the new preferred currency.
            updateMarketData(for: preferredFiatCurrency)
        } else {
            // Assume the data contains wallets information.
            processWalletsData(walletsInfo: data)
        }
    }
    
    /// Processes wallets data received from the iOS app.
    /// - Parameter walletsInfo: The wallets data received as a dictionary.
    private func processWalletsData(walletsInfo: [String: Any]) {
        guard let walletsToProcess = walletsInfo["wallets"] as? [[String: Any]] else {
            print("No wallets data found in received context.")
            return
        }
        
        var processedWallets: [Wallet] = []
        
        for entry in walletsToProcess {
            guard let label = entry["label"] as? String,
                  let balance = entry["balance"] as? String,
                  let typeString = entry["type"] as? String,
                  let preferredBalanceUnitString = entry["preferredBalanceUnit"] as? String,
                  let chainString = entry["chain"] as? String,
                  let transactions = entry["transactions"] as? [[String: Any]] else {
                print("Incomplete wallet entry found. Skipping.")
                continue
            }
            
            var transactionsProcessed: [Transaction] = []
            for transactionEntry in transactions {
                guard let time = transactionEntry["time"] as? String,
                      let memo = transactionEntry["memo"] as? String,
                      let amount = transactionEntry["amount"] as? String,
                      let type = transactionEntry["type"] as? String else {
                    print("Incomplete transaction entry found. Skipping.")
                    continue
                }
                
                let transactionType = TransactionType(rawString: type)
                let transaction = Transaction(time: time, memo: memo, type: transactionType, amount: amount)
                transactionsProcessed.append(transaction)
            }
            
            let receiveAddress = entry["receiveAddress"] as? String ?? ""
            let xpub = entry["xpub"] as? String ?? ""
            let hideBalance = entry["hideBalance"] as? Bool ?? false
            let paymentCode = entry["paymentCode"] as? String
            let chain = Chain(rawString: chainString)
            
            let wallet = Wallet(
                label: label,
                balance: balance,
                type: WalletType(rawString: typeString),
                chain: chain,
                preferredBalanceUnit: BalanceUnit(rawString: preferredBalanceUnitString),
                receiveAddress: receiveAddress,
                transactions: transactionsProcessed,
                xpub: xpub,
                hideBalance: hideBalance,
                paymentCode: paymentCode
            )
            processedWallets.append(wallet)
        }
        
        // Update the published `wallets` property on the main thread.
        DispatchQueue.main.async { [weak self] in
            self?.wallets = processedWallets
            print("Updated wallets from received context.")
        }
    }
    
    /// Fetches market data based on the preferred fiat currency.
    /// - Parameter fiatCurrency: The preferred fiat currency string.
    private func updateMarketData(for fiatCurrency: String) {
        // Assuming `FiatUnit` is a valid type and `MarketAPI` is properly defined.
        MarketAPI.fetchPrice(currency: fiatCurrency) { [weak self] (marketData, error) in
            guard let self = self else { return }
            if let marketData = marketData as? MarketData {
                let widgetData = WidgetDataStore(fromMarketData: marketData)
                self.groupUserDefaults?.set(widgetData, forKey: MarketData.string)
                
                // Optionally, notify other components or update additional @Published properties.
                print("Market data updated for currency: \(fiatCurrency)")
            } else if let error = error {
                print("Failed to fetch market data: \(error.localizedDescription)")
            }
        }
    }
    
    // MARK: - Wallet Actions
    
    /// Requests a Lightning Invoice from the iOS app.
    /// - Parameters:
    ///   - walletIdentifier: The index of the wallet in the `wallets` array.
    ///   - amount: The amount for the invoice.
    ///   - description: An optional description for the invoice.
    ///   - responseHandler: A closure to handle the invoice string received from the iOS app.
    func requestLightningInvoice(walletIdentifier: Int, amount: Double, description: String?, responseHandler: @escaping (_ invoice: String) -> Void) {
        guard wallets.indices.contains(walletIdentifier) else {
            responseHandler("")
            return
        }
        let message: [String: Any] = [
            "request": "createInvoice",
            "walletIndex": walletIdentifier,
            "amount": amount,
            "description": description ?? ""
        ]
        session.sendMessage(message, replyHandler: { reply in
            if let invoicePaymentRequest = reply["invoicePaymentRequest"] as? String, !invoicePaymentRequest.isEmpty {
                responseHandler(invoicePaymentRequest)
            } else {
                responseHandler("")
            }
        }, errorHandler: { error in
            print("Error requesting Lightning Invoice: \(error.localizedDescription)")
            responseHandler("")
        })
    }
    
    /// Toggles the visibility of the wallet's balance.
    /// - Parameters:
    ///   - walletIdentifier: The index of the wallet in the `wallets` array.
    ///   - hideBalance: A boolean indicating whether to hide the balance.
    ///   - responseHandler: A closure to handle the success status.
    func toggleWalletHideBalance(walletIdentifier: Int, hideBalance: Bool, responseHandler: @escaping (_ success: Bool) -> Void) {
        guard wallets.indices.contains(walletIdentifier) else {
            responseHandler(false)
            return
        }
        let message: [String: Any] = [
            "message": "hideBalance",
            "walletIndex": walletIdentifier,
            "hideBalance": hideBalance
        ]
        session.sendMessage(message, replyHandler: { reply in
            responseHandler(true)
        }, errorHandler: { error in
            print("Error toggling hide balance: \(error.localizedDescription)")
            responseHandler(false)
        })
    }
    
    // MARK: - Complications Reload
    
    /// Reloads all active complications on the Watch face.
    private func reloadComplications() {
        let server = CLKComplicationServer.sharedInstance()
        server.activeComplications?.forEach { complication in
            server.reloadTimeline(for: complication)
            print("[Complication] Reloaded timeline for \(complication.family.rawValue)")
        }
    }
    
    // MARK: - Helper Methods
    
    /// Sends the current wallets data to the iOS app.
    private func sendCurrentWalletsData() {
        guard WCSession.default.isReachable else {
            print("iOS app is not reachable. Cannot send current wallets data.")
            return
        }
        
        let walletsData = wallets.map { wallet -> [String: Any] in
            return [
                "label": wallet.label,
                "balance": wallet.balance,
                "type": wallet.type,
                "preferredBalanceUnit": wallet.preferredBalanceUnit,
                "chain": wallet.chain,
                "receiveAddress": wallet.receiveAddress,
                "transactions": wallet.transactions.map { transaction -> [String: Any] in
                    return [
                        "time": transaction.time,
                        "memo": transaction.memo,
                        "type": transaction.type.rawString,
                        "amount": "\(transaction.amount) BTC" // Adjust currency as needed
                    ]
                },
                "xpub": wallet.xpub,
                "hideBalance": wallet.hideBalance,
                "paymentCode": wallet.paymentCode ?? ""
            ]
        }
        
        let message: [String: Any] = [
            "wallets": walletsData
        ]
        
        session.sendMessage(message, replyHandler: { reply in
            print("Successfully sent current wallets data to iOS app.")
        }, errorHandler: { error in
            print("Failed to send current wallets data: \(error.localizedDescription)")
        })
    }
}
