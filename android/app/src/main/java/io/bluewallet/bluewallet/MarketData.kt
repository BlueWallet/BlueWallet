package io.bluewallet.bluewallet

import java.text.NumberFormat
import java.util.Locale
import java.util.Date

data class MarketData(
    var nextBlock: String = "...",
    var sats: String = "...",
    var price: String = "...",
    var rate: Double = 0.0,
    var dateString: String = ""
) {
    val formattedNextBlock: String
        get() {
            if (nextBlock == "..." || nextBlock == "!") {
                return "..."
            } else {
                try {
                    val nextBlockInt = nextBlock.toInt()
                    val numberFormatter = NumberFormat.getNumberInstance()
                    return "${numberFormatter.format(nextBlockInt)} sat/vb"
                } catch (e: Exception) {
                    return "$nextBlock sat/vb"
                }
            }
        }
    
    val formattedDate: String?
        get() {
            if (dateString.isEmpty()) return null
            
            try {
                // Simple implementation - proper implementation would parse ISO8601
                return Date().toString()
            } catch (e: Exception) {
                return null
            }
        }
        
    companion object {
        const val PREF_KEY = "market_data"
    }
}
