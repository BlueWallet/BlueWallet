//
//  XMLParserDelegate.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 11/13/23.
//  Copyright © 2023 BlueWallet. All rights reserved.
//

import Foundation

class BNRXMLParserDelegate: NSObject, XMLParserDelegate {
    var usdRate: Double?
    var currentElement = ""
    var foundRate = false

    func parser(_ parser: XMLParser, didStartElement elementName: String, namespaceURI: String?, qualifiedName qName: String?, attributes attributeDict: [String : String] = [:]) {
        currentElement = elementName
        if elementName == "Rate" && attributeDict["currency"] == "USD" {
            foundRate = true
        }
    }

    func parser(_ parser: XMLParser, foundCharacters string: String) {
        if foundRate {
            usdRate = Double(string)
            foundRate = false
        }
    }
}
