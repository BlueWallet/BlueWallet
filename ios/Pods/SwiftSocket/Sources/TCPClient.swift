//
//  Copyright (c) <2014>, skysent
//  All rights reserved.
//
//  Redistribution and use in source and binary forms, with or without
//  modification, are permitted provided that the following conditions are met:
//  1. Redistributions of source code must retain the above copyright
//  notice, this list of conditions and the following disclaimer.
//  2. Redistributions in binary form must reproduce the above copyright
//  notice, this list of conditions and the following disclaimer in the
//  documentation and/or other materials provided with the distribution.
//  3. All advertising materials mentioning features or use of this software
//  must display the following acknowledgement:
//  This product includes software developed by skysent.
//  4. Neither the name of the skysent nor the
//  names of its contributors may be used to endorse or promote products
//  derived from this software without specific prior written permission.
//
//  THIS SOFTWARE IS PROVIDED BY skysent ''AS IS'' AND ANY
//  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
//  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
//  DISCLAIMED. IN NO EVENT SHALL skysent BE LIABLE FOR ANY
//  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
//  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
//  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
//  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
//  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
//  SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//

import Foundation

@_silgen_name("ytcpsocket_connect") private func c_ytcpsocket_connect(_ host:UnsafePointer<Byte>,port:Int32,timeout:Int32) -> Int32
@_silgen_name("ytcpsocket_close") private func c_ytcpsocket_close(_ fd:Int32) -> Int32
@_silgen_name("ytcpsocket_bytes_available") private func c_ytcpsocket_bytes_available(_ fd:Int32) -> Int32
@_silgen_name("ytcpsocket_send") private func c_ytcpsocket_send(_ fd:Int32,buff:UnsafePointer<Byte>,len:Int32) -> Int32
@_silgen_name("ytcpsocket_pull") private func c_ytcpsocket_pull(_ fd:Int32,buff:UnsafePointer<Byte>,len:Int32,timeout:Int32) -> Int32
@_silgen_name("ytcpsocket_listen") private func c_ytcpsocket_listen(_ address:UnsafePointer<Int8>,port:Int32)->Int32
@_silgen_name("ytcpsocket_accept") private func c_ytcpsocket_accept(_ onsocketfd:Int32,ip:UnsafePointer<Int8>,port:UnsafePointer<Int32>,timeout:Int32) -> Int32
@_silgen_name("ytcpsocket_port") private func c_ytcpsocket_port(_ fd:Int32) -> Int32

open class TCPClient: Socket {
    /*
     * connect to server
     * return success or fail with message
     */
    open func connect(timeout: Int) -> Result {
        let rs: Int32 = c_ytcpsocket_connect(self.address, port: Int32(self.port), timeout: Int32(timeout))
        if rs > 0 {
            self.fd = rs
            return .success
        } else {
            switch rs {
            case -1:
                return .failure(SocketError.queryFailed)
            case -2:
                return .failure(SocketError.connectionClosed)
            case -3:
                return .failure(SocketError.connectionTimeout)
            default:
                return .failure(SocketError.unknownError)
            }
        }
    }

    /*
    * close socket
    * return success or fail with message
    */
    open func close() {
        guard let fd = self.fd else { return }
        
        _ = c_ytcpsocket_close(fd)
        self.fd = nil
    }
    
    /*
    * send data
    * return success or fail with message
    */
    open func send(data: [Byte]) -> Result {
        guard let fd = self.fd else { return .failure(SocketError.connectionClosed) }
        
        let sendsize: Int32 = c_ytcpsocket_send(fd, buff: data, len: Int32(data.count))
        if Int(sendsize) == data.count {
           return .success
        } else {
            return .failure(SocketError.unknownError)
        }
    }
    
    /*
    * send string
    * return success or fail with message
    */
    open func send(string: String) -> Result {
        guard let fd = self.fd else { return .failure(SocketError.connectionClosed) }
      
        let sendsize = c_ytcpsocket_send(fd, buff: string, len: Int32(strlen(string)))
        if sendsize == Int32(strlen(string)) {
            return .success
        } else {
            return .failure(SocketError.unknownError)
        }
    }
    
    /*
    *
    * send nsdata
    */
    open func send(data: Data) -> Result {
        guard let fd = self.fd else { return .failure(SocketError.connectionClosed) }
      
        var buff = [Byte](repeating: 0x0,count: data.count)
        (data as NSData).getBytes(&buff, length: data.count)
        let sendsize = c_ytcpsocket_send(fd, buff: buff, len: Int32(data.count))
        if sendsize == Int32(data.count) {
            return .success
        } else {
            return .failure(SocketError.unknownError)
        }
    }
    
    /*
    * read data with expect length
    * return success or fail with message
    */
    open func read(_ expectlen:Int, timeout:Int = -1) -> [Byte]? {
        guard let fd:Int32 = self.fd else { return nil }
      
        var buff = [Byte](repeating: 0x0,count: expectlen)
        let readLen = c_ytcpsocket_pull(fd, buff: &buff, len: Int32(expectlen), timeout: Int32(timeout))
        if readLen <= 0 { return nil }
        let rs = buff[0...Int(readLen-1)]
        let data: [Byte] = Array(rs)
      
        return data
    }

    /*
    * gets byte available for reading
    */
    open func bytesAvailable() -> Int32? {
        guard let fd:Int32 = self.fd else { return nil }

        let bytesAvailable = c_ytcpsocket_bytes_available(fd);

        if (bytesAvailable < 0) {
            return nil
        }

        return bytesAvailable
    }
}

open class TCPServer: Socket {

    open func listen() -> Result {
        let fd = c_ytcpsocket_listen(self.address, port: Int32(self.port))
        if fd > 0 {
            self.fd = fd
            
            // If port 0 is used, get the actual port number which the server is listening to
            if (self.port == 0) {
                let p = c_ytcpsocket_port(fd)
                if (p == -1) {
                    return .failure(SocketError.unknownError)
                } else {
                    self.port = p
                }
            }
            
            return .success
        } else {
            return .failure(SocketError.unknownError)
        }
    }
    
    open func accept(timeout :Int32 = 0) -> TCPClient? {
        guard let serferfd = self.fd else { return nil }
        
        var buff: [Int8] = [Int8](repeating: 0x0,count: 16)
        var port: Int32 = 0
        let clientfd: Int32 = c_ytcpsocket_accept(serferfd, ip: &buff, port: &port, timeout: timeout)
        
        guard clientfd >= 0 else { return nil }
        guard let address = String(cString: buff, encoding: String.Encoding.utf8) else { return nil }
        
        let client = TCPClient(address: address, port: port)
        client.fd = clientfd
            
        return client
    }
    
    open func close() {
        guard let fd: Int32=self.fd else { return }
      
        _ = c_ytcpsocket_close(fd)
        self.fd = nil
    }
}
