package io.bluewallet.bluewallet

import android.view.KeyEvent

// Stable resource IDs keep our items separate from menus supplied by React Native screens.
enum class WalletMenuAction(
    val action: String,
    val itemId: Int,
    val titleId: Int,
    val keyCode: Int,
    val shortcut: Char,
    val modifiers: Int = KeyEvent.META_CTRL_ON
) {
    ADD_WALLET("addWallet", R.id.wallet_menu_add, R.string.wallet_menu_add, KeyEvent.KEYCODE_A, 'a',
        KeyEvent.META_CTRL_ON or KeyEvent.META_SHIFT_ON),
    IMPORT_WALLET("importWallet", R.id.wallet_menu_import, R.string.wallet_menu_import, KeyEvent.KEYCODE_I, 'i'),
    RELOAD_TRANSACTIONS("reloadTransactions", R.id.wallet_menu_reload, R.string.wallet_menu_reload, KeyEvent.KEYCODE_R, 'r'),
    SEND("send", R.id.wallet_menu_send, R.string.wallet_menu_send, KeyEvent.KEYCODE_S, 's',
        KeyEvent.META_CTRL_ON or KeyEvent.META_SHIFT_ON),
    RECEIVE("receive", R.id.wallet_menu_receive, R.string.wallet_menu_receive, KeyEvent.KEYCODE_R, 'r',
        KeyEvent.META_CTRL_ON or KeyEvent.META_SHIFT_ON),
    DETAILS("walletDetails", R.id.wallet_menu_details, R.string.wallet_menu_details, KeyEvent.KEYCODE_D, 'd'),
    COPY_ADDRESS("copyAddress", R.id.wallet_menu_copy_address, R.string.wallet_menu_copy_address, KeyEvent.KEYCODE_C, 'c',
        KeyEvent.META_CTRL_ON or KeyEvent.META_SHIFT_ON),
    COPY_TRANSACTION_ID("copyTransactionId", R.id.wallet_menu_copy_transaction_id, R.string.wallet_menu_copy_transaction_id, KeyEvent.KEYCODE_C, 'c',
        KeyEvent.META_CTRL_ON or KeyEvent.META_SHIFT_ON),
    BACK_TO_WALLETS("backToWallets", R.id.wallet_menu_back, R.string.wallet_menu_back, KeyEvent.KEYCODE_W, 'w',
        KeyEvent.META_CTRL_ON or KeyEvent.META_SHIFT_ON),
    SHORTCUTS("keyboardShortcuts", R.id.wallet_menu_shortcuts, R.string.wallet_menu_shortcuts, KeyEvent.KEYCODE_SLASH, '/'),
    SETTINGS("settings", R.id.wallet_menu_settings, R.string.wallet_menu_settings, KeyEvent.KEYCODE_COMMA, ',');

    fun matches(event: KeyEvent): Boolean = event.keyCode == keyCode && event.hasModifiers(modifiers)
}
