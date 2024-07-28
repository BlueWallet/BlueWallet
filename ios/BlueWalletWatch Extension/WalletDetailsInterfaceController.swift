//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 3/11/19.

import WatchKit
import Foundation
import WatchConnectivity

class WalletDetailsInterfaceController: WKInterfaceController {
  
  var wallet: Wallet?
  static let identifier = "WalletDetailsInterfaceController"
  @IBOutlet weak var walletBasicsGroup: WKInterfaceGroup!
  @IBOutlet weak var walletBalanceLabel: WKInterfaceLabel!
  @IBOutlet weak var createInvoiceButton: WKInterfaceButton!
  @IBOutlet weak var walletNameLabel: WKInterfaceLabel!
  @IBOutlet weak var receiveButton: WKInterfaceButton!
  @IBOutlet weak var viewXPubButton: WKInterfaceButton!
  @IBOutlet weak var noTransactionsLabel: WKInterfaceLabel!
  @IBOutlet weak var transactionsTable: WKInterfaceTable!
  
  override func awake(withContext context: Any?) {
    super.awake(withContext: context)
    guard let identifier = context as? Int else {
      pop()
      return
    }
    loadWalletDetails(identifier: identifier)
  }
  
  private func loadWalletDetails(identifier: Int) {
    let wallet = WatchDataSource.shared.wallets[identifier]
    self.wallet = wallet
    updateWalletUI(wallet: wallet)
    updateTransactionsTable(forWallet: wallet)
  }
  
  private func updateWalletUI(wallet: Wallet) {
    walletBalanceLabel.setHidden(wallet.hideBalance)
    walletBalanceLabel.setText(wallet.hideBalance ? "" : wallet.balance)
    walletNameLabel.setText(wallet.label)
    walletBasicsGroup.setBackgroundImageNamed(WalletGradient(rawValue: wallet.type)?.imageString)
    
    let isLightningWallet = wallet.type == WalletGradient.LightningCustodial.rawValue
    createInvoiceButton.setHidden(!isLightningWallet)
    receiveButton.setHidden(wallet.receiveAddress.isEmpty)
    viewXPubButton.setHidden(!isXPubAvailable(wallet: wallet))
  }
  
  private func isXPubAvailable(wallet: Wallet) -> Bool {
    return (wallet.type != WalletGradient.LightningCustodial.rawValue) && !(wallet.xpub ?? "").isEmpty
  }
  
  private func updateTransactionsTable(forWallet wallet: Wallet) {
    let transactions = wallet.transactions
    transactionsTable.setNumberOfRows(transactions.count, withRowType: TransactionTableRow.identifier)
    
    for index in 0..<transactions.count {
      guard let controller = transactionsTable.rowController(at: index) as? TransactionTableRow else { continue }
      let transaction = transactions[index]
      controller.configure(with: transaction)
    }
    transactionsTable.setHidden(transactions.isEmpty)
    noTransactionsLabel.setHidden(!transactions.isEmpty)
  }
  
  @IBAction func toggleBalanceVisibility(_ sender: Any) {
    guard let wallet = wallet else {
      return
    }
    
    if wallet.hideBalance {
      showBalanceMenuItemTapped()
    } else {
      hideBalanceMenuItemTapped()
    }
  }
  
  @objc func showBalanceMenuItemTapped() {
    guard let identifier = wallet?.identifier else { return }
    WatchDataSource.toggleWalletHideBalance(walletIdentifier: identifier, hideBalance: false) { [weak self] _ in
      DispatchQueue.main.async {
        WatchDataSource.postDataUpdatedNotification()
        self?.loadWalletDetails(identifier: identifier)
      }
    }
  }
  
  @objc func hideBalanceMenuItemTapped() {
    guard let identifier = wallet?.identifier else { return }
    WatchDataSource.toggleWalletHideBalance(walletIdentifier: identifier, hideBalance: true) { [weak self] _ in
      DispatchQueue.main.async {
        WatchDataSource.postDataUpdatedNotification()
        self?.loadWalletDetails(identifier: identifier)
      }
    }
  }
  
  @IBAction func viewXPubMenuItemTapped() {
    guard let xpub = wallet?.xpub else {
      return
    }
    presentController(withName: ViewQRCodefaceController.identifier, context: xpub)
  }
  
  override func willActivate() {
    super.willActivate()
    guard let wallet = wallet else { return }
    updateTransactionsTable(forWallet: wallet)
  }
  
  @IBAction func receiveMenuItemTapped() {
    guard let wallet = wallet else { return }
    presentController(withName: ReceivePageInterfaceController.identifier, context: (wallet, ReceiveMethod.Onchain))
  }
  
  @IBAction func createInvoiceTapped() {
    if WatchDataSource.shared.companionWalletsInitialized {
      guard let wallet = wallet else { return }
      pushController(withName: ReceiveInterfaceController.identifier, context: (wallet.identifier, ReceiveMethod.CreateInvoice))
    } else {
      WKInterfaceDevice.current().play(.failure)
      presentAlert(withTitle: "Error", message: "Unable to create invoice. Please open BlueWallet on your iPhone and unlock your wallets.", preferredStyle: .alert, actions: [WKAlertAction(title: "OK", style: .default, handler: { [weak self] in
        self?.dismiss()
      })])
    }
  }
  
  override func contextForSegue(withIdentifier segueIdentifier: String) -> Any? {
    guard let wallet = wallet else { return nil }
    return (wallet.identifier, ReceiveMethod.Onchain)
  }
  
}
