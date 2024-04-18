//
//  Numeric+abbreviated.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 4/14/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//

import Foundation

extension Numeric {
    
    var abbreviated: String {
      let bytecountFormatter = ByteCountFormatter()
      bytecountFormatter.zeroPadsFractionDigits = true
      bytecountFormatter.countStyle = .decimal
      bytecountFormatter.isAdaptive = false
      let bytesString = bytecountFormatter.string(fromByteCount: (self as! NSNumber).int64Value)
      
        let numericString = bytesString
            .replacingOccurrences(of: "bytes", with: "")
            .replacingOccurrences(of: "B", with: "") // removes B (bytes) in 'KB'/'MB'/'GB'
            .replacingOccurrences(of: "G", with: "B") // replace G (Giga) to just B (billions)
        return numericString.replacingOccurrences(of: " ", with: "")
    }
  
}
