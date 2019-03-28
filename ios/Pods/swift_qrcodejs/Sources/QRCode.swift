/*
 Copyright (c) 2017 Zhiyu Zhu/朱智语

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
 */


/// QRCode abstraction and generator.
open class QRCode {
    /// Content.
    public let text: String
    /// Error correct level.
    public let correctLevel: QRErrorCorrectLevel
    /// If the image codes has a border around its content.
    public let hasBorder: Bool
    private let typeNumber: Int
    private let model: QRCodeModel

    /// Construct a QRCode instance.
    ///
    /// - Parameters:
    ///   - text: content of the QRCode.
    ///   - errorCorrectLevel: error correct level, defaults to high.
    ///   - hasBorder: if the image codes has a border around, defaults and suggests to be true.
    ///
    /// - Warning: Is computationally intensive.
    public init?(_ text: String,
                 errorCorrectLevel: QRErrorCorrectLevel = .H,
                 withBorder hasBorder: Bool = true) {
        guard let typeNumber = try? QRCodeType.typeNumber(of: text, errorCorrectLevel: errorCorrectLevel)
            , let model = QRCodeModel(text: text, typeNumber: typeNumber, errorCorrectLevel: errorCorrectLevel)
            else { return nil }
        self.typeNumber = typeNumber
        self.model = model
        self.text = text
        self.correctLevel = errorCorrectLevel
        self.hasBorder = hasBorder
    }

    /// QRCode in binary form.
    open private(set) lazy var imageCodes: [[Bool]] = {
        if hasBorder {
            let line = [[Bool](repeating: false, count: model.moduleCount + 2)]
            return line + (0..<model.moduleCount).map { r in
                return [false] + (0..<model.moduleCount).map { c in
                    return model.isDark(r, c)
                } + [false]
            } + line
        } else {
            return (0..<model.moduleCount).map { r in
                (0..<model.moduleCount).map { c in
                    return model.isDark(r, c)
                }
            }
        }
    }()

    /// Convert QRCode to String.
    ///
    /// - Parameters:
    ///   - black: recommend to be "\u{1B}[7m  " or "##".
    ///   - white: recommend to be "\u{1B}[0m  " or "  ".
    /// - Returns: a matrix of characters that is scannable.
    open func toString(filledWith black: Any,
                       patchedWith white: Any) -> String {
        return String(imageCodes.reduce("") { $0 +
            "\($1.reduce("") { "\($0)\($1 ? black : white)" })\n"
        }.dropLast())
    }
}
