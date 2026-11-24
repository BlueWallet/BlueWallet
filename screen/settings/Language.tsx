/**
 * The app's language, in the settings style: a search box and every language
 * in one card, each with a short code in a round badge and the one in use
 * ticked. A change of writing direction needs a restart, and says so.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import presentAlert from '../../components/Alert';
import Icon from '../../components/Icon';
import { SettingsCard, SettingsScreenHeader, SettingsSearchField, useSettingsPalette } from '../../components/settings/SettingsUI';
import { useSettings } from '../../hooks/context/useSettings';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { AvailableLanguages, TLanguage } from '../../loc/languages';

/**
 * `Deutsch (DE)` → name `Deutsch`, code `DE`; `Español (Latin America) (es_419)`
 * → `Español (Latin America)`, `ES`; `English` → `English`, `EN` (from its
 * value). A name two languages would share (`Chinese (TW)`, `Chinese (ZH)`)
 * keeps its full label.
 */
const CODE_SUFFIX = /^(.*?)\s*\(([A-Za-z0-9_]{2,6})\)$/;
const strippedName = (label: string): string => CODE_SUFFIX.exec(label)?.[1] ?? label;
const NAME_COUNT = AvailableLanguages.reduce<Record<string, number>>((count, l) => {
  const name = strippedName(l.label);
  count[name] = (count[name] ?? 0) + 1;
  return count;
}, {});

function languageParts(language: TLanguage): { name: string; code: string } {
  const match = CODE_SUFFIX.exec(language.label);
  const raw = match ? match[2] : language.value;
  const name = strippedName(language.label);
  return { name: NAME_COUNT[name] > 1 ? language.label : name, code: raw.split('_')[0].toUpperCase().slice(0, 3) };
}

const Language: React.FC = () => {
  const navigation = useExtendedNavigation();
  const p = useSettingsPalette();
  const insets = useSafeAreaInsets();
  const { setLanguageStorage, language } = useSettings();
  const [search, setSearch] = useState('');

  const languages = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? AvailableLanguages.filter(l => l.label.toLowerCase().includes(query)) : AvailableLanguages;
  }, [search]);

  const choose = useCallback(
    (item: TLanguage) => {
      Keyboard.dismiss();
      const current = AvailableLanguages.find(l => l.value === language);
      setLanguageStorage(item.value).then(() => {
        if (current?.isRTL !== item.isRTL) presentAlert({ message: loc.settings.language_isRTL });
      });
    },
    [language, setLanguageStorage],
  );

  return (
    <View style={[styles.root, { backgroundColor: p.ground }]} testID="LanguageFlatList">
      <SettingsScreenHeader title={loc.settings.language} onBack={() => navigation.goBack()} />
      <View style={styles.searchBox}>
        <SettingsSearchField value={search} onChangeText={setSearch} placeholder={loc.settings.language_search} testID="LanguageSearch" />
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <SettingsCard>
          {languages.map((item, i) => {
            const isSelected = item.value === language;
            const { name, code } = languageParts(item);
            return (
              <Pressable
                key={item.value}
                onPress={() => choose(item)}
                disabled={isSelected}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={item.label}
                testID={`Language-${item.value}`}
                style={({ pressed }) => [
                  styles.row,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: p.divider },
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.badge, { backgroundColor: isSelected ? p.accentSoft : p.ground }]}>
                  <Text style={[styles.badgeText, { color: isSelected ? p.accentText : p.ink }]}>{code}</Text>
                </View>
                <Text style={[styles.title, styles.texts, { color: isSelected ? p.accentText : p.ink }]} numberOfLines={1}>
                  {name}
                </Text>
                {isSelected && <Icon name="check" type="material" size={22} color={p.accentText} />}
              </Pressable>
            );
          })}
          {languages.length === 0 && <Text style={[styles.empty, { color: p.mutedOnCard }]}>{loc.settings.search_empty}</Text>}
        </SettingsCard>
      </ScrollView>
    </View>
  );
};

export default Language;

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchBox: { paddingHorizontal: 16, paddingBottom: 8 },
  content: { paddingHorizontal: 16, paddingTop: 8 },
  pressed: { opacity: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', columnGap: 12, minHeight: 56, paddingVertical: 8 },
  badge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 13, fontWeight: '700' },
  texts: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600' },
  empty: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
});
