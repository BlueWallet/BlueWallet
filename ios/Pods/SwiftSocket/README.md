# SwiftSocket
[![CocoaPods Compatible](https://img.shields.io/cocoapods/v/SwiftSocket.svg)](https://cocoapods.org/pods/SwiftSocket)
[![CocoaPods Platforms](https://img.shields.io/cocoapods/p/SwiftSocket.svg)](https://img.shields.io/cocoapods/p/SwiftSocket.svg)
[![Carthage Compatible](https://img.shields.io/badge/Carthage-compatible-4BC51D.svg?style=flat)](https://github.com/Carthage/Carthage)

SwiftSocket library provides as easy to use interface for socket based connections on server or client side.
Supports both TCP and UDP sockets.


# Installation
## Cocoapods
Add this to your `Podfile`:
```ruby
pod 'SwiftSocket'
```
And run then `pod install`

## Carthage
```ruby
github "swiftsocket/SwiftSocket"
```

# Code examples

## Create client socket
``` swift
// Create a socket connect to www.apple.com and port at 80
let client = TCPClient(address: "www.apple.com", port: 80)
```
## Connect with timeout
You can also set timeout to `-1` or leave parameters empty (`client.connect()`) to turn off connection timeout.
``` swift
 switch client.connect(timeout: 10) {
   case .success:
     // Connection successful 🎉
   case .failure(let error):
     // 💩
 }
```

## Send data
``` swift
let data: Data = // ... Bytes you want to send
let result = client.send(data: data)
```

## Read data
``` swift
var data = client.read(1024*10) //return optional [Int8]
```

## Close socket
``` swift
client.close()
```

## Client socket example
``` swift
let client = TCPClient(address: "www.apple.com", port: 80)
switch client.connect(timeout: 1) {
  case .success:
    switch client.send(string: "GET / HTTP/1.0\n\n" ) {
      case .success:
        guard let data = client.read(1024*10) else { return }

        if let response = String(bytes: data, encoding: .utf8) {
          print(response)
        }
      case .failure(let error):
        print(error)
    }
  case .failure(let error):
    print(error)
}

```

## Server socket example (echo server)
``` swift
func echoService(client: TCPClient) {
    print("Newclient from:\(client.address)[\(client.port)]")
    var d = client.read(1024*10)
    client.send(data: d!)
    client.close()
}

func testServer() {
    let server = TCPServer(address: "127.0.0.1", port: 8080)
    switch server.listen() {
      case .success:
        while true {
            if var client = server.accept() {
                echoService(client: client)
            } else {
                print("accept error")
            }
        }
      case .failure(let error):
        print(error)
    }
}
```
