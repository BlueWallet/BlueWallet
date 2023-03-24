//
//  File.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 3/23/23.
//  Copyright © 2023 BlueWallet. All rights reserved.
//

import Foundation

class TCPClient: NSObject {
  private var inputStream: InputStream?
   private var outputStream: OutputStream?
   private let bufferSize = 1024
   
   // Define the completion block type
   typealias ReceiveCompletion = (Result<String, Error>) -> Void
   
   // Add a completion block property
   var receiveCompletion: ReceiveCompletion?
  
    func connect(to host: String, port: UInt32) -> Bool {
        var readStream: Unmanaged<CFReadStream>?
        var writeStream: Unmanaged<CFWriteStream>?

        CFStreamCreatePairWithSocketToHost(kCFAllocatorDefault, host as CFString, port, &readStream, &writeStream)

        guard let read = readStream?.takeRetainedValue(), let write = writeStream?.takeRetainedValue() else {
            return false
        }

        inputStream = read as InputStream
        outputStream = write as OutputStream

        inputStream?.delegate = self
        outputStream?.delegate = self

        inputStream?.schedule(in: .current, forMode: .default)
        outputStream?.schedule(in: .current, forMode: .default)

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

    func receive() -> Data? {
        let data = NSMutableData()
        return data as Data
    }

    func close() {
        inputStream?.close()
        outputStream?.close()
        inputStream?.remove(from: .current, forMode: .default)
        outputStream?.remove(from: .current, forMode: .default)
        inputStream = nil
        outputStream = nil
    }
}

extension TCPClient: StreamDelegate {
    func stream(_ aStream: Stream, handle eventCode: Stream.Event) {
        switch eventCode {
        case .hasBytesAvailable:
            if let inputStream = aStream as? InputStream {
                let buffer = UnsafeMutablePointer<UInt8>.allocate(capacity: bufferSize)
                defer {
                    buffer.deallocate()
                }

                while inputStream.hasBytesAvailable {
                    let bytesRead = inputStream.read(buffer, maxLength: bufferSize)
                    if bytesRead > 0 {
                      et data = Data(bytes: buffer, count: bytesRead)
                      receiveCompletion?(.success(receivedString))
                    }
                }
            }
        case .hasSpaceAvailable, .openCompleted, .endEncountered, .errorOccurred:
            break
        default:
            break
        }
    }
}
