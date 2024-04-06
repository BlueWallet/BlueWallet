//  BlueWallet
//
//  Created by Marcos Rodriguez on 3/23/23.
//  Copyright © 2023 BlueWallet. All rights reserved.

import Foundation

/**
 `SwiftTCPClient` is a simple TCP client class that allows for establishing a TCP connection,
 sending data, and receiving data over the network. It supports both plain TCP and SSL-secured connections.

 The class uses `InputStream` and `OutputStream` for network communication, encapsulating the complexity of stream management and data transfer.

 - Note: When using SSL, this implementation disables certificate chain validation for simplicity. This is not recommended for production code due to security risks.

 ## Examples

 ### Creating an instance and connecting to a server:

 ```swift
 let client = SwiftTCPClient()
 let success = client.connect(to: "example.com", port: 12345, useSSL: false)

 if success {
     print("Connected successfully.")
 } else {
     print("Failed to connect.")
 }
**/

class SwiftTCPClient: NSObject {
    private var inputStream: InputStream?
    private var outputStream: OutputStream?
    private let bufferSize = 1024
    private var readData = Data()
    private let readTimeout = 5.0 // Timeout in seconds

     func connect(to host: String, port: UInt32, useSSL: Bool = false) -> Bool {
        var readStream: Unmanaged<CFReadStream>?
        var writeStream: Unmanaged<CFWriteStream>?

        CFStreamCreatePairWithSocketToHost(kCFAllocatorDefault, host as CFString, port, &readStream, &writeStream)

        guard let read = readStream?.takeRetainedValue(), let write = writeStream?.takeRetainedValue() else {
            return false
        }

        inputStream = read as InputStream
        outputStream = write as OutputStream

        if useSSL {
            // Configure SSL settings for the streams
            let sslSettings: [NSString: Any] = [
                kCFStreamSSLLevel as NSString: kCFStreamSocketSecurityLevelNegotiatedSSL as Any,
                kCFStreamSSLValidatesCertificateChain as NSString: kCFBooleanFalse as Any
                // Note: Disabling certificate chain validation (kCFStreamSSLValidatesCertificateChain: kCFBooleanFalse)
                // is typically not recommended for production code as it introduces significant security risks.
            ]
            inputStream?.setProperty(sslSettings, forKey: kCFStreamPropertySSLSettings as Stream.PropertyKey)
            outputStream?.setProperty(sslSettings, forKey: kCFStreamPropertySSLSettings as Stream.PropertyKey)
        }

        inputStream?.delegate = self
        outputStream?.delegate = self

        inputStream?.schedule(in: .current, forMode: RunLoop.Mode.default)
        outputStream?.schedule(in: .current, forMode: RunLoop.Mode.default)

        inputStream?.open()
        outputStream?.open()

        return true
    }
    

    func send(data: Data) -> Bool {
        guard let outputStream = outputStream else {
            return false
        }

        let bytesWritten = data.withUnsafeBytes { bufferPointer -> Int in
            guard let baseAddress = bufferPointer.baseAddress else {
                return 0
            }
            return outputStream.write(baseAddress.assumingMemoryBound(to: UInt8.self), maxLength: data.count)
        }

        return bytesWritten == data.count
    }

    func receive() throws -> Data {
    guard let inputStream = inputStream else {
        throw NSError(domain: "SwiftTCPClientError", code: 1, userInfo: [NSLocalizedDescriptionKey: "Input stream is nil."])
    }
    
    // Check if the input stream is ready for reading
    if inputStream.streamStatus != .open && inputStream.streamStatus != .reading {
        throw NSError(domain: "SwiftTCPClientError", code: 3, userInfo: [NSLocalizedDescriptionKey: "Stream is not ready for reading."])
    }

    readData = Data()

    // Wait for data to be available or timeout
    let timeoutDate = Date().addingTimeInterval(readTimeout)
    repeat {
        RunLoop.current.run(mode: RunLoop.Mode.default, before: Date(timeIntervalSinceNow: 0.1))
        if readData.count > 0 || Date() > timeoutDate {
            break
        }
    } while inputStream.streamStatus == .open || inputStream.streamStatus == .reading

    if readData.count == 0 && Date() > timeoutDate {
        throw NSError(domain: "SwiftTCPClientError", code: 2, userInfo: [NSLocalizedDescriptionKey: "Read timed out."])
    }

    return readData
}


    func close() {
        inputStream?.close()
        outputStream?.close()
        inputStream?.remove(from: .current, forMode: RunLoop.Mode.default)
        outputStream?.remove(from: .current, forMode: RunLoop.Mode.default)
        inputStream = nil
        outputStream = nil
    }
}

extension SwiftTCPClient: StreamDelegate {
    func stream(_ aStream: Stream, handle eventCode: Stream.Event) {
        switch eventCode {
        case .hasBytesAvailable:
            if aStream == inputStream, let inputStream = inputStream {
                let buffer = UnsafeMutablePointer<UInt8>.allocate(capacity: bufferSize)
                while inputStream.hasBytesAvailable {
                    let bytesRead = inputStream.read(buffer, maxLength: bufferSize)
                    if bytesRead > 0 {
                        readData.append(buffer, count: bytesRead)
                    }
                }
                buffer.deallocate()
            }
        case .errorOccurred:
            print("Stream error occurred")
        case .endEncountered:
            close()
        default:
            break
        }
    }
}
