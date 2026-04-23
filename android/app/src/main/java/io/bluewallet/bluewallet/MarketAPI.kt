package io.bluewallet.bluewallet

import android.content.Context
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import java.text.NumberFormat
import java.util.Currency

object MarketAPI {

    private const val TAG = "MarketAPI"
    private val client = OkHttpClient()
    private val numberFormatter = NumberFormat.getNumberInstance()
    private val electrumClient = ElectrumClient()
    private const val ERROR_INDICATOR = "!"

    var baseUrl: String? = null

    /**
     * Fetch complete market data (price, sats per unit, next block fee).
     * Single public entry point for all widget data needs.
     */
    suspend fun fetchMarketData(context: Context, currency: String): MarketData {
        val marketData = MarketData()

        if (!NetworkUtils.isNetworkAvailable(context)) {
            return marketData.apply { nextBlock = ERROR_INDICATOR; sats = ERROR_INDICATOR; price = ERROR_INDICATOR }
        }

        try {
            val rate = fetchPriceRate(context, currency)
            if (rate != null && rate > 0) {
                marketData.rate = rate
                marketData.price = formatCurrencyAmount(rate, currency)
                marketData.sats = numberFormatter.format(((10 / rate) * 10000000).toInt())
            }
            marketData.nextBlock = fetchNextBlockFee(context)
        } catch (e: RateLimitException) {
            throw e
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching market data: ${e.message}")
        }

        return marketData
    }

    /**
     * Format a price amount with the appropriate currency symbol.
     */
    fun formatCurrencyAmount(amount: Double, currencyCode: String): String {
        val formatter = NumberFormat.getCurrencyInstance()
        try {
            formatter.currency = Currency.getInstance(currencyCode)
            formatter.maximumFractionDigits = 0
        } catch (_: Exception) {}
        return formatter.format(amount.toInt())
    }

    // MARK: - Private

    /**
     * Fetch the raw price rate for a currency. Returns the rate as Double, or null on failure.
     * Throws RateLimitException if rate-limited.
     */
    private suspend fun fetchPriceRate(context: Context, currency: String): Double? {
        val fiatUnitsJson = context.assets.open("fiatUnits.json").bufferedReader().use { it.readText() }
        val json = JSONObject(fiatUnitsJson)

        if (!json.has(currency)) return null

        val currencyInfo = json.getJSONObject(currency)
        val source = currencyInfo.getString("source")
        val endPointKey = currencyInfo.getString("endPointKey")
        val urlString = buildURLString(source, endPointKey)

        val request = Request.Builder().url(urlString).build()
        val response = withContext(Dispatchers.IO) { client.newCall(request).execute() }

        if (response.code == 429) throw RateLimitException("Rate limited by price API")
        if (!response.isSuccessful) return null

        val jsonResponse = response.body?.string() ?: return null
        return parseJSONBasedOnSource(jsonResponse, source, endPointKey)?.toDoubleOrNull()
    }

    /**
     * Fetch the next block fee estimate from an Electrum server.
     */
    private suspend fun fetchNextBlockFee(context: Context): String {
        electrumClient.initialize(context)

        if (!NetworkUtils.isNetworkAvailable(context)) return ERROR_INDICATOR

        try {
            var success = electrumClient.connectToNextAvailable(validateCertificates = false)
            if (!success) {
                delay(1000)
                success = electrumClient.connectToNextAvailable(validateCertificates = false)
                if (!success) return ERROR_INDICATOR
            }

            val message = "{\"id\": 1, \"method\": \"mempool.get_fee_histogram\", \"params\": []}\n"
            if (!electrumClient.send(message.toByteArray())) return ERROR_INDICATOR

            val receivedData = electrumClient.receive()
            if (receivedData.isEmpty()) return ERROR_INDICATOR

            val json = JSONObject(String(receivedData))
            if (!json.has("result")) return ERROR_INDICATOR

            val feeHistogram = json.getJSONArray("result")
            if (feeHistogram.length() == 0) return ERROR_INDICATOR

            val feeRate = calculateFeeFromHistogram(feeHistogram, 1)
            return if (feeRate > 0) feeRate.toInt().toString() else ERROR_INDICATOR
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching next block fee: ${e.message}")
            return ERROR_INDICATOR
        } finally {
            electrumClient.close()
        }
    }

    private fun buildURLString(source: String, endPointKey: String): String {
        if (baseUrl != null) return baseUrl + endPointKey
        return when (source) {
            "Yadio" -> "https://api.yadio.io/json/$endPointKey"
            "YadioConvert" -> "https://api.yadio.io/convert/1/BTC/$endPointKey"
            "Exir" -> "https://api.exir.io/v1/ticker?symbol=btc-irt"
            "coinpaprika" -> "https://api.coinpaprika.com/v1/tickers/btc-bitcoin?quotes=INR"
            "Bitstamp" -> "https://www.bitstamp.net/api/v2/ticker/btc${endPointKey.lowercase()}"
            "Coinbase" -> "https://api.coinbase.com/v2/prices/BTC-${endPointKey.uppercase()}/buy"
            "CoinGecko" -> "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${endPointKey.lowercase()}"
            "BNR" -> "https://www.bnr.ro/nbrfxrates.xml"
            "Kraken" -> "https://api.kraken.com/0/public/Ticker?pair=XXBTZ${endPointKey.uppercase()}"
            "CoinDesk" -> "https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=${endPointKey.uppercase()}"
            else -> "https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=${endPointKey.uppercase()}"
        }
    }

    private fun parseJSONBasedOnSource(jsonString: String, source: String, endPointKey: String): String? {
        return try {
            val json = JSONObject(jsonString)
            when (source) {
                "Yadio" -> json.getJSONObject(endPointKey).getString("price")
                "YadioConvert" -> json.getString("rate")
                "CoinGecko" -> json.getJSONObject("bitcoin").getString(endPointKey.lowercase())
                "Exir" -> json.getString("last")
                "Bitstamp" -> json.getString("last")
                "coinpaprika" -> json.getJSONObject("quotes").getJSONObject("INR").getString("price")
                "Coinbase" -> json.getJSONObject("data").getString("amount")
                "Kraken" -> json.getJSONObject("result").getJSONObject("XXBTZ${endPointKey.uppercase()}").getJSONArray("c").getString(0)
                "CoinDesk" -> {
                    val rate = json.optDouble(endPointKey.uppercase(), -1.0)
                    if (rate < 0) null else rate.toString()
                }
                else -> null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing price from $source", e)
            null
        }
    }

    private fun calculateFeeFromHistogram(feeHistogram: JSONArray, targetBlocks: Int): Double {
        try {
            val blockSize = 1000000
            var totalVsize = 0.0
            val entries = mutableListOf<Pair<Double, Double>>()

            for (i in 0 until feeHistogram.length()) {
                val entry = feeHistogram.getJSONArray(i)
                val feeRate = entry.getDouble(0)
                var vsize = entry.getDouble(1)

                if (totalVsize + vsize >= blockSize * targetBlocks) {
                    vsize = blockSize * targetBlocks - totalVsize
                    entries.add(Pair(feeRate, vsize))
                    totalVsize += vsize
                    break
                }

                entries.add(Pair(feeRate, vsize))
                totalVsize += vsize
            }

            val flat = mutableListOf<Double>()
            for ((fee, vsize) in entries) {
                repeat((vsize / 25000.0).toInt().coerceAtLeast(1)) { flat.add(fee) }
            }

            if (flat.isEmpty()) return 0.0

            flat.sort()
            val median = flat[(0.5 * flat.size).toInt().coerceIn(0, flat.size - 1)]
            return median.coerceAtLeast(2.0)
        } catch (e: Exception) {
            Log.e(TAG, "Error calculating fee from histogram", e)
            return 0.0
        }
    }
}