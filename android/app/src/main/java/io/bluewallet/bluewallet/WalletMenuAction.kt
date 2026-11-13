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
    val modifiers: Int = KeyEvent.META_CTRL_ON,
    val group: Group = Group.GENERAL
) {
    OPEN_FILE("openFile", R.id.wallet_menu_open_file, R.string.wallet_menu_open_file, android.R.drawable.ic_menu_upload, KeyEvent.KEYCODE_O, 'o'),
    ADD_WALLET("addWallet", R.id.wallet_menu_add, R.string.wallet_menu_add, android.R.drawable.ic_menu_add, KeyEvent.KEYCODE_A, 'a',
        KeyEvent.META_CTRL_ON or KeyEvent.META_SHIFT_ON, Group.WALLET),
    IMPORT_WALLET("importWallet", R.id.wallet_menu_import, R.string.wallet_menu_import, android.R.drawable.ic_menu_save, KeyEvent.KEYCODE_I, 'i', group = Group.WALLET),
    RELOAD_TRANSACTIONS("reloadTransactions", R.id.wallet_menu_reload, R.string.wallet_menu_reload, android.R.drawable.ic_popup_sync, KeyEvent.KEYCODE_R, 'r', group = Group.VIEW),
    SEND("send", R.id.wallet_menu_send, R.string.wallet_menu_send, android.R.drawable.ic_menu_send, KeyEvent.KEYCODE_S, 's',
        KeyEvent.META_CTRL_ON or KeyEvent.META_SHIFT_ON, Group.WALLET),
    RECEIVE("receive", R.id.wallet_menu_receive, R.string.wallet_menu_receive, android.R.drawable.ic_menu_directions, KeyEvent.KEYCODE_R, 'r',
        KeyEvent.META_CTRL_ON or KeyEvent.META_SHIFT_ON, Group.WALLET),
    DETAILS("walletDetails", R.id.wallet_menu_details, R.string.wallet_menu_details, android.R.drawable.ic_menu_info_details, KeyEvent.KEYCODE_D, 'd', group = Group.WALLET),
    COPY_ADDRESS("copyAddress", R.id.wallet_menu_copy_address, R.string.wallet_menu_copy_address, android.R.drawable.ic_menu_edit, KeyEvent.KEYCODE_C, 'c',
        KeyEvent.META_CTRL_ON or KeyEvent.META_SHIFT_ON, Group.EDIT),
    COPY_TRANSACTION_ID("copyTransactionId", R.id.wallet_menu_copy_transaction_id, R.string.wallet_menu_copy_transaction_id, android.R.drawable.ic_menu_edit, KeyEvent.KEYCODE_C, 'c',
        KeyEvent.META_CTRL_ON or KeyEvent.META_SHIFT_ON, Group.EDIT),
    ACCELERATE_TRANSACTION("accelerateTransaction", R.id.wallet_menu_accelerate_transaction, R.string.wallet_menu_accelerate_transaction, android.R.drawable.ic_media_play, KeyEvent.KEYCODE_U, 'u',
        KeyEvent.META_CTRL_ON or KeyEvent.META_SHIFT_ON, Group.VIEW),
    BACK_TO_WALLETS("backToWallets", R.id.wallet_menu_back, R.string.wallet_menu_back, android.R.drawable.ic_menu_revert, KeyEvent.KEYCODE_W, 'w',
        KeyEvent.META_CTRL_ON or KeyEvent.META_SHIFT_ON, Group.VIEW),
    IS_IT_MY_ADDRESS("isItMyAddress", R.id.wallet_menu_is_it_my_address, R.string.wallet_menu_is_it_my_address, android.R.drawable.ic_menu_search, KeyEvent.KEYCODE_M, 'm', KeyEvent.META_CTRL_ON or KeyEvent.META_SHIFT_ON, Group.TOOLS),
    BROADCAST_TRANSACTION("broadcastTransaction", R.id.wallet_menu_broadcast_transaction, R.string.wallet_menu_broadcast_transaction, android.R.drawable.ic_menu_send, KeyEvent.KEYCODE_B, 'b', KeyEvent.META_CTRL_ON or KeyEvent.META_SHIFT_ON, Group.TOOLS),
    GENERATE_WORD("generateWord", R.id.wallet_menu_generate_word, R.string.wallet_menu_generate_word, android.R.drawable.ic_menu_edit, KeyEvent.KEYCODE_G, 'g', KeyEvent.META_CTRL_ON or KeyEvent.META_SHIFT_ON, Group.TOOLS),
    ADD_RECIPIENT("add_recipient", R.id.wallet_menu_add_recipient, R.string.wallet_menu_add_recipient, android.R.drawable.ic_menu_add, KeyEvent.KEYCODE_A, 'a', KeyEvent.META_CTRL_ON or KeyEvent.META_ALT_ON, Group.SEND),
    REMOVE_RECIPIENT("remove_recipient", R.id.wallet_menu_remove_recipient, R.string.wallet_menu_remove_recipient, android.R.drawable.ic_menu_delete, KeyEvent.KEYCODE_R, 'r', KeyEvent.META_CTRL_ON or KeyEvent.META_ALT_ON, Group.SEND),
    REMOVE_ALL_RECIPIENTS("remove_all_recipients", R.id.wallet_menu_remove_all_recipients, R.string.wallet_menu_remove_all_recipients, android.R.drawable.ic_menu_delete, KeyEvent.KEYCODE_R, 'r', KeyEvent.META_CTRL_ON or KeyEvent.META_ALT_ON or KeyEvent.META_SHIFT_ON, Group.SEND),
    SEND_MAX("send_max", R.id.wallet_menu_send_max, R.string.wallet_menu_send_max, android.R.drawable.ic_menu_send, KeyEvent.KEYCODE_M, 'm', KeyEvent.META_CTRL_ON or KeyEvent.META_ALT_ON, Group.SEND),
    ALLOW_RBF("allow_rbf", R.id.wallet_menu_allow_rbf, R.string.wallet_menu_allow_rbf, android.R.drawable.ic_popup_sync, KeyEvent.KEYCODE_B, 'b', KeyEvent.META_CTRL_ON or KeyEvent.META_ALT_ON, Group.SEND),
    IMPORT_TRANSACTION("import_transaction", R.id.wallet_menu_import_transaction, R.string.wallet_menu_import_transaction, android.R.drawable.ic_menu_upload, KeyEvent.KEYCODE_I, 'i', KeyEvent.META_CTRL_ON or KeyEvent.META_ALT_ON, Group.SEND),
    IMPORT_TRANSACTION_QR("import_transaction_qr", R.id.wallet_menu_import_transaction_qr, R.string.wallet_menu_import_transaction_qr, android.R.drawable.ic_menu_camera, KeyEvent.KEYCODE_Q, 'q', KeyEvent.META_CTRL_ON or KeyEvent.META_ALT_ON, Group.SEND),
    IMPORT_TRANSACTION_MULTISIG("import_transaction_multisig", R.id.wallet_menu_import_transaction_multisig, R.string.wallet_menu_import_transaction_multisig, android.R.drawable.ic_menu_upload, KeyEvent.KEYCODE_I, 'i', KeyEvent.META_CTRL_ON or KeyEvent.META_ALT_ON or KeyEvent.META_SHIFT_ON, Group.SEND),
    CO_SIGN_TRANSACTION("co_sign_transaction", R.id.wallet_menu_co_sign_transaction, R.string.wallet_menu_co_sign_transaction, android.R.drawable.ic_menu_edit, KeyEvent.KEYCODE_C, 'c', KeyEvent.META_CTRL_ON or KeyEvent.META_ALT_ON, Group.SEND),
    SIGN_PSBT("sign_psbt", R.id.wallet_menu_sign_psbt, R.string.wallet_menu_sign_psbt, android.R.drawable.ic_menu_edit, KeyEvent.KEYCODE_S, 's', KeyEvent.META_CTRL_ON or KeyEvent.META_ALT_ON, Group.SEND),
    INSERT_CONTACT("insert_contact", R.id.wallet_menu_insert_contact, R.string.wallet_menu_insert_contact, android.R.drawable.ic_menu_add, KeyEvent.KEYCODE_P, 'p', KeyEvent.META_CTRL_ON or KeyEvent.META_ALT_ON, Group.SEND),
    COIN_CONTROL("coin_control", R.id.wallet_menu_coin_control, R.string.wallet_menu_coin_control, android.R.drawable.ic_menu_manage, KeyEvent.KEYCODE_O, 'o', KeyEvent.META_CTRL_ON or KeyEvent.META_ALT_ON, Group.SEND),
    EDIT_WALLET_NAME("editWalletName", R.id.wallet_menu_edit_wallet_name, R.string.wallet_menu_edit_wallet_name, android.R.drawable.ic_menu_edit, KeyEvent.KEYCODE_N, 'n', KeyEvent.META_CTRL_ON or KeyEvent.META_ALT_ON, Group.EDIT),
    SHOW_ADDRESSES("showAddresses", R.id.wallet_menu_show_addresses, R.string.wallet_menu_show_addresses, android.R.drawable.ic_menu_agenda, KeyEvent.KEYCODE_A, 'a', KeyEvent.META_CTRL_ON or KeyEvent.META_ALT_ON, Group.VIEW),
    SHOW_XPUB("showXpub", R.id.wallet_menu_show_xpub, R.string.wallet_menu_show_xpub, android.R.drawable.ic_menu_info_details, KeyEvent.KEYCODE_X, 'x', KeyEvent.META_CTRL_ON or KeyEvent.META_ALT_ON, Group.VIEW),
    SIGN_VERIFY("signVerify", R.id.wallet_menu_sign_verify, R.string.wallet_menu_sign_verify, android.R.drawable.ic_menu_edit, KeyEvent.KEYCODE_V, 'v', KeyEvent.META_CTRL_ON or KeyEvent.META_ALT_ON, Group.VIEW),
    IMPORT_WALLET_NOTES("importWalletNotes", R.id.wallet_menu_import_notes, R.string.wallet_menu_import_notes, android.R.drawable.ic_menu_upload, KeyEvent.KEYCODE_I, 'i', KeyEvent.META_CTRL_ON or KeyEvent.META_ALT_ON, Group.WALLET),
    EXPORT_WALLET_BACKUP("exportWalletBackup", R.id.wallet_menu_export_wallet, R.string.wallet_menu_export_wallet, android.R.drawable.ic_menu_save, KeyEvent.KEYCODE_E, 'e', KeyEvent.META_CTRL_ON or KeyEvent.META_ALT_ON, Group.WALLET),
    EXPORT_ACCOUNTING_CSV("exportAccountingCsv", R.id.wallet_menu_export_csv, R.string.wallet_menu_export_csv, android.R.drawable.ic_menu_save, KeyEvent.KEYCODE_C, 'c', KeyEvent.META_CTRL_ON or KeyEvent.META_ALT_ON or KeyEvent.META_SHIFT_ON, Group.EXPORT_HISTORY),
    EXPORT_BIP329_LABELS("exportBip329Backup", R.id.wallet_menu_export_labels, R.string.wallet_menu_export_labels, android.R.drawable.ic_menu_save, KeyEvent.KEYCODE_B, 'b', KeyEvent.META_CTRL_ON or KeyEvent.META_ALT_ON or KeyEvent.META_SHIFT_ON, Group.EXPORT_HISTORY),
    DELETE_WALLET("deleteWallet", R.id.wallet_menu_delete_wallet, R.string.wallet_menu_delete_wallet, android.R.drawable.ic_menu_delete, group = Group.WALLET),
    SHORTCUTS("keyboardShortcuts", R.id.wallet_menu_shortcuts, R.string.wallet_menu_shortcuts, android.R.drawable.ic_menu_help, KeyEvent.KEYCODE_SLASH, '/'),
    SETTINGS("settings", R.id.wallet_menu_settings, R.string.wallet_menu_settings, android.R.drawable.ic_menu_preferences, KeyEvent.KEYCODE_COMMA, ',');

    fun matches(event: KeyEvent): Boolean = keyCode != null && event.keyCode == keyCode && event.hasModifiers(modifiers)

    fun groupFor(available: Collection<WalletMenuAction>): Group =
        if (this == COIN_CONTROL && EDIT_WALLET_NAME in available) Group.VIEW else group

    enum class Group { GENERAL, WALLET, EDIT, VIEW, SEND, TOOLS, EXPORT_HISTORY }
}
