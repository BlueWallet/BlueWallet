import React, { useState, useContext, useCallback, useMemo } from 'react';
import { I18nManager, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from 'react-native-elements';

import { BlueButton, BlueCard, BlueLoading, BlueSpacing20, BlueSpacing40, BlueText, SafeBlueArea } from '../../BlueComponents';

import navigationStyle from '../../components/navigationStyle';
import Lnurl from '../../class/lnurl';
import { Chain } from '../../models/bitcoinUnits';
import loc from '../../loc';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import selectWallet from '../../helpers/select-wallet';
import URL from 'url';
import { SuccessView } from '../send/success';
import { useTheme } from '../../components/themes';

const AuthState = {
  USER_PROMPT: 0,
  IN_PROGRESS: 1,
  SUCCESS: 2,
  ERROR: 3,
};

const LnurlAuth = () => {
  const { wallets } = useContext(BlueStorageContext);
  const { name } = useRoute();
  const { walletID, lnurl } = useRoute().params;
  const wallet = useMemo(() => wallets.find(w => w.getID() === walletID), [wallets, walletID]);
  const LN = useMemo(() => new Lnurl(lnurl), [lnurl]);
  const parsedLnurl = useMemo(
    () => (lnurl ? URL.parse(Lnurl.getUrlFromLnurl(lnurl), true) : {}), // eslint-disable-line n/no-deprecated-api
    [lnurl],
  );
  const [authState, setAuthState] = useState(AuthState.USER_PROMPT);
  const [errMsg, setErrMsg] = useState('');
  const { setParams, navigate } = useNavigation();
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
    selectWallet(navigate, name, Chain.OFFCHAIN).then(w => setParams({ walletID: w.getID() }));
  }, [navigate, name, setParams]);

  const authenticate = useCallback(() => {
    wallet
      .authenticate(LN)
      .then(() => {
        setAuthState(AuthState.SUCCESS);
        setErrMsg('');
      })
      .catch(err => {
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
          <Icon name={I18nManager.isRTL ? 'angle-left' : 'angle-right'} size={18} type="font-awesome" color="#9aa0aa" />
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
    <SafeBlueArea style={styles.root}>
      {authState === AuthState.USER_PROMPT && (
        <>
          <ScrollView>
            <BlueCard>
              <BlueText style={styles.alignSelfCenter}>{loc.lnurl_auth[`${parsedLnurl.query.action || 'auth'}_question_part_1`]}</BlueText>
              <BlueText style={styles.domainName}>{parsedLnurl.hostname}</BlueText>
              <BlueText style={styles.alignSelfCenter}>{loc.lnurl_auth[`${parsedLnurl.query.action || 'auth'}_question_part_2`]}</BlueText>
              <BlueSpacing40 />
              <BlueButton title={loc.lnurl_auth.authenticate} onPress={authenticate} />
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
    </SafeBlueArea>
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

LnurlAuth.navigationOptions = navigationStyle({
  title: '',
  closeButton: true,
  closeButtonFunc: ({ navigation }) => navigation.dangerouslyGetParent().popToTop(),
});
