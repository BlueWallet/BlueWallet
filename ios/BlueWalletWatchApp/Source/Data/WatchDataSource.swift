// Data/WatchDataSource.swift

import Foundation
import WatchConnectivity
import Security
import Combine
import ClockKit

class WatchDataSource: NSObject, ObservableObject, WCSessionDelegate {
    // MARK: - Singleton Instance
    
    static let shared = WatchDataSource()
    
    // MARK: - Published Properties
    
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
    
    /// Starts the WatchConnectivity session
    func startSession() {
            session.activate()
      
    }
    
    /// Deactivates the WatchConnectivity session (if needed)
    func deactivateSession() {
        // WCSession does not provide a deactivate method, but you can handle any necessary cleanup here
    }
    
    // MARK: - Data Binding
    
    private func setupBindings() {
        // Observe changes to wallets and perform actions if needed
        $wallets
            .sink { [weak self] updatedWallets in
                self?.saveWalletsToKeychain()
                self?.reloadComplications()
            }
            .store(in: &cancellables)
    }
    
    // MARK: - Keychain Operations
    
    private func loadKeychainData() {
        DispatchQueue.global(qos: .background).async { [weak self] in
            guard let self = self else { return }
            guard let existingData = self.keychain.retrieve(service: "com.bluewallet.watch", account: Wallet.identifier),
                  let decodedWallets = try? JSONDecoder().decode([Wallet].self, from: existingData) else {
                return
            }
            
            DispatchQueue.main.async {
                if decodedWallets != self.wallets {
                    self.wallets = decodedWallets
                }
            }
        }
    }
    
    private func saveWalletsToKeychain() {
        DispatchQueue.global(qos: .background).async { [weak self] in
            guard let self = self else { return }
            guard let encodedData = try? JSONEncoder().encode(self.wallets) else {
                print("Failed to encode wallets.")
                return
            }
            let success = self.keychain.save(encodedData, service: "com.bluewallet.watch", account: Wallet.identifier)
            if !success {
                print("Failed to save wallets to Keychain.")
            }
        }
    }
    
    // MARK: - WatchConnectivity Methods
    
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if let error = error {
            print("WCSession activation failed with error: \(error.localizedDescription)")
        } else {
            print("WCSession activated with state: \(activationState.rawValue)")
            // Optionally, perform actions based on activation state
        }
    }
  
    
    // Handle received messages
    func session(_ session: WCSession, didReceiveMessage message: [String : Any], replyHandler: @escaping ([String : Any]) -> Void) {
        processReceivedData(message)
    }
  
  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String : Any]) {
    if applicationContext.isEmpty { return }
    processReceivedData(applicationContext)
  }
    
    // MARK: - Data Processing
    
    private func processReceivedData(_ data: [String: Any]) {
        if let preferredFiatCurrency = data["preferredFiatCurrency"] as? String,
           let preferredFiatCurrencyUnit = try? FiatUnit(from: preferredFiatCurrency as Decodable as! Decoder) {
          groupUserDefaults?.set(preferredFiatCurrencyUnit.endPointKey, forKey: "preferredCurrency")
          groupUserDefaults?.synchronize()
          
          // Fetch and update market data based on the new preferred currency
          updateMarketData(for: preferredFiatCurrencyUnit)
          
        } else {
            processWalletsData(walletsInfo: data)
        }
    }
    
    private func processWalletsData(walletsInfo: [String: Any]) {
        guard let walletsToProcess = walletsInfo["wallets"] as? [[String: Any]] else { return }
        
        var processedWallets: [Wallet] = []
        
        for entry in walletsToProcess {
            guard let label = entry["label"] as? String,
                  let balance = entry["balance"] as? String,
                  let type = entry["type"] as? String,
                  let preferredBalanceUnit = entry["preferredBalanceUnit"] as? String,
                  let transactions = entry["transactions"] as? [[String: Any]] else {
                continue
            }
            
            var transactionsProcessed: [Transaction] = []
            for transactionEntry in transactions {
                guard let time = transactionEntry["time"] as? String,
                      let memo = transactionEntry["memo"] as? String,
                      let amount = transactionEntry["amount"] as? String,
                      let type = transactionEntry["type"] as? String else { continue }
              let transaction = Transaction(time: time, memo: memo, type: TransactionType.unknown(type), amount: amount)
                transactionsProcessed.append(transaction)
            }
            
            let receiveAddress = entry["receiveAddress"] as? String ?? ""
            let xpub = entry["xpub"] as? String ?? ""
            let hideBalance = entry["hideBalance"] as? Bool ?? false
            let paymentCode = entry["paymentCode"] as? String
            let wallet = Wallet(
                label: label,
                balance: balance,
                type:  WalletType.unknown(type),
                preferredBalanceUnit: preferredBalanceUnit,
                receiveAddress: receiveAddress,
                transactions: transactionsProcessed,
                xpub: xpub,
                hideBalance: hideBalance,
                paymentCode: paymentCode
            )
            processedWallets.append(wallet)
        }
        
        DispatchQueue.main.async { [weak self] in
            self?.wallets = processedWallets
        }
    }
    
    private func updateMarketData(for fiatUnit: FiatUnit) {
        MarketAPI.fetchPrice(currency: fiatUnit.endPointKey) { [weak self] (marketData, error) in
            guard let self = self else { return }
          if case let marketData as MarketData = marketData {
                let widgetData = WidgetDataStore(fromMarketData: marketData)
                self.groupUserDefaults?.set(widgetData, forKey: MarketData.string)
                self.groupUserDefaults?.synchronize()
                
                // Optionally, notify other components or update additional @Published properties
            } else if let error = error {
                print("Failed to fetch market data: \(error.localizedDescription)")
            }
        }
    }
    
    // MARK: - Wallet Actions
    
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
    
    private func reloadComplications() {
        let server = CLKComplicationServer.sharedInstance()
        server.activeComplications?.forEach { complication in
            server.reloadTimeline(for: complication)
            print("[Complication] Reloaded timeline for \(complication.family.rawValue)")
        }
    }
}
