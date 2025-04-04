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
    guard let identifier = context as? UUID else {
      pop()
      return
    }
    loadWalletDetails(identifier: identifier)
  }
  
  private func loadWalletDetails(identifier: UUID) {
    let index = WatchDataSource.shared.wallets.firstIndex(where: { $0.id == identifier }) ?? 0
    let wallet = WatchDataSource.shared.wallets[index]
    self.wallet = wallet
    updateWalletUI(wallet: wallet)
    updateTransactionsTable(forWallet: wallet)
  }
  
  private func updateWalletUI(wallet: Wallet) {
    walletBalanceLabel.setHidden(wallet.hideBalance)
    walletBalanceLabel.setText(wallet.hideBalance ? "" : wallet.balance)
    walletNameLabel.setText(wallet.label)
//    walletBasicsGroup.setBackgroundImageNamed(WalletGradient(rawValue: wallet.type)?)
    
    let isLightningWallet = wallet.type == .lightningCustodianWallet
    createInvoiceButton.setHidden(!isLightningWallet)
    receiveButton.setHidden(wallet.receiveAddress.isEmpty)
    viewXPubButton.setHidden(!isXPubAvailable(wallet: wallet))
  }
  
  private func isXPubAvailable(wallet: Wallet) -> Bool {
    return (wallet.type != .lightningCustodianWallet) && !(wallet.xpub).isEmpty
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
    guard let identifier = wallet?.id else { return }
    WatchDataSource.shared.toggleWalletHideBalance(walletIdentifier: identifier, hideBalance: false) { [weak self] _ in
      DispatchQueue.main.async {
        WatchDataSource.postDataUpdatedNotification()
        self?.loadWalletDetails(identifier: identifier)
      }
    }
  }
  
  @objc func hideBalanceMenuItemTapped() {
    guard let identifier = wallet?.id else { return }
    WatchDataSource.shared.toggleWalletHideBalance(walletIdentifier: identifier, hideBalance: true) { [weak self] _ in
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
    guard let wallet = wallet else { return }
    pushController(withName: ReceiveInterfaceController.identifier, context: (wallet.id, ReceiveMethod.CreateInvoice))
  }
  
  override func contextForSegue(withIdentifier segueIdentifier: String) -> Any? {
    guard let wallet = wallet else { return nil }
    return (wallet.id, ReceiveMethod.Onchain)
  }
  
}
