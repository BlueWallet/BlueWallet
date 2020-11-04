//
//  TodayViewController.swift
//  TodayExtension
//
//  Created by Marcos Rodriguez on 11/2/19.
//  Copyright © 2019 Facebook. All rights reserved.
//

import UIKit
import NotificationCenter

class TodayViewController: UIViewController, NCWidgetProviding {
  
  
  @IBOutlet weak var currencyLabel: UILabel!
  @IBOutlet weak var lastUpdatedDate: UILabel!
  @IBOutlet weak var priceLabel: UILabel!
  
  @IBOutlet weak var lastPriceArrowImage: UIImageView!
  @IBOutlet weak var lastPrice: UILabel!
  @IBOutlet weak var lastPriceFromLabel: UILabel!
  private var lastPriceNumber: NSNumber?
  
  
  override func viewDidLoad() {
    super.viewDidLoad()
    
    setLastPriceOutletsHidden(isHidden: true)
    if let lastStoredTodayStore = TodayData.getPriceRateAndLastUpdate() {
      processRateAndLastUpdate(todayStore: lastStoredTodayStore)
    } else {
      setLastPriceOutletsHidden(isHidden: true)
    }
    
    if #available(iOSApplicationExtension 13.0, *) {
    } else{
      self.lastPriceArrowImage.removeFromSuperview()
    }
  }
  
  func setLastPriceOutletsHidden(isHidden: Bool) {
    lastPrice.isHidden = isHidden
    lastPriceFromLabel.isHidden = isHidden
    lastPriceArrowImage?.isHidden = isHidden
  }
  
  override func viewWillAppear(_ animated: Bool)
  {
      var currentSize: CGSize = self.preferredContentSize
      currentSize.height = 200.0
      self.preferredContentSize = currentSize
  }
  
  func processRateAndLastUpdate(todayStore: TodayDataStore) {
    guard let rateString = todayStore.formattedRate, let dateFormatted = todayStore.formattedDate else { return }
    
    priceLabel.text  = rateString
    lastUpdatedDate.text = dateFormatted
  }
  
  func processStoredRateAndLastUpdate(todayStore: TodayDataStore) {
    guard let lastPriceNumber = todayStore.formattedRate else { return }
    
    lastPrice.text = lastPriceNumber
  }
  
  func processCachedStoredRateAndLastUpdate(new: TodayDataStore, cached: TodayDataStore) {
    guard let newPriceDoubleValue = new.rateDoubleValue, let cachedPriceNumber = cached.formattedRate, let cachedPriceNumberDoubleValue = cached.rateDoubleValue else { return }
    
    lastPrice.text = cachedPriceNumber
    
    
    if newPriceDoubleValue > cachedPriceNumberDoubleValue  {
      if #available(iOSApplicationExtension 13.0, *) {
        self.setLastPriceOutletsHidden(isHidden: false)
        self.lastPriceArrowImage.image = UIImage(systemName: "arrow.up")
      } else {
        self.setLastPriceOutletsHidden(isHidden: true)
        self.lastPriceFromLabel.text = "up from"
        lastPriceFromLabel.isHidden = false
        // Fallback on earlier versions
      }
    }  else {
      if #available(iOSApplicationExtension 13.0, *) {
        self.setLastPriceOutletsHidden(isHidden: false)
        self.lastPriceArrowImage.image = UIImage(systemName: "arrow.down")
      } else {
        self.setLastPriceOutletsHidden(isHidden: true)
        lastPriceFromLabel.isHidden = false
        self.lastPriceFromLabel.text = "down from"
        // Fallback on earlier versions
      }
    }
  }
  
  func widgetPerformUpdate(completionHandler: (@escaping (NCUpdateResult) -> Void)) {
    // Perform any setup necessary in order to update the view.
    
    // If an error is encountered, use NCUpdateResult.Failed
    // If there's no update required, use NCUpdateResult.NoData
    // If there's an update, use NCUpdateResult.NewData
    let userPreferredCurrency = TodayAPI.getUserPreferredCurrency();
    self.currencyLabel.text = userPreferredCurrency
    TodayAPI.fetchPrice(currency: userPreferredCurrency, completion: { (result, error) in
      DispatchQueue.main.async { [unowned self] in
        guard let result = result else {
          self.lastUpdatedDate.text = error?.localizedDescription
          completionHandler(.failed)
          return
        }
        
        guard let bpi = result["bpi"] as? Dictionary<String, Any>, let preferredCurrency = bpi[userPreferredCurrency] as? Dictionary<String, Any>, let rateString = preferredCurrency["rate"] as? String,
          let time = result["time"] as? Dictionary<String, Any>, let lastUpdatedString = time["updatedISO"] as? String
          else {
            self.lastUpdatedDate.text = "Obtained unexpected information."
            completionHandler(.failed)
            return
        }
        
        let latestRateDataStore = TodayDataStore(rate: rateString, lastUpdate: lastUpdatedString)
        
        if let lastStoredTodayStore = TodayData.getPriceRateAndLastUpdate(), lastStoredTodayStore.lastUpdate == latestRateDataStore.lastUpdate, rateString == lastStoredTodayStore.rate, TodayAPI.getLastSelectedCurrency() == userPreferredCurrency {
          if let cached = TodayData.getCachedPriceRateAndLastUpdate() {
            self.processCachedStoredRateAndLastUpdate(new: lastStoredTodayStore, cached: cached)
          } else {
            self.setLastPriceOutletsHidden(isHidden: true)
          }
          completionHandler(.noData)
        } else {
          self.processRateAndLastUpdate(todayStore: latestRateDataStore)
          let priceRiceAndLastUpdate = TodayData.getPriceRateAndLastUpdate()
          
          if let rate = priceRiceAndLastUpdate?.rate, let lastUpdate = priceRiceAndLastUpdate?.lastUpdate {
            TodayData.saveCachePriceRateAndLastUpdate(rate: rate, lastUpdate: lastUpdate);
          }
          
          if let latestRateDataStore = latestRateDataStore.rateDoubleValue, let lastStoredPriceNumber = priceRiceAndLastUpdate?.rateDoubleValue, TodayAPI.getLastSelectedCurrency() == userPreferredCurrency {
            
            if latestRateDataStore > lastStoredPriceNumber  {
              if #available(iOSApplicationExtension 13.0, *) {
                self.lastPriceArrowImage.image = UIImage(systemName: "arrow.up")
              } else {
                self.lastPriceFromLabel.isHidden = false
                self.lastPriceFromLabel.text = "up from"
              }
              self.setLastPriceOutletsHidden(isHidden: false)
            } else {
              if #available(iOSApplicationExtension 13.0, *) {
                self.lastPriceArrowImage.image = UIImage(systemName: "arrow.down")
              } else {
                // Fallback on earlier versions
                self.lastPriceFromLabel.isHidden = false
                self.lastPriceFromLabel.text = "down from"
              }
              self.setLastPriceOutletsHidden(isHidden: false)
            }
            self.lastPrice.text = priceRiceAndLastUpdate?.formattedRate
          } else {
            self.setLastPriceOutletsHidden(isHidden: true)
          }
          
          TodayData.savePriceRateAndLastUpdate(rate: latestRateDataStore.rate, lastUpdate: latestRateDataStore.lastUpdate)
          TodayAPI.saveNewSelectedCurrency()
          completionHandler(.newData)
        }
      }
    })
  }
  
}
