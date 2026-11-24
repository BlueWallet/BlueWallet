/**
 * The fiat currency balances are shown in, in the settings style: the one in
 * use on top with its rate, then every currency in one card, filtered by the
 * search box. Picking one fetches its rate first, so a currency whose rate
 * cannot be read is never left selected.
 */
import dayjs from 'dayjs';
import calendar from 'dayjs/plugin/calendar';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  CurrencyRate,
  getPreferredCurrency,
  initCurrencyDaemon,
  mostRecentFetchedRate,
  setPreferredCurrency,
} from '../../blue_modules/currency';
import presentAlert from '../../components/Alert';
import Icon from '../../components/Icon';
import { SettingsCard, SettingsScreenHeader, SettingsSearchField, useSettingsPalette } from '../../components/settings/SettingsUI';
import { useSettings } from '../../hooks/context/useSettings';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { FiatUnit, FiatUnitSource, FiatUnitType, getFiatRate } from '../../models/fiatUnit';

dayjs.extend(calendar);

const ALL_CURRENCIES = Object.values(FiatUnit);

/** The currency's symbol in a round badge. */
const SymbolBadge: React.FC<{ symbol: string; size?: number; selected?: boolean }> = ({ symbol, size = 40, selected }) => {
  const p = useSettingsPalette();
  const long = symbol.length > 2;
  return (
    <View
      style={[styles.badge, { width: size, height: size, borderRadius: size / 2, backgroundColor: selected ? p.accentSoft : p.ground }]}
    >
      <Text
        style={[styles.badgeText, { fontSize: long ? size * 0.3 : size * 0.42, color: selected ? p.accentText : p.ink }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {symbol}
      </Text>
    </View>
  );
};

const Currency: React.FC = () => {
  const navigation = useExtendedNavigation();
  const p = useSettingsPalette();
  const insets = useSafeAreaInsets();
  const { setPreferredFiatCurrencyStorage } = useSettings();
  const [saving, setSaving] = useState<FiatUnitType | undefined>();
  const [selected, setSelected] = useState<FiatUnitType>(FiatUnit.USD);
  const [rate, setRate] = useState<CurrencyRate>({ LastUpdated: null, Rate: null });
  const [search, setSearch] = useState('');

  const currencies = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return ALL_CURRENCIES;
    return ALL_CURRENCIES.filter(item => item.endPointKey.toLowerCase().includes(query) || item.country.toLowerCase().includes(query));
  }, [search]);

  const fetchCurrency = useCallback(async () => {
    try {
      const preferred = await getPreferredCurrency();
      if (preferred === null) throw Error();
      setSelected(preferred);
    } catch (_error) {
      setSelected(FiatUnit.USD);
    }
    setRate(await mostRecentFetchedRate());
  }, []);

  useEffect(() => {
    fetchCurrency();
  }, [fetchCurrency]);

  const choose = useCallback(
    async (item: FiatUnitType) => {
      if (saving || item.endPointKey === selected.endPointKey) return;
      Keyboard.dismiss();
      setSaving(item);
      try {
        await getFiatRate(item.endPointKey);
        await setPreferredCurrency(item);
        await initCurrencyDaemon(true);
        await fetchCurrency();
        setSelected(item);
        setPreferredFiatCurrencyStorage(FiatUnit[item.endPointKey]);
      } catch (error: any) {
        console.log(error);
        presentAlert({
          message: error.message ? `${loc.settings.currency_fetch_error}: ${error.message}` : loc.settings.currency_fetch_error,
        });
      } finally {
        setSaving(undefined);
      }
    },
    [saving, selected.endPointKey, fetchCurrency, setPreferredFiatCurrencyStorage],
  );

  const updated = rate.LastUpdated ? dayjs(rate.LastUpdated).calendar() : loc._.never;

  return (
    <View style={[styles.root, { backgroundColor: p.ground }]} testID="CurrencyScreen">
      <SettingsScreenHeader title={loc.settings.currency} onBack={() => navigation.goBack()} />
      <View style={styles.searchBox}>
        <SettingsSearchField value={search} onChangeText={setSearch} placeholder={loc.settings.currency_search} testID="CurrencySearch" />
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {search.length === 0 && (
          <SettingsCard style={styles.hero}>
            <View style={styles.heroHead}>
              <SymbolBadge symbol={selected.symbol} size={56} selected />
              <View style={styles.texts}>
                <Text style={[styles.heroTitle, { color: p.ink }]}>{selected.endPointKey}</Text>
                <Text style={[styles.subtitle, { color: p.mutedOnCard }]}>{selected.country}</Text>
              </View>
            </View>
            <View style={[styles.rateBox, { backgroundColor: p.ground }]}>
              <Text style={[styles.rate, { color: p.ink }]} testID="CurrencyRate">
                {String(loc.formatString(loc.settings.currency_rate_line, { rate: rate.Rate ?? '…' }))}
              </Text>
              <Text style={[styles.subtitle, { color: p.mutedOnCard }]}>
                {String(
                  loc.formatString(loc.settings.currency_source_line, {
                    source: selected.source ?? FiatUnitSource.CoinDesk,
                    when: updated,
                  }),
                )}
              </Text>
            </View>
          </SettingsCard>
        )}

        <SettingsCard>
          {currencies.map((item, i) => {
            const isSelected = item.endPointKey === selected.endPointKey;
            const isSaving = saving?.endPointKey === item.endPointKey;
            return (
              <Pressable
                key={`${item.endPointKey}-${item.locale}`}
                onPress={() => choose(item)}
                disabled={isSelected || !!saving}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={`${item.endPointKey} ${item.symbol} ${item.country}`}
                testID={`Currency-${item.endPointKey}`}
                style={({ pressed }) => [
                  styles.row,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: p.divider },
                  pressed && styles.pressed,
                ]}
              >
                <SymbolBadge symbol={item.symbol} selected={isSelected} />
                <View style={styles.texts}>
                  <Text style={[styles.title, { color: isSelected ? p.accentText : p.ink }]}>{item.endPointKey}</Text>
                  <Text style={[styles.subtitle, { color: p.mutedOnCard }]} numberOfLines={1}>
                    {item.country}
                  </Text>
                </View>
                {isSaving ? (
                  <ActivityIndicator color={p.accent} />
                ) : isSelected ? (
                  <Icon name="check" type="material" size={22} color={p.accentText} />
                ) : null}
              </Pressable>
            );
          })}
          {currencies.length === 0 && <Text style={[styles.empty, { color: p.mutedOnCard }]}>{loc.settings.search_empty}</Text>}
        </SettingsCard>
      </ScrollView>
    </View>
  );
};

export default Currency;

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchBox: { paddingHorizontal: 16, paddingBottom: 8 },
  content: { paddingHorizontal: 16, paddingTop: 8, rowGap: 16 },
  pressed: { opacity: 0.6 },
  hero: { paddingVertical: 16, rowGap: 14 },
  heroHead: { flexDirection: 'row', alignItems: 'center', columnGap: 14 },
  heroTitle: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  rateBox: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, rowGap: 4 },
  rate: { fontSize: 17, fontWeight: '600' },
  badge: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', columnGap: 12, minHeight: 60, paddingVertical: 8 },
  texts: { flex: 1, rowGap: 2 },
  title: { fontSize: 15, fontWeight: '600' },
  subtitle: { fontSize: 13, lineHeight: 18 },
  empty: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
});
