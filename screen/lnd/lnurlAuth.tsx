import { useNavigation, RouteProp, useLocale, useRoute } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from '../../components/Icon';
import BlueCard from '../../components/BlueCard';
import BlueText from '../../components/BlueText';
import Lnurl, { LnurlAuthParams } from '../../class/lnurl';
import Button from '../../components/Button';
import SafeArea from '../../components/SafeArea';
import { useTheme } from '../../components/themes';
import selectWallet from '../../helpers/select-wallet';
import loc from '../../loc';
import { SuccessView } from '../send/success';
import { BlueSpacing20, BlueSpacing40 } from '../../components/BlueSpacing';
import { BlueLoading } from '../../components/BlueLoading';
import { useStorage } from '../../hooks/context/useStorage';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';

const AuthState = {
  USER_PROMPT: 0,
  IN_PROGRESS: 1,
  SUCCESS: 2,
  ERROR: 3,
};

const LnurlAuth = () => {
  const { name, params } = useRoute<RouteProp<DetailViewStackParamList, 'LnurlAuth'>>();
  const { lnurl, walletID } = params;
  const { direction } = useLocale();
  const { wallets } = useStorage();
  const LN = useMemo(() => new Lnurl(lnurl), [lnurl]);
  const [authParams, parseError] = useMemo<[LnurlAuthParams | undefined, string]>(() => {
    try {
      return [Lnurl.parseAuthUrl(lnurl), ''];
    } catch (e: any) {
      return [undefined, e.message];
    }
  }, [lnurl]);
  const authWallets = useMemo(() => wallets.filter(w => w.allowLnurlAuth()), [wallets]);
  // the wallet user came from goes first, so the service sees the same identity as before
  const wallet = authWallets.find(w => w.getID() === walletID) ?? authWallets[0];
  const [authState, setAuthState] = useState(AuthState.USER_PROMPT);
  const [errMsg, setErrMsg] = useState('');
  const navigation = useNavigation();
  const { setParams } = navigation;
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
    selectWallet(navigation, name, null, authWallets).then(w => setParams({ walletID: w.getID() }));
  }, [navigation, name, setParams, authWallets]);

  const authenticate = useCallback(async () => {
    if (!wallet || !authParams) return;
    setAuthState(AuthState.IN_PROGRESS);
    await new Promise(resolve => setTimeout(resolve, 100)); // sleep to propagate ui, key derivation blocks js thread
    try {
      await LN.authenticate(wallet.getLnurlAuthLinkingKey(authParams.domain));
      setAuthState(AuthState.SUCCESS);
      setErrMsg('');
    } catch (err: any) {
      setAuthState(AuthState.ERROR);
      setErrMsg(err instanceof Error ? err.message : String(err));
    }
  }, [wallet, authParams, LN]);

  if (!authParams) {
    return (
      <SafeArea style={styles.root}>
        <BlueCard>
          <BlueText style={styles.alignSelfCenter}>{loc.lnurl_auth.invalid_request}</BlueText>
          <BlueText style={styles.alignSelfCenter}>{parseError}</BlueText>
        </BlueCard>
      </SafeArea>
    );
  }

  if (!wallet) {
    return (
      <SafeArea style={styles.root}>
        <BlueCard>
          <BlueText style={styles.domainName}>{authParams.domain}</BlueText>
          <BlueText style={styles.alignSelfCenter}>{loc.lnurl_auth.no_wallet}</BlueText>
        </BlueCard>
      </SafeArea>
    );
  }

  if (authState === AuthState.IN_PROGRESS)
    return (
      <View style={[styles.root, stylesHook.root]}>
        <BlueLoading />
      </View>
    );

  const renderWalletSelectionButton = authState === AuthState.USER_PROMPT && (
    <View style={styles.walletSelectRoot}>
      <TouchableOpacity accessibilityRole="button" style={styles.walletSelectTouch} onPress={showSelectWalletScreen}>
        <Text style={styles.walletSelectText}>{loc.wallets.select_wallet.toLowerCase()}</Text>
        <Icon name={direction === 'rtl' ? 'angle-left' : 'angle-right'} size={18} type="font-awesome" color="#9aa0aa" />
      </TouchableOpacity>
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
              <BlueText style={styles.alignSelfCenter}>{loc.lnurl_auth[`${authParams.action}_question_part_1` as const]}</BlueText>
              <BlueText style={styles.domainName}>{authParams.domain}</BlueText>
              <BlueText style={styles.alignSelfCenter}>{loc.lnurl_auth[`${authParams.action}_question_part_2` as const]}</BlueText>
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
          <SuccessView>
            <BlueText style={styles.alignSelfCenter}>
              {loc.formatString(loc.lnurl_auth[`${authParams.action}_answer` as const], { hostname: authParams.domain })}
            </BlueText>
          </SuccessView>
        </>
      )}

      {authState === AuthState.ERROR && (
        <BlueCard>
          <BlueSpacing20 />
          <BlueText style={styles.alignSelfCenter}>
            {loc.formatString(loc.lnurl_auth.could_not_auth, { hostname: authParams.domain })}
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
