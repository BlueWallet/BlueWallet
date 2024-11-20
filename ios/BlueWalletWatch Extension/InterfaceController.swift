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
    
  override func willActivate() {
    super.willActivate()
    updateUI()
    NotificationCenter.default.addObserver(self, selector: #selector(updateUI), name: Notifications.dataUpdated.name, object: nil)
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
