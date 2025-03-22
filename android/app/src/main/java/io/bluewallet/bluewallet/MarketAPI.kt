package io.bluewallet.bluewallet

import android.content.Context
import android.util.Log
import kotlinx.coroutines.Dispatchers
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

    var baseUrl: String? = null
    
    data class ApiResponse(val body: String?, val code: Int)
    data class PriceResult(val rateDouble: Double, val formattedRate: String?)

    suspend fun fetchPrice(context: Context, currency: String): String? {
        return try {
            val response = fetchPriceWithResponse(context, currency)
            if (response.code == 200) response.body else null
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching price", e)
            null
        }
    }
    
    suspend fun fetchPriceWithResponse(context: Context, currency: String): ApiResponse {
        try {
            val fiatUnitsJson = context.assets.open("fiatUnits.json").bufferedReader().use { it.readText() }
            val json = JSONObject(fiatUnitsJson)
            val currencyInfo = json.getJSONObject(currency)
            val source = currencyInfo.getString("source")
            val endPointKey = currencyInfo.getString("endPointKey")

            val urlString = buildURLString(source, endPointKey)
            Log.d(TAG, "Fetching price from URL: $urlString")

            val request = Request.Builder().url(urlString).build()
            val response = withContext(Dispatchers.IO) { client.newCall(request).execute() }
            
            val responseCode = response.code
            if (responseCode == 429) {
                Log.e(TAG, "Rate limited by API. Response code: $responseCode")
                return ApiResponse(null, responseCode)
            }

            if (!response.isSuccessful) {
                Log.e(TAG, "Failed to fetch price. Response code: $responseCode")
                return ApiResponse(null, responseCode)
            }

            val jsonResponse = response.body?.string()
            val parsedResult = if (jsonResponse != null) {
                parseJSONBasedOnSource(jsonResponse, source, endPointKey)
            } else null
            
            return ApiResponse(parsedResult, responseCode)
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching price", e)
            return ApiResponse(null, -1)
        }
    }

    private fun buildURLString(source: String, endPointKey: String): String {
        return if (baseUrl != null) {
            baseUrl + endPointKey
        } else {
            when (source) {
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
            Log.e(TAG, "Error parsing price", e)
            null
        }
    }
    
    /**
     * Fetch the next block fee from Electrum servers
     */
    suspend fun fetchNextBlockFee(): String {
        val client = ElectrumClient()
        
        try {
            if (!client.connectToNextAvailable(validateCertificates = false)) {
                Log.e(TAG, "Failed to connect to any Electrum peer")
                return "!"
            }
            
            val message = "{\"id\": 1, \"method\": \"mempool.get_fee_histogram\", \"params\": []}\n"
            if (!client.send(message.toByteArray())) {
                Log.e(TAG, "Failed to send fee histogram request")
                return "!"
            }
            
            val receivedData = client.receive()
            if (receivedData.isEmpty()) {
                Log.e(TAG, "Empty response from Electrum server")
                return "!"
            }
            
            val jsonString = String(receivedData)
            Log.d(TAG, "Received fee histogram: $jsonString")
            
            val json = JSONObject(jsonString)
            val feeHistogram = json.getJSONArray("result")
            
            val fastestFee = calculateFeeFromHistogram(feeHistogram, 1)
            Log.d(TAG, "Calculated fastest fee: $fastestFee")
            
            return fastestFee.toInt().toString()
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching next block fee", e)
            return "!"
        } finally {
            client.close()
        }
    }
    
    /**
     * Calculate the estimated fee from the fee histogram
     */
    private fun calculateFeeFromHistogram(feeHistogram: JSONArray, targetBlocks: Int): Double {
        var totalWeight = 0.0
        var weightedFeeSum = 0.0
        
        try {
            // The fee histogram is an array of [fee_rate, vsize] pairs
            for (i in 0 until feeHistogram.length()) {
                val entry = feeHistogram.getJSONArray(i)
                val feeRate = entry.getDouble(0)
                val vsize = entry.getDouble(1)
                
                totalWeight += vsize
                weightedFeeSum += feeRate * vsize
            }
            
            if (totalWeight > 0) {
                return weightedFeeSum / totalWeight
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error calculating fee from histogram", e)
        }
        
        // Default fallback fee
        return 25.0
    }
    
    /**
     * Format price with currency symbol
     */
    fun formatCurrencyAmount(amount: Double, currencyCode: String): String {
        val formatter = NumberFormat.getCurrencyInstance()
        try {
            formatter.currency = Currency.getInstance(currencyCode)
            formatter.maximumFractionDigits = 0 // Ensure no fractional parts
        } catch (e: Exception) {
            Log.e(TAG, "Invalid currency code: $currencyCode", e)
        }
        return formatter.format(amount.toInt()) // Convert to integer before formatting
    }
    
    /**
     * Fetch complete market data including price and next block fee
     */
    suspend fun fetchMarketData(context: Context, currency: String): MarketData {
        val marketData = MarketData(nextBlock = "...", sats = "...", price = "...", rate = 0.0)
        
        try {
            // 1. Fetch price
            val response = fetchPriceWithResponse(context, currency)
            
            if (response.code == 429) {
                throw WidgetUpdateWorker.RateLimitException("Rate limited by price API")
            }
            
            val priceStr = response.body
            if (priceStr != null) {
                val rate = priceStr.toDoubleOrNull() ?: 0.0
                marketData.rate = rate
                
                if (rate > 0) {
                    // Format price with currency symbol - convert to integer
                    marketData.price = formatCurrencyAmount(rate, currency)
                    
                    // Calculate sats - convert to integer for display
                    val satsValue = ((10 / rate) * 10000000).toInt()
                    marketData.sats = numberFormatter.format(satsValue)
                }
            }
            
            // 2. Fetch next block fee
            val nextBlockFee = fetchNextBlockFee()
            marketData.nextBlock = nextBlockFee
            
        } catch (e: Exception) {
            if (e is WidgetUpdateWorker.RateLimitException) throw e
            Log.e(TAG, "Error fetching market data", e)
        }
        
        return marketData
    }
}