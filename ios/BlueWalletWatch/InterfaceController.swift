//
//  InterfaceController.swift
//  BlueWalletWatch Extension
//
//  Created by Marcos Rodriguez on 3/6/19.
//

import WatchKit
import WatchConnectivity
import Foundation

class InterfaceController: WKInterfaceController {
  
  @IBOutlet weak var walletsTable: WKInterfaceTable!
  @IBOutlet weak var noWalletsAvailableLabel: WKInterfaceLabel!
    
  override func awake(withContext context: Any?) {
    super.awake(withContext: context)
    // Ensure WatchDataSource is initialized early in the lifecycle
    _ = WatchDataSource.shared
  }
  
  override func willActivate() {
    super.willActivate()
    
    // Request fresh data when controller becomes active
    WatchDataSource.shared.requestDataFromiOS()
    
    // Update UI with any existing data
    updateUI()
    
    // Register for notifications
    NotificationCenter.default.addObserver(self, selector: #selector(updateUI), name: Notifications.dataUpdated.name, object: nil)
  }
  
  override func didDeactivate() {
    super.didDeactivate()
    // Clean up observers when controller is no longer active
    NotificationCenter.default.removeObserver(self)
  }
  
  @objc private func updateUI() {
    let wallets = WatchDataSource.shared.wallets
    let isEmpty = wallets.isEmpty
    noWalletsAvailableLabel.setHidden(!isEmpty)
    walletsTable.setHidden(isEmpty)
    
    if isEmpty { return }
    
    walletsTable.setNumberOfRows(wallets.count, withRowType: WalletInformation.identifier)
    for index in 0..<wallets.count {
      updateRow(at: index, with: wallets[index])
    }
  }
  
  private func updateRow(at index: Int, with wallet: Wallet) {
    guard let controller = walletsTable.rowController(at: index) as? WalletInformation else { return }
    controller.configure(with: wallet)
  }
  
  override func contextForSegue(withIdentifier segueIdentifier: String, in table: WKInterfaceTable, rowIndex: Int) -> Any? {
    return rowIndex
  }
}
