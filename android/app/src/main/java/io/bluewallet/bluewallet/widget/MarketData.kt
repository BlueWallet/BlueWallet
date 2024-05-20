package io.bluewallet.bluewallet.widget

import kotlinx.serialization.Serializable
import java.text.SimpleDateFormat
import java.util.*

@Serializable
data class MarketData(
    val rate: String,
    val lastUpdate: String
) {
    fun getFormattedDate(): String? {
        return try {
            val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.getDefault())
            isoFormat.timeZone = TimeZone.getTimeZone("UTC")
            val date = isoFormat.parse(lastUpdate)
            val formattedDate = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault())
            date?.let { formattedDate.format(it) }
        } catch (e: Exception) {
            null
        }
    }
}
