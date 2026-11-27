/**
 * About, in the settings style: who makes the wallet and which version this
 * is, where to find the project, the app's own pages (release notes, license,
 * tests) and, last, what support may ask for (build, package, unique ID).
 */
import Clipboard from '@react-native-clipboard/clipboard';
import React, { useCallback, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getBuildNumber, getBundleId, getUniqueIdSync, getVersion } from 'react-native-device-info';
import BrandIcon from '@react-native-vector-icons/fontawesome6';
import dayjs from 'dayjs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import A from '../../blue_modules/analytics';
import { NeuraiHDWallet } from '../../class/wallets/neurai-hd-wallet';
import presentAlert, { AlertType } from '../../components/Alert';
import Icon from '../../components/Icon';
import {
  SettingsCard,
  SettingsIconCircle,
  SettingsRow,
  SettingsScreenHeader,
  SettingsSectionLabel,
  useSettingsPalette,
} from '../../components/settings/SettingsUI';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { appAlert } from '../../components/AppDialog';

const branch = require('../../current-branch.json');

type BrandName = 'globe' | 'x-twitter' | 'telegram' | 'github';

interface Link {
  key: string;
  icon: BrandName;
  title: string;
  value: string;
  url: string;
}

const LINKS: Link[] = [
  { key: 'website', icon: 'globe', title: loc.settings.about_sm_website, value: 'neurai.org', url: 'https://neurai.org' },
  { key: 'x', icon: 'x-twitter', title: 'X', value: '@neuraiproject', url: 'https://x.com/neuraiproject' },
  { key: 'telegram', icon: 'telegram', title: loc.settings.about_sm_telegram, value: '@neuraiproject', url: 'https://t.me/neuraiproject' },
  {
    key: 'github',
    icon: 'github',
    title: loc.settings.about_sm_github,
    value: 'NeuraiWallet',
    url: 'https://github.com/neuraiproject/NeuraiWallet',
  },
];

/** A row that opens the project somewhere else: its brand icon, a name, a handle. */
const LinkRow: React.FC<{ link: Link; divider: boolean }> = ({ link, divider }) => {
  const p = useSettingsPalette();
  return (
    <Pressable
      onPress={() => Linking.openURL(link.url)}
      accessibilityRole="link"
      accessibilityLabel={`${link.title}, ${link.value}`}
      testID={`AboutLink-${link.key}`}
      style={({ pressed }) => [
        styles.row,
        divider && { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: p.divider },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.circle, { backgroundColor: p.accentSoft }]}>
        {link.icon === 'globe' ? (
          <BrandIcon name="globe" size={18} color={p.accentText} iconStyle="solid" />
        ) : (
          <BrandIcon name={link.icon} size={18} color={p.accentText} iconStyle="brand" />
        )}
      </View>
      <Text style={[styles.title, styles.texts, { color: p.ink }]}>{link.title}</Text>
      <Text style={[styles.value, { color: p.mutedOnCard }]} numberOfLines={1}>
        {link.value}
      </Text>
      <Icon name="open-in-new" type="material" size={18} color={p.mutedOnCard} />
    </Pressable>
  );
};

/** A label and a value of the device card. */
const InfoLine: React.FC<{ label: string; value: string; divider?: boolean; children?: React.ReactNode }> = ({
  label,
  value,
  divider,
  children,
}) => {
  const p = useSettingsPalette();
  return (
    <View style={[styles.info, divider && { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: p.divider }]}>
      <View style={styles.texts}>
        <Text style={[styles.infoLabel, { color: p.mutedOnCard }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: p.ink }]} selectable>
          {value}
        </Text>
      </View>
      {children}
    </View>
  );
};

const About: React.FC = () => {
  const navigation = useExtendedNavigation();
  const p = useSettingsPalette();
  const insets = useSafeAreaInsets();
  const [testing, setTesting] = useState(false);

  const runPerformanceTest = useCallback(async () => {
    setTesting(true);
    try {
      const secret = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const w = NeuraiHDWallet.forNetwork('testnet', secret);
      // Force engine init + first derivation, then time additional receive lookups
      await w.getReceiveAddressAsync();
      const start = Date.now();
      let num = 0;
      while (Date.now() - start < 10 * 1000) {
        await w.getReceiveAddressAsync();
        num++;
      }
      appAlert(String(loc.formatString(loc.settings.performance_score, { num })));
    } finally {
      setTesting(false);
    }
  }, []);

  const uniqueId = getUniqueIdSync();
  const copyUniqueId = useCallback(() => {
    A.logError('copied unique id');
    Clipboard.setString('userId:' + uniqueId);
    presentAlert({ message: loc._.clipboard, type: AlertType.Toast });
  }, [uniqueId]);

  const build = getBuildNumber();
  // The build number is the build time on release builds; anything else is not a date.
  const builtAt = Number(build) > 1e9 ? dayjs(Number(build) * 1000).format('D MMM YYYY, HH:mm') : undefined;

  return (
    <View style={[styles.root, { backgroundColor: p.ground }]} testID="AboutScrollView">
      <SettingsScreenHeader title={loc.settings.about} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <SettingsCard style={styles.hero}>
          <Image style={styles.logo} source={require('../../img/addWallet/neurai.png')} accessibilityIgnoresInvertColors />
          <Text style={[styles.brand, { color: p.ink }]}>
            <Text style={{ color: p.accentText }}>Neurai</Text> Wallet
          </Text>
          <Text style={[styles.version, { color: p.mutedOnCard }]}>
            {String(loc.formatString(loc.settings.settings_version, { version: getVersion() }))}
          </Text>
          <Text style={[styles.tagline, { color: p.ink }]}>{loc.settings.about_free}</Text>
        </SettingsCard>

        <SettingsCard>
          <View style={styles.row}>
            <SettingsIconCircle icon="shield" />
            <Text style={[styles.title, styles.texts, { color: p.ink }]}>{loc.settings.about_backup}</Text>
          </View>
        </SettingsCard>

        <View>
          <SettingsSectionLabel>{loc.settings.about_community}</SettingsSectionLabel>
          <SettingsCard>
            {LINKS.map((link, i) => (
              <LinkRow key={link.key} link={link} divider={i > 0} />
            ))}
          </SettingsCard>
        </View>

        <View>
          <SettingsSectionLabel>{loc.settings.about_app}</SettingsSectionLabel>
          <SettingsCard>
            <SettingsRow icon="new-releases" title={loc.settings.about_release_notes} onPress={() => navigation.navigate('ReleaseNotes')} />
            <SettingsRow divider icon="gavel" title={loc.settings.about_license} onPress={() => navigation.navigate('Licensing')} />
            <SettingsRow
              divider
              icon="fact-check"
              title={loc.settings.about_selftest}
              onPress={() => navigation.navigate('SelfTest')}
              testID="RunSelfTestButton"
            />
            <SettingsRow
              divider
              icon="speed"
              title={loc.settings.run_performance_test}
              value={testing ? loc.settings.about_testing : undefined}
              onPress={runPerformanceTest}
              disabled={testing}
              testID="RunPerformanceTest"
            />
          </SettingsCard>
          <Text style={[styles.note, { color: p.muted }]}>{loc.settings.about_built_with}</Text>
        </View>

        <View>
          <SettingsSectionLabel>{loc.settings.about_device}</SettingsSectionLabel>
          <SettingsCard>
            <InfoLine label={loc.settings.about_version_label} value={`${getVersion()} (build ${build} · ${branch})`} />
            {builtAt && <InfoLine divider label={loc.settings.about_built} value={builtAt} />}
            <InfoLine divider label={loc.settings.about_bundle} value={getBundleId()} />
            <InfoLine divider label={loc.settings.about_unique_id} value={uniqueId}>
              <Pressable
                onPress={copyUniqueId}
                accessibilityRole="button"
                accessibilityLabel={loc.transactions.details_copy}
                hitSlop={6}
                style={({ pressed }) => [styles.copy, { backgroundColor: p.ground }, pressed && styles.pressed]}
              >
                <Icon name="content-copy" type="material" size={18} color={p.ink} />
              </Pressable>
            </InfoLine>
          </SettingsCard>
        </View>
      </ScrollView>
    </View>
  );
};

export default About;

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, rowGap: 20 },
  pressed: { opacity: 0.6 },
  hero: { alignItems: 'center', paddingVertical: 24, rowGap: 6 },
  logo: { width: 72, height: 72, resizeMode: 'contain', marginBottom: 6 },
  brand: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  version: { fontSize: 13 },
  tagline: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 6, paddingHorizontal: 8 },
  row: { flexDirection: 'row', alignItems: 'center', columnGap: 12, minHeight: 64, paddingVertical: 10 },
  circle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, rowGap: 2 },
  title: { fontSize: 15, fontWeight: '600' },
  value: { fontSize: 14, maxWidth: 150 },
  note: { fontSize: 12, lineHeight: 17, marginHorizontal: 4, marginTop: 8 },
  info: { flexDirection: 'row', alignItems: 'center', columnGap: 12, paddingVertical: 12 },
  infoLabel: { fontSize: 12 },
  infoValue: { fontSize: 14, fontFamily: 'monospace' },
  copy: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
