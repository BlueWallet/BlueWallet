package io.bluewallet.bluewallet.widget

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import java.net.URL
import java.text.SimpleDateFormat
import java.util.*

object MarketAPI {

    private const val TAG = "MarketAPI"

    private fun buildURLString(source: String, endPointKey: String): String {
        return when (source) {
            "Yadio" -> "https://api.yadio.io/json/$endPointKey"
            "YadioConvert" -> "https://api.yadio.io/convert/1/BTC/$endPointKey"
            "Exir" -> "https://api.exir.io/v1/ticker?symbol=btc-irt"
            "wazirx" -> "https://api.wazirx.com/api/v2/tickers/btcinr"
            "Bitstamp" -> "https://www.bitstamp.net/api/v2/ticker/btc${endPointKey.lowercase()}"
            "Coinbase" -> "https://api.coinbase.com/v2/prices/BTC-${endPointKey.uppercase()}/buy"
            "CoinGecko" -> "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${endPointKey.lowercase()}"
            else -> "https://api.coindesk.com/v1/bpi/currentprice/$endPointKey.json"
        }
    }

    private fun handleDefaultData(data: String, source: String, endPointKey: String, completion: (MarketData?, Exception?) -> Unit) {
        try {
            val json = Json.decodeFromString<Map<String, Any>>(data)
            parseJSONBasedOnSource(json, source, endPointKey, completion)
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing JSON: ${e.message}")
            completion(null, e)
        }
    }

    private fun parseJSONBasedOnSource(json: Map<String, Any>, source: String, endPointKey: String, completion: (MarketData?, Exception?) -> Unit) {
        var latestRateDataStore: MarketData? = null

        when (source) {
            "Yadio" -> {
                val rateDict = json[endPointKey] as? Map<String, Any>
                val rateDouble = rateDict?.get("price") as? Double
                val lastUpdated = rateDict?.get("timestamp") as? Int
                if (rateDouble != null && lastUpdated != null) {
                    val unix = lastUpdated * 1000L
                    val lastUpdatedString = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.getDefault()).format(Date(unix))
                    latestRateDataStore = MarketData(rateDouble.toString(), lastUpdatedString)
                    completion(latestRateDataStore, null)
                } else {
                    completion(null, Exception("Data formatting error for source: $source"))
                }
            }
            "YadioConvert" -> {
                val rateDouble = json["rate"] as? Double
                val lastUpdated = json["timestamp"] as? Int
                if (rateDouble != null && lastUpdated != null) {
                    val unix = lastUpdated * 1000L
                    val lastUpdatedString = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.getDefault()).format(Date(unix))
                    latestRateDataStore = MarketData(rateDouble.toString(), lastUpdatedString)
                    completion(latestRateDataStore, null)
                } else {
                    completion(null, Exception("Data formatting error for source: $source"))
                }
            }
            "CoinGecko" -> {
                val bitcoinDict = json["bitcoin"] as? Map<String, Any>
                val rateDouble = bitcoinDict?.get(endPointKey.lowercase()) as? Double
                if (rateDouble != null) {
                    val lastUpdatedString = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.getDefault()).format(Date())
                    latestRateDataStore = MarketData(rateDouble.toString(), lastUpdatedString)
                    completion(latestRateDataStore, null)
                } else {
                    completion(null, Exception("Data formatting error for source: $source"))
                }
            }
            "Exir" -> {
                val rateDouble = json["last"] as? Double
                if (rateDouble != null) {
                    val lastUpdatedString = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.getDefault()).format(Date())
                    latestRateDataStore = MarketData(rateDouble.toString(), lastUpdatedString)
                    completion(latestRateDataStore, null)
                } else {
                    completion(null, Exception("Data formatting error for source: $source"))
                }
            }
            "Bitstamp" -> {
                val rateString = json["last"] as? String
                val rateDouble = rateString?.toDoubleOrNull()
                if (rateDouble != null) {
                    val lastUpdatedString = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.getDefault()).format(Date())
                    latestRateDataStore = MarketData(rateString, lastUpdatedString)
                    completion(latestRateDataStore, null)
                } else {
                    completion(null, Exception("Data formatting error for source: $source"))
                }
            }
            "wazirx" -> {
                val tickerDict = json["ticker"] as? Map<String, Any>
                val rateString = tickerDict?.get("buy") as? String
                val rateDouble = rateString?.toDoubleOrNull()
                if (rateDouble != null) {
                    val lastUpdatedString = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.getDefault()).format(Date())
                    latestRateDataStore = MarketData(rateString, lastUpdatedString)
                    completion(latestRateDataStore, null)
                } else {
                    completion(null, Exception("Data formatting error for source: $source"))
                }
            }
            "Coinbase" -> {
                val data = json["data"] as? Map<String, Any>
                val rateString = data?.get("amount") as? String
                val rateDouble = rateString?.toDoubleOrNull()
                if (rateDouble != null) {
                    val lastUpdatedString = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.getDefault()).format(Date())
                    latestRateDataStore = MarketData(rateString, lastUpdatedString)
                    completion(latestRateDataStore, null)
                } else {
                    completion(null, Exception("Data formatting error for source: $source"))
                }
            }
            else -> {
                completion(null, Exception("Unsupported data source $source"))
            }
        }
    }

    fun fetchPrice(source: String, endPointKey: String, completion: (MarketData?, Exception?) -> Unit) {
        val urlString = buildURLString(source, endPointKey)
        Log.d(TAG, "Fetching price from: $urlString")

        runBlocking {
            withContext(Dispatchers.IO) {
                try {
                    val jsonString = URL(urlString).readText()
                    withContext(Dispatchers.Main) {
                        handleDefaultData(jsonString, source, endPointKey, completion)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error fetching price: ${e.message}")
                    withContext(Dispatchers.Main) {
                        completion(null, e)
                    }
                }
            }
        }
    }
}