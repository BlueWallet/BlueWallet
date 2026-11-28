import Carbon
import Foundation

// XCTest resolves character keys through the current input source. Select an ASCII
// layout for native shortcut tests, then restore the user's source in Jest teardown.
func identifier(_ source: TISInputSource) -> String {
    let pointer = TISGetInputSourceProperty(source, kTISPropertyInputSourceID)!
    return Unmanaged<CFString>.fromOpaque(pointer).takeUnretainedValue() as String
}

let previous = TISCopyCurrentKeyboardInputSource().takeRetainedValue()
let sources = TISCreateInputSourceList(nil, false).takeRetainedValue() as! [TISInputSource]
let requested = CommandLine.arguments.dropFirst().first ?? "ascii"
let target: TISInputSource?
if requested == "ascii" {
    target = sources.first { ["com.apple.keylayout.ABC", "com.apple.keylayout.US"].contains(identifier($0)) }
} else {
    target = sources.first { identifier($0) == requested }
}
guard let target, TISSelectInputSource(target) == noErr else {
    fputs("Cannot select keyboard source \(requested). Enable the ABC or US input source for XCTest.\n", stderr)
    exit(1)
}
print(identifier(previous))
