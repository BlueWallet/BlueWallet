package io.bluewallet.bluewallet

import android.view.KeyEvent
import androidx.appcompat.view.ContextThemeWrapper
import androidx.appcompat.view.menu.MenuBuilder
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class NativeHeaderMenuTest {
    private fun command(id: String, input: String, flags: List<String>, disabled: Boolean = false): JSONObject =
        JSONObject().put("id", "header:screen:$id").put("title", id).put("disabled", disabled)
            .put("shortcut", JSONObject().put("input", input).put("modifiers", JSONArray(flags)))

    @Test fun convertsModifiersAndRejectsDisabledOrUnrelatedKeys() {
        val entry = command("AddRecipient", "n", listOf("command", "shift"))
        val shortcut = HeaderMenuShortcut.from(entry, true)!!
        assertEquals(KeyEvent.META_CTRL_ON or KeyEvent.META_SHIFT_ON, shortcut.modifiers)
        assertTrue(shortcut.matches(KeyEvent(0, 0, KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_N, 0, shortcut.modifiers)))
        assertFalse(shortcut.matches(KeyEvent(0, 0, KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_N, 0, KeyEvent.META_CTRL_ON)))
        assertFalse(HeaderMenuShortcut.from(entry, false)!!.matches(
            KeyEvent(0, 0, KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_N, 0, shortcut.modifiers)))
        assertFalse(shortcut.matches(KeyEvent(0, 0, KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_C, 0, KeyEvent.META_CTRL_ON)))
        val enter = HeaderMenuShortcut.from(command("Done", "\r", listOf("command")), true)!!
        assertEquals(KeyEvent.KEYCODE_ENTER, enter.keyCode)
        assertEquals('\n', enter.character)
        val alt = HeaderMenuShortcut.from(command("Contact", "n", listOf("command", "alternate")), true)!!
        assertEquals(KeyEvent.META_CTRL_ON or KeyEvent.META_ALT_ON, alt.modifiers)
        val parent = JSONObject().put("disabled", true).put("children", JSONArray().put(entry))
        assertFalse(HeaderMenuShortcut.collect(JSONArray().put(parent)).single().enabled)
    }

    @Test fun retainsStableCommandsAndNativeStatesAndSeparatorsOnTablet() {
        InstrumentationRegistry.getInstrumentation().runOnMainSync {
            val context = ContextThemeWrapper(InstrumentationRegistry.getInstrumentation().targetContext, R.style.AppTheme)
            val menu = MenuBuilder(context)
            val add = command("AddRecipient", "n", listOf("command", "shift")).put("state", true)
            val disabled = command("Export", "e", listOf("command", "shift"), true)
            val mixed = JSONObject().put("id", "header:screen:mixed").put("title", "Mixed").put("state", "mixed")
            val remove = JSONObject().put("id", "header:screen:remove").put("title", "Remove").put("destructive", true)
            val sections = JSONArray()
                .put(JSONObject().put("id", "section:normal").put("inline", true).put("children", JSONArray().put(add).put(disabled).put(mixed)))
                .put(JSONObject().put("id", "section:remove").put("inline", true).put("children", JSONArray().put(remove)))
            val items = JSONArray().put(JSONObject().put("id", "category:recipients").put("title", "Recipients").put("children", sections))
            HeaderMenuRenderer(context).populate(menu, items, setOf(WalletMenuAction.SETTINGS), true)
            assertNotNull(menu.findItem(WalletMenuAction.SEND.itemId))
            assertFalse(menu.findItem(WalletMenuAction.SEND.itemId)!!.isEnabled)
            assertTrue(menu.findItem(WalletMenuAction.SETTINGS.itemId)!!.isEnabled)
            assertEquals(listOf("Edit", "View", "Wallet", "Recipients", "Settings", "Help"),
                (0 until menu.size()).map { menu.getItem(it).title.toString() })
            val recipients = menu.getItem(3).subMenu!!
            assertTrue(recipients.getItem(0).isChecked)
            assertEquals('n', recipients.getItem(0).alphabeticShortcut)
            assertFalse(recipients.getItem(1).isEnabled)
            assertTrue(recipients.getItem(2).contentDescription.toString().contains("partially selected"))
            assertFalse(recipients.getItem(2).isCheckable)
            assertTrue(recipients.getItem(3).contentDescription.toString().contains("destructive action"))
            assertNotEquals(recipients.getItem(0).groupId, recipients.getItem(3).groupId)
        }
    }

    @Test fun leavesPhoneMenusUnchanged() {
        InstrumentationRegistry.getInstrumentation().runOnMainSync {
            val context = ContextThemeWrapper(InstrumentationRegistry.getInstrumentation().targetContext, R.style.AppTheme)
            val menu = MenuBuilder(context)
            HeaderMenuRenderer(context).populate(menu, JSONArray(), setOf(WalletMenuAction.SHORTCUTS, WalletMenuAction.SETTINGS), false)
            assertEquals(2, menu.size())
            assertNull(menu.findItem(WalletMenuAction.SEND.itemId))
            assertEquals("Keyboard Shortcuts…", menu.getItem(0).title.toString())
            assertFalse(menu.getItem(0).hasSubMenu())
        }
    }
}
