package com.bluewallet.widget

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import java.net.URL

object MarketAPI {
    fun fetchPrice(completion: (MarketData?, Exception?) -> Unit) {
        runBlocking {
            withContext(Dispatchers.IO) {
                try {
                    val urlString = "https://api.coindesk.com/v1/bpi/currentprice.json" // Example URL
                    val jsonString = URL(urlString).readText()
                    val data = Json.decodeFromString<MarketData>(jsonString)
                    withContext(Dispatchers.Main) {
                        completion(data, null)
                    }
                } catch (e: Exception) {
                    withContext(Dispatchers.Main) {
                        completion(null, e)
                    }
                }
            }
        }
    }
}