package io.bluewallet.bluewallet

import android.view.KeyEvent
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class WalletMenuActionTest {
    @Test
    fun walletDetailsCommandsHaveResourcesAndReachableShortcuts() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val commands = listOf(
            WalletMenuAction.EDIT_WALLET_NAME, WalletMenuAction.SHOW_ADDRESSES,
            WalletMenuAction.SHOW_XPUB, WalletMenuAction.SIGN_VERIFY,
            WalletMenuAction.IMPORT_WALLET_NOTES, WalletMenuAction.EXPORT_WALLET_BACKUP,
            WalletMenuAction.EXPORT_ACCOUNTING_CSV, WalletMenuAction.EXPORT_BIP329_LABELS,
            WalletMenuAction.DELETE_WALLET
        )
        assertEquals(commands.size, commands.map { it.itemId }.toSet().size)
        commands.forEach { action ->
            assertTrue(context.getString(action.titleId).isNotBlank())
            assertNotNull(context.resources.getResourceName(action.itemId))
            action.keyCode?.let { keyCode ->
                val event = KeyEvent(0, 0, KeyEvent.ACTION_DOWN, keyCode, 0, action.modifiers)
                assertEquals(action, commands.single { it.matches(event) })
                assertFalse(action.matches(KeyEvent(KeyEvent.ACTION_DOWN, keyCode)))
            }
        }
        assertTrue(WalletMenuAction.EXPORT_ACCOUNTING_CSV.matches(
            KeyEvent(0, 0, KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_C, 0,
                KeyEvent.META_CTRL_ON or KeyEvent.META_ALT_ON or KeyEvent.META_SHIFT_ON)))
        assertTrue(WalletMenuAction.EXPORT_BIP329_LABELS.matches(
            KeyEvent(0, 0, KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_B, 0,
                KeyEvent.META_CTRL_ON or KeyEvent.META_ALT_ON or KeyEvent.META_SHIFT_ON)))
    }

    @Test
    fun coinControlUsesViewOnWalletDetailsAndSendOnSendDetails() {
        val details = listOf(WalletMenuAction.EDIT_WALLET_NAME, WalletMenuAction.COIN_CONTROL)
        val send = listOf(WalletMenuAction.ADD_RECIPIENT, WalletMenuAction.COIN_CONTROL)
        assertEquals(WalletMenuAction.Group.VIEW, WalletMenuAction.COIN_CONTROL.groupFor(details))
        assertFalse(details.any { it.groupFor(details) == WalletMenuAction.Group.SEND })
        assertEquals(WalletMenuAction.Group.SEND, WalletMenuAction.COIN_CONTROL.groupFor(send))
    }
}
