package io.bluewallet.bluewallet

object ContinuityActivityRegistry {
    const val RECEIVE_ONCHAIN = "io.bluewallet.bluewallet.receiveonchain"
    const val XPUB = "io.bluewallet.bluewallet.xpub"
    const val VIEW_IN_BLOCK_EXPLORER = "io.bluewallet.bluewallet.blockexplorer"
    const val SEND_ONCHAIN = "io.bluewallet.bluewallet.sendonchain"
    const val SIGN_VERIFY = "io.bluewallet.bluewallet.signverify"
    const val IS_IT_MY_ADDRESS = "io.bluewallet.bluewallet.isitmyaddress"
    const val LIGHTNING_SETTINGS = "io.bluewallet.bluewallet.lightningsettings"

    fun activityTypeForRoute(route: String): String? = when (route.lowercase()) {
        "receiveonchain" -> RECEIVE_ONCHAIN
        "xpub" -> XPUB
        "blockexplorer" -> VIEW_IN_BLOCK_EXPLORER
        "sendonchain" -> SEND_ONCHAIN
        "signverify" -> SIGN_VERIFY
        "isitmyaddress" -> IS_IT_MY_ADDRESS
        "lightningsettings" -> LIGHTNING_SETTINGS
        else -> null
    }
}