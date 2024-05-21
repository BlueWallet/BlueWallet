package io.bluewallet.bluewallet.widget

import kotlinx.serialization.Serializable

@Serializable
data class MarketData(
    val price: String,
    val lastUpdate: String
)
