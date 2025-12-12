import { RouteProp, useLocale, useRoute } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from '@rneui/themed';
import URL from 'url';
import { BlueCard, BlueText } from '../../BlueComponents';
import Lnurl from '../../class/lnurl';
import Button from '../../components/Button';
import SafeArea from '../../components/SafeArea';
import { useTheme } from '../../components/themes';
import selectWallet from '../../helpers/select-wallet';
import loc from '../../loc';
import { Chain } from '../../models/bitcoinUnits';
import { SuccessView } from '../send/success';
import { BlueSpacing20, BlueSpacing40 } from '../../components/BlueSpacing';
import { BlueLoading } from '../../components/BlueLoading';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import useWalletSubscribe from '../../hooks/useWalletSubscribe.tsx';
import assert from 'assert';
import { LightningArkWallet, LightningCustodianWallet } from '../../class';

const AuthState = {
  USER_PROMPT: 0,
  IN_PROGRESS: 1,
  SUCCESS: 2,
  ERROR: 3,
};

type LnurlAuthRouteParams = {
  walletID: string;
  lnurl: string;
};

const LnurlAuth = () => {
  const { name } = useRoute();
  const { direction } = useLocale();
  const { lnurl, walletID } = useRoute<RouteProp<{ params: LnurlAuthRouteParams }, 'params'>>().params;
  const wallet = useWalletSubscribe(walletID);
  const LN = useMemo(() => new Lnurl(lnurl), [lnurl]);
  const parsedLnurl = useMemo(
    () => (lnurl ? URL.parse(String(Lnurl.getUrlFromLnurl(lnurl)), true) : ({} as any)), // eslint-disable-line n/no-deprecated-api
    [lnurl],
  );
  const [authState, setAuthState] = useState(AuthState.USER_PROMPT);
  const [errMsg, setErrMsg] = useState('');
  const navigation = useExtendedNavigation();
  const { setParams } = useExtendedNavigation();
  const { colors } = useTheme();
  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.background,
    },
    walletWrapLabel: {
      color: colors.buttonAlternativeTextColor,
    },
  });

  const showSelectWalletScreen = useCallback(() => {
    selectWallet(navigation, name, Chain.OFFCHAIN).then(w => setParams({ walletID: w.getID() }));
  }, [navigation, name, setParams]);

  const authenticate = useCallback(() => {
    // @ts-ignore ffokc uf
    assert(wallet instanceof LightningCustodianWallet || wallet instanceof LightningArkWallet);
    wallet
      .authenticate(LN)
      .then(() => {
        setAuthState(AuthState.SUCCESS);
        setErrMsg('');
      })
      .catch((err: any) => {
        setAuthState(AuthState.ERROR);
        setErrMsg(err);
      });
  }, [wallet, LN]);

  if (!parsedLnurl || !wallet || authState === AuthState.IN_PROGRESS)
    return (
      <View style={[styles.root, stylesHook.root]}>
        <BlueLoading />
      </View>
    );

  const renderWalletSelectionButton = authState === AuthState.USER_PROMPT && (
    <View style={styles.walletSelectRoot}>
      {authState !== AuthState.IN_PROGRESS && (
        <TouchableOpacity accessibilityRole="button" style={styles.walletSelectTouch} onPress={showSelectWalletScreen}>
          <Text style={styles.walletSelectText}>{loc.wallets.select_wallet.toLowerCase()}</Text>
          <Icon name={direction === 'rtl' ? 'angle-left' : 'angle-right'} size={18} type="font-awesome" color="#9aa0aa" />
        </TouchableOpacity>
      )}
      <View style={styles.walletWrap}>
        <TouchableOpacity accessibilityRole="button" style={styles.walletWrapTouch} onPress={showSelectWalletScreen}>
          <Text style={[styles.walletWrapLabel, stylesHook.walletWrapLabel]}>{wallet.getLabel()}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeArea style={styles.root}>
      {authState === AuthState.USER_PROMPT && (
        <>
          <ScrollView>
            <BlueCard>
              {/* @ts-ignore this key exists */}
              <BlueText style={styles.alignSelfCenter}>{loc.lnurl_auth[`${parsedLnurl.query.action || 'auth'}_question_part_1`]}</BlueText>
              <BlueText style={styles.domainName}>{parsedLnurl.hostname}</BlueText>
              {/* @ts-ignore this key exists */}
              <BlueText style={styles.alignSelfCenter}>{loc.lnurl_auth[`${parsedLnurl.query.action || 'auth'}_question_part_2`]}</BlueText>
              <BlueSpacing40 />
              <Button title={loc.lnurl_auth.authenticate} onPress={authenticate} />
              <BlueSpacing40 />
            </BlueCard>
          </ScrollView>
          {renderWalletSelectionButton}
        </>
      )}

      {authState === AuthState.SUCCESS && (
        <>
          <SuccessView />
          <BlueSpacing20 />
          <BlueText style={styles.alignSelfCenter}>
            {/* @ts-ignore this key exists */}
            {loc.formatString(loc.lnurl_auth[`${parsedLnurl.query.action || 'auth'}_answer`], { hostname: parsedLnurl.hostname })}
          </BlueText>
          <BlueSpacing20 />
        </>
      )}

      {authState === AuthState.ERROR && (
        <BlueCard>
          <BlueSpacing20 />
          <BlueText style={styles.alignSelfCenter}>
            {loc.formatString(loc.lnurl_auth.could_not_auth, { hostname: parsedLnurl.hostname })}
          </BlueText>
          <BlueText style={styles.alignSelfCenter}>{errMsg}</BlueText>
          <BlueSpacing20 />
        </BlueCard>
      )}
    </SafeArea>
  );
};

export default LnurlAuth;

const styles = StyleSheet.create({
  alignSelfCenter: {
    alignSelf: 'center',
  },
  domainName: {
    alignSelf: 'center',
    fontWeight: 'bold',
    fontSize: 25,
    paddingVertical: 10,
  },
  root: {
    flex: 1,
    justifyContent: 'center',
  },
  walletSelectRoot: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  walletSelectTouch: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletSelectText: {
    color: '#9aa0aa',
    fontSize: 14,
    marginRight: 8,
  },
  walletWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  walletWrapTouch: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletWrapLabel: {
    fontSize: 14,
  },
});
