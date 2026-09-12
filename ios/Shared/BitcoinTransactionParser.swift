import CryptoKit
import Foundation

struct ParsedBitcoinTransaction: Equatable {
    struct Input: Equatable {
        let previousTransactionID: String
        let previousOutputIndex: UInt32
    }

    struct Output: Equatable {
        let value: Int64
        let script: Data
    }

    let inputs: [Input]
    let outputs: [Output]
}

enum BitcoinTransactionParserError: Error {
    case invalidHex
    case truncated
    case invalidValue
}

enum BitcoinTransactionParser {
    static func parse(hex: String) throws -> ParsedBitcoinTransaction {
        guard let data = Data(hex: hex) else { throw BitcoinTransactionParserError.invalidHex }
        var reader = BitcoinDataReader(data: data)

        try reader.skip(4) // version
        let isSegWit = reader.peek() == 0 && reader.peek(offsetBy: 1) != 0
        if isSegWit { try reader.skip(2) }

        let inputCount = try reader.readCount()
        var inputs: [ParsedBitcoinTransaction.Input] = []
        inputs.reserveCapacity(inputCount)

        for _ in 0..<inputCount {
            let previousHash = try reader.read(32)
            let previousOutputIndex = try reader.readUInt32()
            try reader.skip(try reader.readCount())
            try reader.skip(4) // sequence

            inputs.append(
                ParsedBitcoinTransaction.Input(
                    previousTransactionID: previousHash.reversed().hexString,
                    previousOutputIndex: previousOutputIndex
                )
            )
        }

        let outputCount = try reader.readCount()
        var outputs: [ParsedBitcoinTransaction.Output] = []
        outputs.reserveCapacity(outputCount)

        for _ in 0..<outputCount {
            let unsignedValue = try reader.readUInt64()
            guard unsignedValue <= UInt64(Int64.max) else { throw BitcoinTransactionParserError.invalidValue }
            let script = try reader.read(try reader.readCount())
            outputs.append(ParsedBitcoinTransaction.Output(value: Int64(unsignedValue), script: script))
        }

        if isSegWit {
            for _ in 0..<inputCount {
                for _ in 0..<(try reader.readCount()) {
                    try reader.skip(try reader.readCount())
                }
            }
        }

        try reader.skip(4) // lock time
        return ParsedBitcoinTransaction(inputs: inputs, outputs: outputs)
    }

    static func electrumScriptHash(for script: Data) -> String {
        Data(SHA256.hash(data: script)).reversed().hexString
    }
}

private struct BitcoinDataReader {
    let data: Data
    private(set) var offset = 0

    func peek(offsetBy additionalOffset: Int = 0) -> UInt8? {
        let index = offset + additionalOffset
        guard data.indices.contains(index) else { return nil }
        return data[index]
    }

    mutating func read(_ count: Int) throws -> Data {
        guard count >= 0, offset <= data.count, count <= data.count - offset else {
            throw BitcoinTransactionParserError.truncated
        }
        defer { offset += count }
        return data.subdata(in: offset..<(offset + count))
    }

    mutating func skip(_ count: Int) throws {
        _ = try read(count)
    }

    mutating func readUInt32() throws -> UInt32 {
        UInt32(try readLittleEndian(byteCount: 4))
    }

    mutating func readUInt64() throws -> UInt64 {
        try readLittleEndian(byteCount: 8)
    }

    mutating func readCount() throws -> Int {
        let prefix = try read(1)[0]
        let value: UInt64
        switch prefix {
        case 0xfd:
            value = try readLittleEndian(byteCount: 2)
        case 0xfe:
            value = try readLittleEndian(byteCount: 4)
        case 0xff:
            value = try readLittleEndian(byteCount: 8)
        default:
            value = UInt64(prefix)
        }

        guard value <= UInt64(Int.max) else { throw BitcoinTransactionParserError.invalidValue }
        return Int(value)
    }

    private mutating func readLittleEndian(byteCount: Int) throws -> UInt64 {
        let bytes = try read(byteCount)
        return bytes.enumerated().reduce(into: UInt64(0)) { value, item in
            value |= UInt64(item.element) << UInt64(item.offset * 8)
        }
    }
}

private extension Data {
    init?(hex: String) {
        guard hex.count.isMultiple(of: 2) else { return nil }
        var data = Data(capacity: hex.count / 2)
        var index = hex.startIndex

        while index < hex.endIndex {
            let nextIndex = hex.index(index, offsetBy: 2)
            guard let byte = UInt8(hex[index..<nextIndex], radix: 16) else { return nil }
            data.append(byte)
            index = nextIndex
        }

        self = data
    }
}

private extension Collection where Element == UInt8 {
    var hexString: String {
        map { String(format: "%02x", $0) }.joined()
    }
}
