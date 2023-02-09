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

@_silgen_name("yudpsocket_server") func c_yudpsocket_server(_ host:UnsafePointer<Int8>,port:Int32) -> Int32
@_silgen_name("yudpsocket_recive") func c_yudpsocket_recive(_ fd:Int32,buff:UnsafePointer<Byte>,len:Int32,ip:UnsafePointer<Int8>,port:UnsafePointer<Int32>) -> Int32
@_silgen_name("yudpsocket_close") func c_yudpsocket_close(_ fd:Int32) -> Int32
@_silgen_name("yudpsocket_client") func c_yudpsocket_client() -> Int32
@_silgen_name("yudpsocket_get_server_ip") func c_yudpsocket_get_server_ip(_ host:UnsafePointer<Int8>,ip:UnsafePointer<Int8>) -> Int32
@_silgen_name("yudpsocket_sentto") func c_yudpsocket_sentto(_ fd:Int32,buff:UnsafePointer<Byte>,len:Int32,ip:UnsafePointer<Int8>,port:Int32) -> Int32
@_silgen_name("enable_broadcast") func c_enable_broadcast(_ fd:Int32)

open class UDPClient: Socket {
    public override init(address: String, port: Int32) {
        let remoteipbuff: [Int8] = [Int8](repeating: 0x0,count: 16)
        let ret = c_yudpsocket_get_server_ip(address, ip: remoteipbuff)
        guard let ip = String(cString: remoteipbuff, encoding: String.Encoding.utf8), ret == 0 else {
            super.init(address: "", port: 0) //TODO: change to init?
            return
        }
        
        super.init(address: ip, port: port)
      
        let fd: Int32 = c_yudpsocket_client()
        if fd > 0 {
            self.fd = fd
        }
    }
    
    /*
    * send data
    * return success or fail with message
    */
    open func send(data: [Byte]) -> Result {
        guard let fd = self.fd else { return .failure(SocketError.connectionClosed) }
        
        let sendsize: Int32 = c_yudpsocket_sentto(fd, buff: data, len: Int32(data.count), ip: self.address, port: Int32(self.port))
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
        
        let sendsize = c_yudpsocket_sentto(fd, buff: string, len: Int32(strlen(string)), ip: address, port: port)
        if sendsize == Int32(strlen(string)) {
            return .success
        } else {
            return .failure(SocketError.unknownError)
        }
    }
    
    /*
    * enableBroadcast
    */
    open func enableBroadcast() {
        guard let fd: Int32 = self.fd else { return }
        
        c_enable_broadcast(fd)
    }
    
    /*
    *
    * send nsdata
    */
    open func send(data: Data) -> Result {
        guard let fd = self.fd else { return .failure(SocketError.connectionClosed) }
        
        var buff = [Byte](repeating: 0x0,count: data.count)
        (data as NSData).getBytes(&buff, length: data.count)
        let sendsize = c_yudpsocket_sentto(fd, buff: buff, len: Int32(data.count), ip: address, port: port)
        if sendsize == Int32(data.count) {
            return .success
        } else {
            return .failure(SocketError.unknownError)
        }
    }
    
    //TODO add multycast and boardcast
    open func recv(_ expectlen: Int) -> ([Byte]?, String, Int) {
        guard let fd = self.fd else {
            return (nil, "no ip", 0)
        }
        let buff: [Byte] = [Byte](repeating: 0x0, count: expectlen)
        var remoteipbuff: [Int8] = [Int8](repeating: 0x0, count: 16)
        var remoteport: Int32 = 0
        let readLen: Int32 = c_yudpsocket_recive(fd, buff: buff, len: Int32(expectlen), ip: &remoteipbuff, port: &remoteport)
        let port: Int = Int(remoteport)
        let address = String(cString: remoteipbuff, encoding: String.Encoding.utf8) ?? ""
        
        if readLen <= 0 {
            return (nil, address, port)
        }

        let data: [Byte] = Array(buff[0..<Int(readLen)])
        return (data, address, port)
    }
    
    open func close() {
        guard let fd = self.fd else { return }
        
        _ = c_yudpsocket_close(fd)
        self.fd = nil
    }
    //TODO add multycast and boardcast
}

open class UDPServer: Socket {
    
    public override init(address: String, port: Int32) {
        super.init(address: address, port: port)
      
        let fd = c_yudpsocket_server(address, port: port)
        if fd > 0 { 
            self.fd = fd
        }
    }
  
    //TODO add multycast and boardcast
    open func recv(_ expectlen: Int) -> ([Byte]?, String, Int) {
        if let fd = self.fd {
            let buff: [Byte] = [Byte](repeating: 0x0,count: expectlen)
            var remoteipbuff: [Int8] = [Int8](repeating: 0x0,count: 16)
            var remoteport: Int32 = 0
            let readLen: Int32 = c_yudpsocket_recive(fd, buff: buff, len: Int32(expectlen), ip: &remoteipbuff, port: &remoteport)
            let port: Int = Int(remoteport)
            var address = ""
            if let ip = String(cString: remoteipbuff, encoding: String.Encoding.utf8) {
                address = ip
            }
          
            if readLen <= 0 {
                return (nil, address, port)
            }
          
            let rs = buff[0...Int(readLen-1)]
            let data: [Byte] = Array(rs)
            return (data, address, port)
        }
      
        return (nil, "no ip", 0)
    }
  
    open func close() {
        guard let fd = self.fd else { return }
        
        _ = c_yudpsocket_close(fd)
        self.fd = nil
    }
}
