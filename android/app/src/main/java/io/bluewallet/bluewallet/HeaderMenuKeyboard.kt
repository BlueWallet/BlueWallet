package io.bluewallet.bluewallet

import android.view.KeyEvent
import org.json.JSONArray
import org.json.JSONObject

internal data class HeaderMenuShortcut(
    val action: String, val title: String, val keyCode: Int, val character: Char,
    val modifiers: Int, val enabled: Boolean
) {
    fun matches(event: KeyEvent): Boolean = enabled && event.keyCode == keyCode && event.hasModifiers(modifiers)

    companion object {
        fun from(entry: JSONObject, enabled: Boolean): HeaderMenuShortcut? {
            val shortcut = entry.optJSONObject("shortcut") ?: return null
            val input = shortcut.optString("input").singleOrNull() ?: return null
            val keyCode = when (input) {
                '\r' -> KeyEvent.KEYCODE_ENTER
                in '0'..'9' -> KeyEvent.KEYCODE_0 + (input - '0')
                in 'a'..'z' -> KeyEvent.KEYCODE_A + (input - 'a')
                else -> return null
            }
            val flags = shortcut.optJSONArray("modifiers") ?: JSONArray()
            var modifiers = 0
            for (index in 0 until flags.length()) {
                modifiers = modifiers or when (flags.optString(index)) {
                    "command" -> KeyEvent.META_CTRL_ON
                    "shift" -> KeyEvent.META_SHIFT_ON
                    "alternate" -> KeyEvent.META_ALT_ON
                    else -> return null
                }
            }
            return HeaderMenuShortcut(entry.optString("id"), entry.optString("title"), keyCode,
                if (input == '\r') '\n' else input, modifiers, enabled)
        }

        fun collect(entries: JSONArray, parentEnabled: Boolean = true): List<HeaderMenuShortcut> = buildList {
            for (index in 0 until entries.length()) {
                val entry = entries.optJSONObject(index) ?: continue
                val enabled = parentEnabled && !entry.optBoolean("disabled")
                val children = entry.optJSONArray("children")
                if (children != null && children.length() > 0) addAll(collect(children, enabled))
                else from(entry, enabled)?.let { add(it) }
            }
        }
    }
}
