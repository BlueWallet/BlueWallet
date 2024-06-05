package io.bluewallet.bluewallet.tor

class TorState {
    var state : EnumTorState = EnumTorState.OFF
        get() = field
        set(value) {
            field = value
        }
    var progressIndicator : Int = 0
        get() = field
        set(value) {
            field = value
        }
}
