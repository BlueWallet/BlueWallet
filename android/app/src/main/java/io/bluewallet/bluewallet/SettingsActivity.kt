package io.bluewallet.bluewallet

import android.os.Bundle
import android.util.Log
import androidx.appcompat.app.AppCompatActivity
import androidx.preference.PreferenceFragmentCompat

/**
 * Settings Activity accessible from Android System Settings
 */
class SettingsActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.settings_activity)
        
        Log.d("SettingsActivity", "Settings activity created")
        
        // Enable back button in action bar
        supportActionBar?.setDisplayHomeAsUpEnabled(true)
        
        if (savedInstanceState == null) {
            supportFragmentManager
                .beginTransaction()
                .replace(R.id.settings_container, SettingsFragment())
                .commit()
        }
    }

    override fun onSupportNavigateUp(): Boolean {
        finish()
        return true
    }

    class SettingsFragment : PreferenceFragmentCompat() {
        override fun onCreatePreferences(savedInstanceState: Bundle?, rootKey: String?) {
            // Set the SharedPreferences name to match the app's preferences
            preferenceManager.sharedPreferencesName = "group.io.bluewallet.bluewallet"
            
            // Load preferences from XML
            setPreferencesFromResource(R.xml.settings_preferences, rootKey)
            
            Log.d("SettingsFragment", "Preferences loaded from XML")
            
            // Set up click listener for deviceUIDCopy to copy to clipboard
            val deviceUIDPref = findPreference<androidx.preference.Preference>("deviceUIDCopy")
            deviceUIDPref?.let { pref ->
                // Get the device UID from SharedPreferences
                val sharedPref = preferenceManager.sharedPreferences
                val deviceUID = sharedPref?.getString("deviceUIDCopy", "") ?: ""
                
                // Set the summary to show the UUID
                pref.summary = deviceUID
                
                // Check if report issue is disabled
                val isDisabled = deviceUID == "Disabled"
                
                // Make it non-selectable if disabled
                pref.isSelectable = !isDisabled
                
                // Set click listener to copy to clipboard (only if not disabled)
                if (!isDisabled) {
                    pref.setOnPreferenceClickListener {
                        if (deviceUID.isNotEmpty()) {
                            val clipboard = requireContext().getSystemService(android.content.Context.CLIPBOARD_SERVICE) 
                                as android.content.ClipboardManager
                            val clip = android.content.ClipData.newPlainText("Device UID", deviceUID)
                            clipboard.setPrimaryClip(clip)
                            
                            // Show a toast message
                            android.widget.Toast.makeText(
                                requireContext(),
                                R.string.copied_to_clipboard,
                                android.widget.Toast.LENGTH_SHORT
                            ).show()
                            
                            Log.d("SettingsFragment", "Device UID copied to clipboard: $deviceUID")
                        }
                        true
                    }
                }
            }
        }
    }
}

