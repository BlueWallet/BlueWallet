import Foundation

import libportal_ios

func convertDataToNSNumberArray(data: Data) -> NSArray {
    var numberArray: [NSNumber] = []
    let bytes = [UInt8](data)

    for byte in bytes {
        let number = NSNumber(value: byte)
        numberArray.append(number)
    }
    let nsNumberArray = NSArray(array: numberArray)
    
    return nsNumberArray
}

func convertNSArrayToData(nsNumberArray: NSArray) -> Data? {
    let byteArray = nsNumberArray.compactMap { ($0 as? NSNumber)?.uint8Value }
    
    return Data(byteArray)
}

@objc(LibportalReactNative)
class LibportalReactNative: NSObject {
    private var sdk: PortalSdk? = nil

    @objc func constructor(_ useFastOps: Bool, withResolver resolve: RCTPromiseResolveBlock, withRejecter reject: RCTPromiseRejectBlock) -> Void {
        self.sdk = PortalSdk(useFastOps: useFastOps)
        resolve(nil)
    }
    
    @objc func poll(_ resolve: @escaping RCTPromiseResolveBlock, withRejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
        Task {
            do {
                let nfcOut = try await self.sdk?.poll()
                let dict: NSDictionary = [
                    "msgIndex": nfcOut?.msgIndex as Any,
                    "data": convertDataToNSNumberArray(data: nfcOut!.data) as Any,
                ]
                resolve(dict)
            }
            catch {
                reject("Error", error.localizedDescription, error)
            }
        }
    }
    
    @objc func newTag(_ resolve: @escaping RCTPromiseResolveBlock, withRejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
        Task {
            do {
                try await self.sdk?.newTag()
                resolve(nil)
            }
            catch {
                reject("Error", error.localizedDescription, error)
            }
        }
    }
    
    @objc func incomingData(_ msgIndex: NSNumber, data: NSArray, withResolver resolve: @escaping RCTPromiseResolveBlock, withRejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
        let data = convertNSArrayToData(nsNumberArray: data)
        
        Task {
            do {
                try await self.sdk?.incomingData(msgIndex: UInt64(truncating: msgIndex), data: data!)
                resolve(nil)
            }
            catch {
                reject("Error", error.localizedDescription, error)
            }
        }
    }
    
    @objc func getStatus(_ resolve: @escaping RCTPromiseResolveBlock, withRejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
        Task {
            do {
                let status = try await self.sdk?.getStatus()
                let dict: NSDictionary = [
                    "initialized": status?.initialized as Any,
                    "unlocked": status?.unlocked as Any,
                    "network": status?.network as Any,
                ]
                resolve(dict)
            }
            catch {
                reject("Error", error.localizedDescription, error)
            }
        }
    }
    
    @objc func generateMnemonic(_ words: NSString, network: NSString, pair_code: NSString?, withResolver resolve: @escaping RCTPromiseResolveBlock, withRejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
        let numWords: GenerateMnemonicWords
        switch words {
            case "Words12":
                numWords = GenerateMnemonicWords.words12
            case "Words24":
                numWords = GenerateMnemonicWords.words24
            default:
                reject("Error", "Invalid numWords", nil)
                return
        }
        let network = network as String
        let pair_code = pair_code as String?
        
        Task {
            do {
                try await self.sdk?.generateMnemonic(numWords: numWords, network: network, password: pair_code)
                resolve(nil)
            }
            catch {
                reject("Error", error.localizedDescription, error)
            }
        }
    }
    
    @objc func restoreMnemonic(_ words: NSString, network: NSString, pair_code: NSString?, withResolver resolve: @escaping RCTPromiseResolveBlock, withRejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
        let words = words as String
        let network = network as String
        let pair_code = pair_code as String?
        
        Task {
            do {
                try await self.sdk?.restoreMnemonic(mnemonic: words, network: network, password: pair_code)
                resolve(nil)
            }
            catch {
                reject("Error", error.localizedDescription, error)
            }
        }
    }
    
    @objc func unlock(_ pair_code: NSString, withResolver resolve: @escaping RCTPromiseResolveBlock, withRejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
        let pair_code = pair_code as String
        
        Task {
            do {
                try await self.sdk?.unlock(password: pair_code)
                resolve(nil)
            }
            catch {
                reject("Error", error.localizedDescription, error)
            }
        }
    }
    
    @objc func resume(_ resolve: @escaping RCTPromiseResolveBlock, withRejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
        Task {
            do {
                // try await self.sdk?.resume()
                resolve(nil)
            }
            catch {
                reject("Error", error.localizedDescription, error)
            }
        }
    }
    
    @objc func displayAddress(_ index: NSNumber, withResolver resolve: @escaping RCTPromiseResolveBlock, withRejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
        let index = UInt32(truncating: index)
        
        Task {
            do {
                let address = try await self.sdk?.displayAddress(index: index)
                resolve(address)
            }
            catch {
                reject("Error", error.localizedDescription, error)
            }
        }
    }
    
    @objc func signPsbt(_ psbt: NSString, withResolver resolve: @escaping RCTPromiseResolveBlock, withRejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
        let psbt = psbt as String
        
        Task {
            do {
                let psbt = try await self.sdk?.signPsbt(psbt: psbt)
                resolve(psbt)
            }
            catch {
                reject("Error", error.localizedDescription, error)
            }
        }
    }
    
    @objc func publicDescriptors(_ resolve: @escaping RCTPromiseResolveBlock, withRejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
        Task {
            do {
                let desc = try await self.sdk?.publicDescriptors()
                let dict: NSDictionary = [
                    "external": desc?.external as Any,
                    "internal": desc?.internal as Any,
                ]
                resolve(dict)
            }
            catch {
                reject("Error", error.localizedDescription, error)
            }
        }
    }
    
    @objc func updateFirmware(_ binary: NSArray, withResolver resolve: @escaping RCTPromiseResolveBlock, withRejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
        let binary = convertNSArrayToData(nsNumberArray: binary)
        
        Task {
            do {
                try await self.sdk?.updateFirmware(binary: binary!)
                resolve(nil)
            }
            catch {
                reject("Error", error.localizedDescription, error)
            }
        }
    }
}
