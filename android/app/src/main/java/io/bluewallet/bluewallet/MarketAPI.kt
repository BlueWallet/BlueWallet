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
import kotlin.math.min

object MarketAPI {

    private const val TAG = "MarketAPI"
    private val client = OkHttpClient()
    private val numberFormatter = NumberFormat.getNumberInstance()
    private val electrumClient = ElectrumClient()
    
    private var lastFetchedFee: String? = null

    // Single indicator for error/unavailable
    private const val ERROR_INDICATOR = "!"
    
    var baseUrl: String? = null

    private val krakenBtcFiatPairs = mapOf(
        "USD" to "XXBTZUSD",
        "EUR" to "XXBTZEUR",
        "GBP" to "XXBTZGBP",
        "CAD" to "XXBTZCAD",
        "JPY" to "XXBTZJPY",
        "AUD" to "XBTAUD",
        "CHF" to "XBTCHF",
    )
    private val bitstampFiatPairs = setOf("USD", "EUR", "GBP")
    // Our tickers that CoinGecko accepts as vs_currency — from /api/v3/simple/supported_vs_currencies
    private val coinGeckoFiat = setOf(
        "USD", "AED", "ARS", "AUD", "BHD", "BRL", "CAD", "CHF", "CLP", "CNY", "CZK", "DKK", "EUR", "GBP", "HKD", "HUF", "IDR", "ILS", "INR", "JPY",
        "KRW", "KWD", "LKR", "MXN", "MYR", "NGN", "NOK", "NZD", "PHP", "PLN", "RUB", "SAR", "SEK", "SGD", "THB", "TRY", "TWD", "UAH", "ZAR",
    )
    // Prefer Kraken over Coinbase when both can serve the ticker.
    // CoinGecko sits after the exchanges on purpose: the keyless tier is throttled per IP (observed 429 after ~5 calls
    // in 10 s), so many users behind one NAT would be rate-limited if it were primary. Fine as a last resort.
    private val universalFallbacks = listOf("YadioConvert", "Kraken", "Coinbase", "CoinGecko", "Bitstamp")
    
    data class ApiResponse(val body: String?, val code: Int)
    data class PriceResult(val rateDouble: Double, val formattedRate: String?)

    suspend fun fetchPrice(context: Context, currency: String): String? {
        Log.i(TAG, "Fetching Bitcoin price for currency: $currency")
        val startTime = System.currentTimeMillis()
        
        return try {
            val response = fetchPriceWithResponse(context, currency)
            val duration = System.currentTimeMillis() - startTime
            
            if (response.code == 200) {
                Log.i(TAG, "Successfully fetched price in ${duration}ms: ${response.body}")
                response.body
            } else {
                Log.e(TAG, "Failed to fetch price in ${duration}ms, response code: ${response.code}")
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching price for $currency", e)
            null
        }
    }
    
    private fun canUseRateSource(source: String, endPointKey: String): Boolean {
        val upper = endPointKey.uppercase()
        return when (source) {
            "Kraken" -> krakenBtcFiatPairs.containsKey(upper)
            "Bitstamp" -> bitstampFiatPairs.contains(upper)
            "CoinGecko" -> coinGeckoFiat.contains(upper)
            "BNR" -> upper == "RON"
            "Exir" -> upper == "IRR" || upper == "IRT"
            "coinpaprika" -> upper == "INR"
            else -> true
        }
    }

    private fun krakenPair(endPointKey: String): String? = krakenBtcFiatPairs[endPointKey.uppercase()]

    private fun isValidRate(raw: String): Boolean {
        val value = raw.toDoubleOrNull() ?: return false
        return value.isFinite() && value > 0.0
    }

    private fun buildRateSourceOrder(primary: String, endPointKey: String): List<String> {
        val order = mutableListOf(primary)
        for (fallback in universalFallbacks) {
            if (fallback == primary) continue
            if (!canUseRateSource(fallback, endPointKey)) continue
            order.add(fallback)
        }
        return order
    }

    suspend fun fetchPriceWithResponse(context: Context, currency: String): ApiResponse {
        val startTime = System.currentTimeMillis()
        Log.d(TAG, "Starting price fetch for currency: $currency")

        try {
            val fiatUnitsJson = context.assets.open("fiatUnits.json").bufferedReader().use { it.readText() }
            val json = JSONObject(fiatUnitsJson)

            if (!json.has(currency)) {
                Log.e(TAG, "Currency $currency not found in fiatUnits.json")
                return ApiResponse(null, 404)
            }

            val currencyInfo = json.getJSONObject(currency)
            val primarySource = currencyInfo.getString("source")
            val endPointKey = currencyInfo.getString("endPointKey")
            val sources = buildRateSourceOrder(primarySource, endPointKey)

            Log.d(TAG, "Price source order for $currency: $sources")

            var lastResponse = ApiResponse(null, -1)
            for (source in sources) {
                val response = try {
                    fetchFromSource(context, source, endPointKey)
                } catch (e: Exception) {
                    // OkHttp execute() throws on DNS/timeout/reset — keep walking like JS/iOS
                    Log.w(TAG, "Error fetching price for $currency from $source: ${e.javaClass.simpleName} - ${e.message}")
                    ApiResponse(null, -1)
                }
                if (response.body != null && response.code == 200) {
                    val totalDuration = System.currentTimeMillis() - startTime
                    Log.i(TAG, "Successfully parsed price for $currency from $source: ${response.body} (total time: ${totalDuration}ms)")
                    return response
                }
                if (response.code == 429) {
                    Log.w(TAG, "Rate limited by API ($source); trying next source")
                } else {
                    Log.w(TAG, "Failed to fetch price for $currency from $source (code: ${response.code})")
                }
                // Only the primary's 429 may trigger the widget's 30-min rate-limit cooldown.
                // A 429 from a last-resort fallback (CoinGecko throttles per IP) must not bench the widget.
                lastResponse = if (response.code == 429 && source != primarySource) response.copy(code = -1) else response
            }

            val totalDuration = System.currentTimeMillis() - startTime
            Log.e(TAG, "Failed to fetch price for $currency from all sources (total time: ${totalDuration}ms)")
            return lastResponse
        } catch (e: Exception) {
            val totalDuration = System.currentTimeMillis() - startTime
            Log.e(TAG, "Error fetching price for $currency after ${totalDuration}ms: ${e.javaClass.simpleName} - ${e.message}")
            return ApiResponse(null, -1)
        }
    }

    private suspend fun fetchFromSource(context: Context, source: String, endPointKey: String): ApiResponse {
        if (source == "BNR") {
            return fetchBnrRate(context)
        }

        val urlString = buildURLString(source, endPointKey)
        Log.d(TAG, "Fetching price from URL: $urlString")

        val request = Request.Builder().url(urlString).build()
        val response = withContext(Dispatchers.IO) { client.newCall(request).execute() }
        response.use {
            val responseCode = it.code

            if (responseCode == 429) {
                return ApiResponse(null, responseCode)
            }

            if (!it.isSuccessful) {
                return ApiResponse(null, responseCode)
            }

            val bodyString = it.body?.string()
            Log.d(TAG, "Raw response from $source: $bodyString")

            val parsedResult = bodyString?.let { parseJSONBasedOnSource(it, source, endPointKey) }
            // Reject 0 / NaN / Inf / non-numeric so a broken provider falls through to the next source
            val validResult = parsedResult?.takeIf { isValidRate(it) }
            if (parsedResult != null && validResult == null) {
                Log.w(TAG, "Invalid rate '$parsedResult' from $source")
            }

            // 200 with an unusable body is still a failure; don't let it surface as code 200 with null body
            return if (validResult != null) ApiResponse(validResult, 200) else ApiResponse(null, 422)
        }
    }

    private suspend fun fetchBnrRate(context: Context): ApiResponse {
        return try {
            val urlString = buildURLString("BNR", "RON")
            val request = Request.Builder().url(urlString).build()
            val response = withContext(Dispatchers.IO) { client.newCall(request).execute() }
            response.use {
                if (!it.isSuccessful) {
                    return ApiResponse(null, it.code)
                }
                val xmlData = it.body?.string() ?: return ApiResponse(null, it.code)
                val match = Regex("""<Rate currency="USD">([\d.]+)</Rate>""").find(xmlData)
                val usdToRonRate = match?.groupValues?.get(1)?.toDoubleOrNull()
                    ?.takeIf { it.isFinite() && it > 0.0 }
                    ?: return ApiResponse(null, -1)

                val usdResponse = fetchPriceWithResponse(context, "USD")
                val btcToUsd = usdResponse.body?.toDoubleOrNull()
                if (btcToUsd == null || btcToUsd <= 0) {
                    return ApiResponse(null, usdResponse.code)
                }
                val btcToRon = btcToUsd * usdToRonRate
                if (!btcToRon.isFinite() || btcToRon <= 0.0) {
                    return ApiResponse(null, 422)
                }
                return ApiResponse(btcToRon.toString(), 200)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching BNR rate", e)
            ApiResponse(null, -1)
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
                "Coinbase" -> "https://api.coinbase.com/v2/prices/BTC-${endPointKey.uppercase()}/spot"
                "CoinGecko" -> "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${endPointKey.lowercase()}"
                "BNR" -> "https://curs.bnr.ro/nbrfxrates.xml"
                "Kraken" -> {
                    val pair = krakenPair(endPointKey)
                        ?: throw IllegalArgumentException("No Kraken BTC pair for $endPointKey")
                    "https://api.kraken.com/0/public/Ticker?pair=$pair"
                }
                else -> throw IllegalArgumentException("Unknown rate source: $source")
            }
        }
    }

    private fun parseJSONBasedOnSource(jsonString: String, source: String, endPointKey: String): String? {
        return try {
            val json = JSONObject(jsonString)
            when (source) {
                "Yadio" -> json.getJSONObject(endPointKey).getString("price")
                "YadioConvert" -> json.getString("rate")
                "Exir" -> json.getString("last")
                "Bitstamp" -> json.getString("last")
                "coinpaprika" -> json.getJSONObject("quotes").getJSONObject("INR").getString("price")
                "Coinbase" -> json.getJSONObject("data").getString("amount")
                "CoinGecko" -> json.getJSONObject("bitcoin").getString(endPointKey.lowercase())
                "Kraken" -> {
                    val pair = krakenPair(endPointKey) ?: return null
                    json.getJSONObject("result").getJSONObject(pair).getJSONArray("c").getString(0)
                }
                else -> null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing price", e)
            null
        }
    }
    
    /**
     * Fetch the next block fee from Electrum servers with network awareness
     */
    suspend fun fetchNextBlockFee(context: Context): String {
        val startTime = System.currentTimeMillis()
        Log.i(TAG, "Fetching next block fee from Electrum")
        
        // Initialize ElectrumClient with context if not already done
        electrumClient.initialize(context)
        
        // Set up network status listener
        electrumClient.setNetworkStatusListener(object : ElectrumClient.NetworkStatusListener {
            override fun onNetworkStatusChanged(isConnected: Boolean) {
                Log.d(TAG, "Electrum network status changed: ${if (isConnected) "Connected" else "Disconnected"}")
            }
            
            override fun onConnectionError(error: String) {
                Log.e(TAG, "Electrum connection error: $error")
            }
            
            override fun onConnectionSuccess() {
                Log.d(TAG, "Successfully connected to Electrum server")
            }
        })
        
        try {
            // Check network connectivity first
            if (!NetworkUtils.isNetworkAvailable(context)) {
                Log.e(TAG, "No network connection available for fetching next block fee")
                return ERROR_INDICATOR
            }
            
            // For direct testing with hardcoded value
            val useTestValue = false
            if (useTestValue) {
                Log.w(TAG, "Using TEST VALUE for next block fee")
                return "25"
            }
            
            // First try connecting directly for fee histogram
            Log.d(TAG, "Attempting to connect directly to Electrum server for fee")
            var success = electrumClient.connectToNextAvailable(validateCertificates = false)

            if (success) {
                Log.i(TAG, "Connected to Electrum server: ${ElectrumClient.hardcodedPeers}")
            } else {
                Log.e(TAG, "Failed to connect to any Electrum server on first attempt. Retrying once more.")
            }
            
            if (!success) {
                Log.e(TAG, "Failed to connect to any Electrum server on first attempt. Retrying once more.")
                // Short delay before retry
                delay(1000)
                success = electrumClient.connectToNextAvailable(validateCertificates = false)
                
                if (!success) {
                    Log.e(TAG, "Failed to connect to any Electrum server after retry. Fee unavailable.")
                    return ERROR_INDICATOR
                }
            }
            
            Log.d(TAG, "Successfully connected to Electrum server. Sending fee histogram request")
            val message = "{\"id\": 1, \"method\": \"mempool.get_fee_histogram\", \"params\": []}\n"
            if (!electrumClient.send(message.toByteArray())) {
                Log.e(TAG, "Failed to send fee histogram request. Fee unavailable.")
                return ERROR_INDICATOR
            }
            
            Log.d(TAG, "Waiting for fee histogram response")
            val receivedData = electrumClient.receive()
            if (receivedData.isEmpty()) {
                Log.e(TAG, "Empty response from Electrum server when requesting fee histogram. Fee unavailable.")
                return ERROR_INDICATOR
            }
            
            val jsonString = String(receivedData)
            Log.d(TAG, "Received fee histogram: $jsonString")
            
            try {
                val json = JSONObject(jsonString)
                if (!json.has("result")) {
                    Log.e(TAG, "Invalid fee histogram response - missing 'result' field. Fee unavailable.")
                    return ERROR_INDICATOR
                }
                
                val feeHistogram = json.getJSONArray("result")
                if (feeHistogram.length() == 0) {
                    Log.e(TAG, "Empty fee histogram array. Fee unavailable.")
                    return ERROR_INDICATOR
                }
                
                Log.d(TAG, "Calculating fee from ${feeHistogram.length()} data points")
                
                val feeRate = calculateFeeFromHistogram(feeHistogram, 1)
                if (feeRate <= 0) {
                    Log.e(TAG, "Invalid fee rate calculated: $feeRate. Fee unavailable.")
                    return ERROR_INDICATOR
                }
                
                val formattedFee = feeRate.toInt().toString()
                
                Log.i(TAG, "Successfully calculated next block fee: $formattedFee sat/vB")
                return formattedFee
            } catch (e: Exception) {
                Log.e(TAG, "Error parsing fee histogram JSON: ${e.message}", e)
                return ERROR_INDICATOR
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error fetching next block fee: ${e.message}", e)
            return ERROR_INDICATOR
        } finally {
            electrumClient.close()
        }
    }
    
    /**
     * Calculate the estimated fee from the fee histogram
     * 
     * @param feeHistogram the fee histogram from Electrum
     * @param targetBlocks the target number of blocks to confirm in
     * @return the fee rate in sat/vB that would get confirmed in the target number of blocks
     */
    private fun calculateFeeFromHistogram(feeHistogram: JSONArray, targetBlocks: Int): Double {
        try {
            Log.d(TAG, "Calculating fee from histogram with ${feeHistogram.length()} entries for $targetBlocks blocks")
            
            // Transform histogram - accumulate vsize until we reach the target block size
            val blockSize = 1000000 // 1MB block size
            var totalVsize = 0.0
            val histogramToUse = mutableListOf<Pair<Double, Double>>() // (fee, vsize)
            
            for (i in 0 until feeHistogram.length()) {
                val entry = feeHistogram.getJSONArray(i)
                val feeRate = entry.getDouble(0)
                var vsize = entry.getDouble(1)
                var timeToStop = false
                
                if (totalVsize + vsize >= blockSize * targetBlocks) {
                    // Only take what we need to fill the target block size
                    vsize = blockSize * targetBlocks - totalVsize
                    timeToStop = true
                }
                
                histogramToUse.add(Pair(feeRate, vsize))
                totalVsize += vsize
                
                Log.v(TAG, "Fee entry: rate=$feeRate, vsize=$vsize, accumulated=$totalVsize")
                
                if (timeToStop) break
            }
            
            Log.d(TAG, "Transformed histogram has ${histogramToUse.size} entries with total vsize $totalVsize")
            
            // Create a weighted flat array (similar to the JS implementation)
            val histogramFlat = mutableListOf<Double>()
            for ((fee, vsize) in histogramToUse) {
                // Divide by a factor to keep the array size manageable
                val count = (vsize / 25000.0).toInt().coerceAtLeast(1)
                repeat(count) {
                    histogramFlat.add(fee)
                }
            }
            
            if (histogramFlat.isEmpty()) {
                Log.e(TAG, "Empty flat histogram array")
                return 0.0 // Return 0 to indicate failure, will be caught and converted to ERROR_INDICATOR
            }
            
            // Sort the flat array
            histogramFlat.sort()
            
            // Calculate the median (50th percentile)
            val median = calculatePercentile(histogramFlat, 0.5)
            val result = median.coerceAtLeast(2.0) // Minimum 2 sat/vB
            
            Log.d(TAG, "Calculated median fee rate: $median, final rate: $result sat/vB")
            return result
            
        } catch (e: Exception) {
            Log.e(TAG, "Error calculating fee from histogram: ${e.message}", e)
            return 0.0 // Return 0 to indicate failure, will be caught and converted to ERROR_INDICATOR
        }
    }
    
    /**
     * Calculate the percentile of a sorted list of values
     * 
     * @param sortedValues the sorted list of values
     * @param percentile the percentile to calculate (0.0 - 1.0)
     * @return the percentile value
     */
    private fun calculatePercentile(sortedValues: List<Double>, percentile: Double): Double {
        if (sortedValues.isEmpty()) return 0.0
        
        val index = (percentile * sortedValues.size).toInt().coerceIn(0, sortedValues.size - 1)
        return sortedValues[index]
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
        val startTime = System.currentTimeMillis()
        Log.i(TAG, "Starting market data fetch for currency: $currency")
        
        val marketData = MarketData(nextBlock = "...", sats = "...", price = "...", rate = 0.0)
        
        try {
            // Check network connectivity first
            if (!NetworkUtils.isNetworkAvailable(context)) {
                Log.e(TAG, "No network connection available for fetching market data")
                return marketData.apply { 
                    nextBlock = ERROR_INDICATOR
                    sats = ERROR_INDICATOR
                    price = ERROR_INDICATOR
                }
            }
            
            // 1. Fetch price
            Log.d(TAG, "Fetching price for $currency")
            val priceStartTime = System.currentTimeMillis()
            val response = fetchPriceWithResponse(context, currency)
            val priceDuration = System.currentTimeMillis() - priceStartTime
            
            if (response.code == 429) {
                Log.e(TAG, "Rate limited by price API, aborting market data fetch")
                throw RateLimitException("Rate limited by price API")
            }
            
            val priceStr = response.body
            if (priceStr != null) {
                val rate = priceStr.toDoubleOrNull() ?: 0.0
                marketData.rate = rate
                Log.d(TAG, "Parsed price rate: $rate")
                
                if (rate > 0) {
                    // Format price with currency symbol - convert to integer
                    marketData.price = formatCurrencyAmount(rate, currency)
                    Log.d(TAG, "Formatted price: ${marketData.price}")
                    
                    // Calculate sats - convert to integer for display
                    val satsValue = ((10 / rate) * 10000000).toInt()
                    marketData.sats = numberFormatter.format(satsValue)
                    Log.d(TAG, "Calculated sats: ${marketData.sats}")
                } else {
                    Log.w(TAG, "Price rate is zero or negative: $rate")
                }
            } else {
                Log.w(TAG, "No price data received")
            }
            
            // 2. Fetch next block fee - Always run this, regardless of price fetch result
            Log.d(TAG, "Fetching next block fee")
            val feeStartTime = System.currentTimeMillis()
            val nextBlockFee = fetchNextBlockFee(context)
            val feeDuration = System.currentTimeMillis() - feeStartTime
            
            Log.d(TAG, "Next block fee fetched in ${feeDuration}ms: $nextBlockFee")
            marketData.nextBlock = nextBlockFee
            Log.i(TAG, "Set nextBlock fee in marketData: ${marketData.nextBlock}")
            
            val totalDuration = System.currentTimeMillis() - startTime
            Log.i(TAG, "Market data fetch completed in ${totalDuration}ms: $marketData")
            
        } catch (e: RateLimitException) {
            Log.e(TAG, "Rate limit exception during market data fetch: ${e.message}")
            throw e
        } catch (e: Exception) {
            val duration = System.currentTimeMillis() - startTime
            Log.e(TAG, "Error fetching market data after ${duration}ms: ${e.javaClass.simpleName} - ${e.message}", e)
        }
        
        return marketData
    }
}