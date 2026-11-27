package org.neurai.neuraiwallet

import android.content.Context
import android.icu.text.CompactDecimalFormat
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.io.IOException
import java.text.DecimalFormat
import java.text.NumberFormat
import java.util.Currency
import java.util.Locale
import java.util.concurrent.TimeUnit
import kotlin.math.abs
import kotlin.math.floor
import kotlin.math.log10
import kotlin.math.max
import kotlin.math.min

/**
 * One reading of the XNA market, in one currency: the one the user picked in
 * the app, or USD when CoinGecko has no rate for it (`currency` says which).
 */
data class NeuraiQuote(
    val currency: String,
    val price: Double,
    /** Percent change over 24 hours. */
    val change24h: Double?,
    val marketCap: Double?,
    val volume24h: Double?,
    /** When it was fetched, in milliseconds. */
    val fetchedAt: Long,
    /** The currency that was asked for (`currency` is USD when CoinGecko had no rate for it). */
    val requested: String = currency,
) {
    fun toJson(): String = JSONObject().apply {
        put("currency", currency)
        put("price", price)
        change24h?.let { put("change24h", it) }
        marketCap?.let { put("marketCap", it) }
        volume24h?.let { put("volume24h", it) }
        put("fetchedAt", fetchedAt)
        put("requested", requested)
    }.toString()

    companion object {
        fun fromJson(raw: String?): NeuraiQuote? = try {
            raw?.let { JSONObject(it) }?.let { json ->
                NeuraiQuote(
                    currency = json.getString("currency"),
                    price = json.getDouble("price"),
                    change24h = json.optDouble("change24h").takeIf { it.isFinite() },
                    marketCap = json.optDouble("marketCap").takeIf { it.isFinite() },
                    volume24h = json.optDouble("volume24h").takeIf { it.isFinite() },
                    fetchedAt = json.getLong("fetchedAt"),
                    requested = json.optString("requested").ifBlank { json.getString("currency") },
                ).takeIf { it.price > 0 }
            }
        } catch (e: Exception) {
            null
        }
    }
}

/**
 * The XNA market data for the home-screen widgets: the same source the app
 * uses for its exchange rate (CoinGecko, `ids=neurai`), one request for both
 * widgets. Nothing about the user's wallets is sent.
 */
object NeuraiMarket {
    private const val TAG = "NeuraiMarket"
    const val SHARED_PREF_NAME = "group.io.bluewallet.bluewallet"
    private const val QUOTE_KEY = "neurai_widget_quote"
    /** Keys the Bitcoin widgets kept in the app's preferences; removed once. */
    private val LEGACY_KEYS = listOf(
        "previous_price",
        "market_data",
        "market_widget_last_online_status",
        "market_widget_last_update_time",
        "market_widget_rate_limited_time",
    )

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    fun url(currency: String): String {
        val code = currency.lowercase(Locale.ROOT)
        val currencies = if (code == "usd") "usd" else "$code,usd"
        return "https://api.coingecko.com/api/v3/simple/price?ids=neurai&vs_currencies=$currencies" +
            "&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true"
    }

    /**
     * Fetches a quote. Null when the service could not be reached or answered
     * something unusable; the widgets keep showing the last good quote then.
     * @throws RateLimitException when the service asks to slow down.
     */
    suspend fun fetch(currency: String): NeuraiQuote? = withContext(Dispatchers.IO) {
        val request = Request.Builder().url(url(currency)).header("Accept", "application/json").build()
        try {
            // `use` closes the body on every path, including errors (H31).
            client.newCall(request).execute().use { response ->
                if (response.code == 429) throw RateLimitException("CoinGecko rate limit")
                if (!response.isSuccessful) {
                    Log.w(TAG, "market data request failed: HTTP ${response.code}")
                    return@use null
                }
                response.body?.string()?.let { parse(it, currency, System.currentTimeMillis()) }
            }
        } catch (e: IOException) {
            Log.w(TAG, "market data request failed: ${e.javaClass.simpleName}")
            null
        }
    }

    /** Reads CoinGecko's answer: the asked currency, else USD; null without a positive price. */
    fun parse(body: String, currency: String, now: Long): NeuraiQuote? = try {
        val coin = JSONObject(body).optJSONObject("neurai")
        val asked = currency.lowercase(Locale.ROOT)
        val code = when {
            coin == null -> null
            coin.has(asked) -> asked
            coin.has("usd") -> "usd"
            else -> null
        }
        if (coin == null || code == null) {
            null
        } else {
            fun value(key: String) = coin.optDouble(key).takeIf { it.isFinite() }
            val price = value(code)
            if (price == null || price <= 0) {
                null
            } else {
                NeuraiQuote(
                    currency = code.uppercase(Locale.ROOT),
                    price = price,
                    change24h = value("${code}_24h_change"),
                    marketCap = value("${code}_market_cap")?.takeIf { it > 0 },
                    volume24h = value("${code}_24h_vol")?.takeIf { it >= 0 },
                    fetchedAt = now,
                    requested = currency.uppercase(Locale.ROOT),
                )
            }
        }
    } catch (e: Exception) {
        null
    }

    private fun prefs(context: Context) = context.getSharedPreferences(SHARED_PREF_NAME, Context.MODE_PRIVATE)

    fun stored(context: Context): NeuraiQuote? = NeuraiQuote.fromJson(prefs(context).getString(QUOTE_KEY, null))

    fun store(context: Context, quote: NeuraiQuote) {
        prefs(context).edit().putString(QUOTE_KEY, quote.toJson()).apply()
    }

    /** Forgets the quote (another currency was picked, or the last widget was removed). */
    fun forget(context: Context) {
        prefs(context).edit().remove(QUOTE_KEY).apply()
    }

    /** Drops what the Bitcoin widgets left: a BTC price must never show as an XNA one. */
    fun forgetLegacyState(context: Context) {
        val editor = prefs(context).edit()
        LEGACY_KEYS.forEach { editor.remove(it) }
        editor.apply()
    }

    /** The currency picked in the app (`preferredCurrency`), USD by default. */
    fun preferredCurrency(context: Context): String =
        prefs(context).getString("preferredCurrency", null)?.takeIf { it.isNotBlank() } ?: "USD"

    /** The locale of that currency in the app (`en-US` or `en_US`), else the device's. */
    fun preferredLocale(context: Context): Locale =
        prefs(context).getString("preferredCurrencyLocale", null)
            ?.replace('_', '-')
            ?.let { runCatching { Locale.forLanguageTag(it) }.getOrNull() }
            ?.takeIf { it.language.isNotBlank() }
            ?: Locale.getDefault()

    private fun currencyFormat(code: String, locale: Locale): NumberFormat {
        val format = NumberFormat.getCurrencyInstance(locale)
        format.currency = runCatching { Currency.getInstance(code) }.getOrDefault(Currency.getInstance("USD"))
        return format
    }

    /**
     * A price with as many decimals as it needs: two at 1 and above, four
     * significant digits below (an XNA is a fraction of a cent).
     */
    fun formatPrice(value: Double, code: String, locale: Locale): String {
        val format = currencyFormat(code, locale)
        val decimals = if (value >= 1 || value <= 0) 2 else min(12, max(2, -floor(log10(value)).toInt() + 3))
        format.minimumFractionDigits = 2
        format.maximumFractionDigits = decimals
        return format.format(value)
    }

    /** A large amount in short form, with the currency symbol where the locale puts it: $1.2M, 1,2 M €. */
    fun formatCompact(value: Double, code: String, locale: Locale): String {
        val number = CompactDecimalFormat.getInstance(locale, CompactDecimalFormat.CompactStyle.SHORT).apply {
            maximumFractionDigits = 1
        }.format(value)
        val format = currencyFormat(code, locale)
        val symbol = format.currency?.getSymbol(locale) ?: code
        val symbolFirst = (format as? DecimalFormat)?.toPattern()?.trimStart()?.startsWith("¤") ?: true
        return if (symbolFirst) "$symbol$number" else "$number $symbol"
    }

    /** The 24-hour change with its direction: ▲ 3.2%, ▼ 1.5%. */
    fun formatChange(percent: Double, locale: Locale): String {
        val format = NumberFormat.getPercentInstance(locale).apply {
            minimumFractionDigits = 1
            maximumFractionDigits = 1
        }
        val arrow = when {
            percent > 0.05 -> "▲ "
            percent < -0.05 -> "▼ "
            else -> ""
        }
        return arrow + format.format(abs(percent) / 100)
    }
}
