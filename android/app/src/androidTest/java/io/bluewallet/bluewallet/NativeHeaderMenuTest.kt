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
        val unit = HeaderMenuShortcut.from(command("BTC", "1", listOf("command", "alternate")), true)!!
        assertEquals(KeyEvent.KEYCODE_1, unit.keyCode)
        assertTrue(unit.matches(KeyEvent(0, 0, KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_1, 0, KeyEvent.META_CTRL_ON or KeyEvent.META_ALT_ON)))
        for ((input, keyCode) in listOf("[" to KeyEvent.KEYCODE_LEFT_BRACKET, "]" to KeyEvent.KEYCODE_RIGHT_BRACKET)) {
            val recipient = HeaderMenuShortcut.from(command("recipient", input, listOf("command", "alternate")), true)!!
            assertTrue(recipient.matches(KeyEvent(0, 0, KeyEvent.ACTION_DOWN, keyCode, 0, KeyEvent.META_CTRL_ON or KeyEvent.META_ALT_ON)))
            assertFalse(recipient.matches(KeyEvent(0, 0, KeyEvent.ACTION_DOWN, keyCode, 0, KeyEvent.META_CTRL_ON)))
        }
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
            HeaderMenuRenderer(context).populate(menu, items, setOf(WalletMenuAction.SETTINGS))
            assertNull(menu.findItem(WalletMenuAction.SEND.itemId))
            assertTrue(menu.findItem(WalletMenuAction.SETTINGS.itemId)!!.isEnabled)
            assertEquals(listOf("Recipients", "Settings"),
                (0 until menu.size()).map { menu.getItem(it).title.toString() })
            val recipients = menu.getItem(0).subMenu!!
            assertTrue(recipients.getItem(0).isChecked)
            assertEquals('n', recipients.getItem(0).alphabeticShortcut)
            assertFalse(recipients.getItem(1).isEnabled)
            assertTrue(recipients.getItem(2).contentDescription.toString().contains("partially selected"))
            assertFalse(recipients.getItem(2).isCheckable)
            assertTrue(recipients.getItem(3).contentDescription.toString().contains("destructive action"))
            assertNotEquals(recipients.getItem(0).groupId, recipients.getItem(3).groupId)
        }
    }

    @Test fun groupsCommandsOnPhonesAndTablets() {
        InstrumentationRegistry.getInstrumentation().runOnMainSync {
            val context = ContextThemeWrapper(InstrumentationRegistry.getInstrumentation().targetContext, R.style.AppTheme)
            val menu = MenuBuilder(context)
            HeaderMenuRenderer(context).populate(menu, JSONArray(), setOf(WalletMenuAction.SHORTCUTS, WalletMenuAction.SETTINGS))
            assertFalse(menu.getItem(0).hasSubMenu())
            assertNull(menu.findItem(WalletMenuAction.SEND.itemId))
            assertTrue(menu.findItem(WalletMenuAction.SHORTCUTS.itemId).isEnabled)
            assertTrue(menu.findItem(WalletMenuAction.SETTINGS.itemId).isEnabled)
            assertEquals(listOf("Settings", "Keyboard Shortcuts"),
                (0 until menu.size()).map { menu.getItem(it).title.toString() })
        }
    }
    @Test fun groupsWalletOperationsByTheirPurpose() {
        InstrumentationRegistry.getInstrumentation().runOnMainSync {
            val context = ContextThemeWrapper(InstrumentationRegistry.getInstrumentation().targetContext, R.style.AppTheme)
            val menu = MenuBuilder(context)
            HeaderMenuRenderer(context).populate(menu, JSONArray(), setOf(
                WalletMenuAction.ADD_WALLET, WalletMenuAction.IMPORT_WALLET, WalletMenuAction.DETAILS,
                WalletMenuAction.SEND, WalletMenuAction.RECEIVE))
            assertEquals(listOf("File", "View", "Transaction"),
                (0 until menu.size()).map { menu.getItem(it).title.toString() })
            assertNotNull(menu.getItem(0).subMenu!!.findItem(WalletMenuAction.IMPORT_WALLET.itemId))
            assertNotNull(menu.getItem(1).subMenu!!.findItem(WalletMenuAction.DETAILS.itemId))
            assertNotNull(menu.getItem(2).subMenu!!.findItem(WalletMenuAction.SEND.itemId))
        }
    }

    @Test fun keepsCloseOutsideActionGroupsAndRemovesEmptyParents() {
        InstrumentationRegistry.getInstrumentation().runOnMainSync {
            val context = ContextThemeWrapper(InstrumentationRegistry.getInstrumentation().targetContext, R.style.AppTheme)
            val close = command("NavigationCloseButton", "w", listOf("command"))
            for (withImport in listOf(false, true)) {
                val children = JSONArray().put(JSONObject().put("inline", true).put("children", JSONArray().put(close)))
                if (withImport) children.put(command("import_file", "i", listOf("command")))
                val items = JSONArray().put(JSONObject().put("id", "category:file").put("title", "File").put("children", children))
                val menu = MenuBuilder(context)
                HeaderMenuRenderer(context).populate(menu, items, emptySet())
                assertEquals(if (withImport) 2 else 1, menu.size())
                val closeItem = menu.getItem(menu.size() - 1)
                assertEquals("NavigationCloseButton", closeItem.title.toString())
                assertFalse(closeItem.hasSubMenu())
                assertEquals('w', closeItem.alphabeticShortcut)
                assertEquals("header:screen:NavigationCloseButton", closeItem.intent!!.getStringExtra("bluewallet.headerAction"))
                if (withImport) assertEquals(1, menu.getItem(0).subMenu!!.size())
                assertEquals(1, items.getJSONObject(0).getJSONArray("children").getJSONObject(0).getJSONArray("children").length())
            }
        }
    }

    @Test fun rendersMenuButtonWithAndroidAccessibilityAndInteraction() {
        InstrumentationRegistry.getInstrumentation().runOnMainSync {
            val base = ContextThemeWrapper(InstrumentationRegistry.getInstrumentation().targetContext, R.style.AppTheme)
            val manager = AppMenuButtonManager()
            var clicks = 0
            val button = manager.createButton(base) { clicks++ }
            assertEquals(base.getString(R.string.wallet_menu_open), button.text.toString())
            assertEquals(button.text.toString(), button.contentDescription.toString())
            assertTrue(button.isFocusable)
            assertTrue(button.isClickable)
            manager.setTextColor(button, android.graphics.Color.WHITE)
            manager.setButtonTintColor(button, android.graphics.Color.BLUE)
            assertEquals(android.graphics.Color.WHITE, button.currentTextColor)
            assertEquals(android.graphics.Color.BLUE, button.backgroundTintList!!.defaultColor)
            assertNotNull(button.background)
            button.performClick()
            assertEquals(1, clicks)
        }
    }

}
