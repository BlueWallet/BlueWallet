package com.bluewallet.widget

import kotlinx.serialization.Serializable

@Serializable
data class MarketData(
    val price: String,
    val rate: Double,
    val dateString: String
)