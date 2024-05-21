package io.bluewallet.bluewallet.widget

import androidx.lifecycle.ViewModel

class PriceWidgetViewModel : ViewModel() {
    var price: String = "Loading..."
    var lastUpdate: String = ""
    var loading: Boolean = true
    var error: Boolean = false
}
