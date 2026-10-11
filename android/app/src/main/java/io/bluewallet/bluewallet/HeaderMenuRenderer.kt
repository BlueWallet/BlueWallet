package io.bluewallet.bluewallet

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.text.SpannableString
import android.text.Spanned
import android.text.style.ForegroundColorSpan
import android.view.Menu
import android.view.MenuItem
import androidx.core.view.MenuCompat
import androidx.core.view.MenuItemCompat
import com.google.android.material.color.MaterialColors
import org.json.JSONArray
import org.json.JSONObject

/** Native Android menu groups, with platform checkboxes, labels and separators. */
internal class HeaderMenuRenderer(private val context: Context) {
    private var nextId = 0x02000000
    private var nextGroupId = 0x03000000

    fun populate(menu: Menu, items: JSONArray, available: Set<WalletMenuAction>) {
        val dynamic = mutableMapOf<String, JSONObject>()
        for (index in 0 until items.length()) {
            val entry = items.optJSONObject(index) ?: continue
            val filtered = withoutClose(entry) ?: continue
            dynamic[filtered.optString("id").removePrefix("category:")] = filtered
        }
        val titles = linkedMapOf(
            "file" to R.string.wallet_menu_category_file, "edit" to R.string.wallet_menu_category_edit,
            "view" to R.string.wallet_menu_category_view,
            "transaction" to R.string.wallet_menu_category_transaction, "recipients" to R.string.wallet_menu_category_recipients,
            "server" to R.string.wallet_menu_category_server, "settings" to R.string.wallet_menu_category_settings,
            "help" to R.string.wallet_menu_category_help
        )
        for ((category, titleId) in titles) {
            val commands = WalletMenuAction.entries.filter { it.category == category && it in available }
            val entry = dynamic[category]
            val sort = if (category == "view") dynamic["sort"] else null
            if (commands.isEmpty() && entry == null && sort == null) continue
            // Single app destinations don't need an otherwise empty parent menu.
            if (category in setOf("settings", "help") && commands.size == 1 && entry == null && sort == null) {
                addCommand(menu, commands.single(), Menu.NONE)
                continue
            }
            val title = entry?.optString("title") ?: context.getString(titleId)
            val submenu = menu.addSubMenu(R.id.wallet_menu_group, nextId++, Menu.NONE, title)
            commands.forEachIndexed { index, action -> addCommand(submenu, action, index) }
            entry?.optJSONArray("children")?.let { add(it, submenu, nextGroupId++) }
            if (sort != null) add(JSONArray().put(sort), submenu, nextGroupId++)
        }
        // Closing a screen is navigation, so keep it outside object/action submenus.
        val closeActions = JSONArray()
        fun collectClose(entries: JSONArray) {
            for (index in 0 until entries.length()) {
                val entry = entries.optJSONObject(index) ?: continue
                if (entry.optString("id").endsWith(":NavigationCloseButton")) closeActions.put(entry)
                else entry.optJSONArray("children")?.let { collectClose(it) }
            }
        }
        collectClose(items)
        add(closeActions, menu, nextGroupId++, includeClose = true)
        menu.setQwertyMode(true)
    }

    private fun withoutClose(entry: JSONObject): JSONObject? {
        if (entry.optString("id").endsWith(":NavigationCloseButton")) return null
        val children = entry.optJSONArray("children") ?: return entry
        val filtered = JSONArray()
        for (index in 0 until children.length()) {
            children.optJSONObject(index)?.let { withoutClose(it) }?.let { filtered.put(it) }
        }
        if (filtered.length() == 0) return null
        return JSONObject(entry.toString()).put("children", filtered)
    }

    private fun addCommand(menu: Menu, action: WalletMenuAction, order: Int) {
        val titleId = when (action) {
            WalletMenuAction.DETAILS -> R.string.wallet_menu_details_plain
            WalletMenuAction.SHORTCUTS -> R.string.wallet_menu_shortcuts_plain
            else -> action.titleId
        }
        menu.add(R.id.wallet_menu_group, action.itemId, order, titleId).apply {
            isEnabled = true
            MenuItemCompat.setContentDescription(this, context.getString(titleId))
            MenuItemCompat.setAlphabeticShortcut(this, action.shortcut, action.modifiers)
            setShowAsAction(MenuItem.SHOW_AS_ACTION_NEVER)
        }
    }

    private fun add(entries: JSONArray, menu: Menu, groupId: Int, parentEnabled: Boolean = true, includeClose: Boolean = false) {
        MenuCompat.setGroupDividerEnabled(menu, true)
        for (index in 0 until entries.length()) {
            val entry = entries.optJSONObject(index) ?: continue
            if (!includeClose && entry.optString("id").endsWith(":NavigationCloseButton")) continue
            val children = entry.optJSONArray("children")
            val enabled = parentEnabled && !entry.optBoolean("disabled")
            if (children != null && children.length() > 0) {
                if (entry.optBoolean("inline")) add(children, menu, nextGroupId++, enabled)
                else {
                    val submenu = menu.addSubMenu(groupId, nextId++, Menu.NONE, entry.optString("title"))
                    submenu.item.isEnabled = enabled
                    MenuItemCompat.setContentDescription(submenu.item, entry.optString("title"))
                    add(children, submenu, nextGroupId++, enabled)
                }
            } else {
                menu.add(groupId, nextId++, Menu.NONE, entry.optString("title")).apply {
                    isEnabled = enabled
                    val mixed = entry.optString("state") == "mixed"
                    if (entry.has("state")) {
                        isCheckable = !mixed // Android's native menu checkbox has no indeterminate state.
                        isChecked = entry.optBoolean("state")
                    }
                    if (mixed) setTitle("${entry.optString("title")} (${context.getString(R.string.wallet_menu_partially_selected)})")
                    val description = mutableListOf(entry.optString("title"))
                    entry.optString("subtitle").takeIf { it.isNotEmpty() }?.let {
                        description.add(it)
                        MenuItemCompat.setTooltipText(this, it)
                    }
                    if (mixed) description.add(context.getString(R.string.wallet_menu_partially_selected))
                    if (entry.optBoolean("destructive")) {
                        description.add(context.getString(R.string.wallet_menu_destructive))
                        if (enabled) {
                            val color = MaterialColors.getColor(context, android.R.attr.colorError, Color.RED)
                            setTitle(SpannableString(title).apply {
                                setSpan(ForegroundColorSpan(color), 0, length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
                            })
                        }
                    }
                    MenuItemCompat.setContentDescription(this, description.joinToString(", "))
                    val symbol = entry.optString("icon")
                    val iconId = if (symbol.startsWith("ic_")) {
                        context.resources.getIdentifier(symbol, "drawable", "android")
                    } else when (symbol) {
                        "person.badge.plus", "plus" -> android.R.drawable.ic_menu_add
                        "person.badge.minus", "person.2.slash", "trash" -> android.R.drawable.ic_menu_delete
                        "square.and.arrow.up" -> android.R.drawable.ic_menu_share
                        "square.and.arrow.down", "square.and.arrow.down.on.square" -> android.R.drawable.ic_menu_save
                        "qrcode.viewfinder" -> android.R.drawable.ic_menu_camera
                        "info.circle" -> android.R.drawable.ic_menu_info_details
                        "signature", "rectangle.and.pencil.and.ellipsis" -> android.R.drawable.ic_menu_edit
                        else -> 0
                    }
                    if (iconId != 0) setIcon(iconId)
                    HeaderMenuShortcut.from(entry, enabled)?.let { MenuItemCompat.setAlphabeticShortcut(this, it.character, it.modifiers) }
                    intent = Intent().putExtra("bluewallet.headerAction", entry.optString("id"))
                    setShowAsAction(MenuItem.SHOW_AS_ACTION_NEVER)
                }
            }
        }
    }
}
