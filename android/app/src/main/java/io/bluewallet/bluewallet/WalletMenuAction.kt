package io.bluewallet.bluewallet

import android.view.KeyEvent

// Stable resource IDs keep our items separate from menus supplied by React Native screens.
enum class WalletMenuAction(
    val action: String,
    val itemId: Int,
    val titleId: Int,
    val iconId: Int,
    val keyCode: Int? = null,
    val shortcut: Char? = null,
    val modifiers: Int = KeyEvent.META_CTRL_ON
) {
    OPEN_FILE("openFile", R.id.wallet_menu_open_file, R.string.wallet_menu_open_file, android.R.drawable.ic_menu_upload, KeyEvent.KEYCODE_O, 'o'),
    ADD_WALLET("addWallet", R.id.wallet_menu_add, R.string.wallet_menu_add, android.R.drawable.ic_menu_add, KeyEvent.KEYCODE_A, 'a',
        KeyEvent.META_CTRL_ON or KeyEvent.META_SHIFT_ON),
    IMPORT_WALLET("importWallet", R.id.wallet_menu_import, R.string.wallet_menu_import, android.R.drawable.ic_menu_save, KeyEvent.KEYCODE_I, 'i'),
    RELOAD_TRANSACTIONS("reloadTransactions", R.id.wallet_menu_reload, R.string.wallet_menu_reload, android.R.drawable.ic_popup_sync, KeyEvent.KEYCODE_R, 'r'),
    SEND("send", R.id.wallet_menu_send, R.string.wallet_menu_send, android.R.drawable.ic_menu_send, KeyEvent.KEYCODE_S, 's',
        KeyEvent.META_CTRL_ON or KeyEvent.META_SHIFT_ON),
    RECEIVE("receive", R.id.wallet_menu_receive, R.string.wallet_menu_receive, android.R.drawable.ic_menu_directions, KeyEvent.KEYCODE_R, 'r',
        KeyEvent.META_CTRL_ON or KeyEvent.META_SHIFT_ON),
    DETAILS("walletDetails", R.id.wallet_menu_details, R.string.wallet_menu_details, android.R.drawable.ic_menu_info_details, KeyEvent.KEYCODE_D, 'd'),
    COPY_ADDRESS("copyAddress", R.id.wallet_menu_copy_address, R.string.wallet_menu_copy_address, android.R.drawable.ic_menu_edit, KeyEvent.KEYCODE_C, 'c',
        KeyEvent.META_CTRL_ON or KeyEvent.META_SHIFT_ON),
    COPY_TRANSACTION_ID("copyTransactionId", R.id.wallet_menu_copy_transaction_id, R.string.wallet_menu_copy_transaction_id, android.R.drawable.ic_menu_edit, KeyEvent.KEYCODE_C, 'c',
        KeyEvent.META_CTRL_ON or KeyEvent.META_SHIFT_ON),
    BACK_TO_WALLETS("backToWallets", R.id.wallet_menu_back, R.string.wallet_menu_back, android.R.drawable.ic_menu_revert, KeyEvent.KEYCODE_W, 'w',
        KeyEvent.META_CTRL_ON or KeyEvent.META_SHIFT_ON),
    IS_IT_MY_ADDRESS("isItMyAddress", R.id.wallet_menu_is_it_my_address, R.string.wallet_menu_is_it_my_address, android.R.drawable.ic_menu_search),
    BROADCAST_TRANSACTION("broadcastTransaction", R.id.wallet_menu_broadcast_transaction, R.string.wallet_menu_broadcast_transaction, android.R.drawable.ic_menu_send),
    GENERATE_WORD("generateWord", R.id.wallet_menu_generate_word, R.string.wallet_menu_generate_word, android.R.drawable.ic_menu_edit),
    ADD_RECIPIENT("add_recipient", R.id.wallet_menu_add_recipient, R.string.wallet_menu_add_recipient, android.R.drawable.ic_menu_add),
    REMOVE_RECIPIENT("remove_recipient", R.id.wallet_menu_remove_recipient, R.string.wallet_menu_remove_recipient, android.R.drawable.ic_menu_delete),
    REMOVE_ALL_RECIPIENTS("remove_all_recipients", R.id.wallet_menu_remove_all_recipients, R.string.wallet_menu_remove_all_recipients, android.R.drawable.ic_menu_delete),
    SEND_MAX("send_max", R.id.wallet_menu_send_max, R.string.wallet_menu_send_max, android.R.drawable.ic_menu_send),
    ALLOW_RBF("allow_rbf", R.id.wallet_menu_allow_rbf, R.string.wallet_menu_allow_rbf, android.R.drawable.ic_popup_sync),
    IMPORT_TRANSACTION("import_transaction", R.id.wallet_menu_import_transaction, R.string.wallet_menu_import_transaction, android.R.drawable.ic_menu_upload),
    IMPORT_TRANSACTION_QR("import_transaction_qr", R.id.wallet_menu_import_transaction_qr, R.string.wallet_menu_import_transaction_qr, android.R.drawable.ic_menu_camera),
    IMPORT_TRANSACTION_MULTISIG("import_transaction_multisig", R.id.wallet_menu_import_transaction_multisig, R.string.wallet_menu_import_transaction_multisig, android.R.drawable.ic_menu_upload),
    CO_SIGN_TRANSACTION("co_sign_transaction", R.id.wallet_menu_co_sign_transaction, R.string.wallet_menu_co_sign_transaction, android.R.drawable.ic_menu_edit),
    SIGN_PSBT("sign_psbt", R.id.wallet_menu_sign_psbt, R.string.wallet_menu_sign_psbt, android.R.drawable.ic_menu_edit),
    INSERT_CONTACT("insert_contact", R.id.wallet_menu_insert_contact, R.string.wallet_menu_insert_contact, android.R.drawable.ic_menu_add),
    COIN_CONTROL("coin_control", R.id.wallet_menu_coin_control, R.string.wallet_menu_coin_control, android.R.drawable.ic_menu_manage),
    SHORTCUTS("keyboardShortcuts", R.id.wallet_menu_shortcuts, R.string.wallet_menu_shortcuts, android.R.drawable.ic_menu_help, KeyEvent.KEYCODE_SLASH, '/'),
    SETTINGS("settings", R.id.wallet_menu_settings, R.string.wallet_menu_settings, android.R.drawable.ic_menu_preferences, KeyEvent.KEYCODE_COMMA, ',');

    fun matches(event: KeyEvent): Boolean = keyCode != null && event.keyCode == keyCode && event.hasModifiers(modifiers)
}
