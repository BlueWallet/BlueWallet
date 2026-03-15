package io.bluewallet.bluewallet

import java.text.NumberFormat

data class MarketData(
    var nextBlock: String = "...",
    var sats: String = "...",
    var price: String = "...",
    var rate: Double = 0.0,
    var dateString: String = ""
) {
    val formattedNextBlock: String
        get() = when (nextBlock) {
            "...", "!" -> nextBlock
            else -> try {
                "${NumberFormat.getNumberInstance().format(nextBlock.toInt())} sat/vb"
            } catch (_: Exception) {
                "$nextBlock sat/vb"
            }
        }

    companion object {
        const val PREF_KEY = "market_data"
    }
}
