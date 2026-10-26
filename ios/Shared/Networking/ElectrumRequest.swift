import Foundation

struct ElectrumRequest<Parameters: Encodable>: Encodable {
    let id: Int
    let method: String
    let params: Parameters
}

extension JSONEncoder {
    func encodeElectrumMessage<Value: Encodable>(_ value: Value) throws -> Data {
        var data = try encode(value)
        data.append(0x0A) // Electrum JSON-RPC messages are newline-delimited.
        return data
    }
}
