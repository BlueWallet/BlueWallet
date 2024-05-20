package io.bluewallet.bluewallet.widget

import kotlinx.serialization.Serializable

@Serializable
data class FiatInfo(
    val endPointKey: String,
    val locale: String,
    val source: String,
    val symbol: String
)