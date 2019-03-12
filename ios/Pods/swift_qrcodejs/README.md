# swift_qrcodejs

[![CocoaPods Version](https://img.shields.io/cocoapods/v/swift_qrcodejs.svg?style=flat)](http://cocoapods.org/pods/swift_qrcodejs)
[![CocoaPods Compatible Platforms](https://img.shields.io/cocoapods/p/swift_qrcodejs.svg?style=flat)](http://cocoapods.org/pods/swift_qrcodejs)
[![Swift Package Manager Compatible](https://img.shields.io/badge/SPM-compatible-brightgreen.svg)](https://swift.org/package-manager/)
[![Carthage Compatible](https://img.shields.io/badge/Carthage-compatible-4BC51D.svg?style=flat)](https://github.com/Carthage/Carthage)

[![Swift 4.2](https://img.shields.io/badge/Swift-4.2-ffac45.svg)](https://swift.org)
[![MIT License](https://img.shields.io/github/license/ApolloZhu/swift_qrcodejs.svg)](./LICENSE)
[![Build Status](https://travis-ci.org/ApolloZhu/swift_qrcodejs.svg?branch=master)](https://travis-ci.org/ApolloZhu/swift_qrcodejs)
[![Code Coverage](https://codecov.io/gh/ApolloZhu/swift_qrcodejs/branch/master/graphs/badge.svg)](https://codecov.io/gh/ApolloZhu/swift_qrcodejs/branch/master)
[![Documentation](https://apollozhu.github.io/swift_qrcodejs/badge.svg)](https://apollozhu.github.io/swift_qrcodejs)


Cross-platform QRCode generator written in pure Swift, aiming to solve the awkward situation that there's no CIFilter for QRCode generation on Apple Watches.

## Installation

<details>
<summary><strong>Swift Package Manager</strong></summary>

```swift
dependencies: [
    .package(url: "https://github.com/ApolloZhu/swift_qrcodejs.git", from: "1.0.1"),
]
```

</details>

<details>
<summary><strong>CocoaPods</strong></summary>

```ruby
pod 'swift_qrcodejs'
```

</details>

<details>
<summary><strong>Carthage</strong></summary>

```ruby
github "ApolloZhu/swift_qrcodejs" ~> 1.0.1
```

</details>

<details>
<summary><strong>Manually</strong></summary>

Copy all the `.swift` files from the `Sources` folder into your project.

</details>

## Usage

```swift
import swift_qrcodejs

guard let qrCode = QRCode("Hello World!") else {
    fatalError("Failed to generate QRCode")
}
print(qrCode.toString(filledWith: "##", patchedWith: "  "))
```

For more, checkout the [documentation](https://apollozhu.github.io/swift_qrcodejs).

## Example Projects

- [swift_qrcodejs-cli](./Example/main.swift): lightweight command line tool to generate QRCodes.
- [EFQRCode](https://github.com/EyreFree/EFQRCode): popular Swift framework that generates stylized QRCode images.
- [Apple Watch Bilibili](https://github.com/ApolloZhu/Apple-Watch-Bilibili): login onto bilibili with QRCode.

## License

MIT License. Modified based on [qrcodejs](https://github.com/davidshimjs/qrcodejs).
 See [LICENSE](./LICENSE) and each individual file header for more information.
