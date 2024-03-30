import React, { useCallback, useContext, useReducer, useRef } from 'react';
import { ActivityIndicator, InteractionManager, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { BlueSpacing20, BlueText } from '../../BlueComponents';
import { DynamicQRCode } from '../../components/DynamicQRCode';
import loc from '../../loc';
import { SquareButton } from '../../components/SquareButton';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { useTheme } from '../../components/themes';
import SafeArea from '../../components/SafeArea';
import usePrivacy from '../../hooks/usePrivacy';
import { TWallet } from '../../class/wallets/types';
const fs = require('../../blue_modules/fs');

type RootStackParamList = {
  ExportMultisigCoordinationSetup: {
    walletID: string;
  };
};

const enum ActionType {
  SET_LOADING = 'SET_LOADING',
  SET_SHARE_BUTTON_TAPPED = 'SET_SHARE_BUTTON_TAPPED',
  SET_ERROR = 'SET_ERROR',
  SET_QR_CODE_CONTENTS = 'SET_QR_CODE_CONTENTS',
}

type State = {
  isLoading: boolean;
  isShareButtonTapped: boolean;
  qrCodeContents?: string;
  error: string | null;
};

type Action =
  | { type: ActionType.SET_LOADING; isLoading: boolean }
  | { type: ActionType.SET_SHARE_BUTTON_TAPPED; isShareButtonTapped: boolean }
  | { type: ActionType.SET_ERROR; error: string | null }
  | { type: ActionType.SET_QR_CODE_CONTENTS; qrCodeContents: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case ActionType.SET_LOADING:
      return { ...state, isLoading: action.isLoading };
    case ActionType.SET_SHARE_BUTTON_TAPPED:
      return { ...state, isShareButtonTapped: action.isShareButtonTapped };
    case ActionType.SET_ERROR:
      return { ...state, error: action.error, isLoading: false };
    case ActionType.SET_QR_CODE_CONTENTS:
      return { ...state, qrCodeContents: action.qrCodeContents, isLoading: false };
    default:
      return state;
  }
}

const initialState: State = {
  isLoading: true,
  isShareButtonTapped: false,
  qrCodeContents: undefined,
  error: null,
};

const ExportMultisigCoordinationSetup: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { isLoading, isShareButtonTapped, qrCodeContents } = state;
  const { params } = useRoute<RouteProp<RootStackParamList, 'ExportMultisigCoordinationSetup'>>();
  const walletID = params.walletID;
  const { wallets } = useContext(BlueStorageContext);
  const wallet: TWallet | undefined = wallets.find(w => w.getID() === walletID);
  const dynamicQRCode = useRef<any>();
  const { colors } = useTheme();
  const { enableBlur, disableBlur } = usePrivacy();
  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.elevated,
    },
    type: { color: colors.foregroundColor },
    secret: { color: colors.foregroundColor },
    exportButton: {
      backgroundColor: colors.buttonDisabledBackgroundColor,
    },
  });

  const exportTxtFile = async () => {
    setIsShareButtonTapped(true);
    dynamicQRCode.current?.stopAutoMove();
    setTimeout(() => {
      if (wallet) {
        fs.writeFileAndExport(wallet.getLabel() + '.txt', wallet.getXpub()).finally(() => {
          setIsShareButtonTapped(false);
          dynamicQRCode.current?.startAutoMove();
        });
      }
    }, 10);
  };

  const setIsShareButtonTapped = (value: boolean) => {
    dispatch({ type: ActionType.SET_SHARE_BUTTON_TAPPED, isShareButtonTapped: value });
  };

  useFocusEffect(
    useCallback(() => {
      enableBlur();
      dispatch({ type: ActionType.SET_LOADING, isLoading: true });

      const task = InteractionManager.runAfterInteractions(async () => {
        if (wallet) {
          try {
            const xpub = wallet.getXpub();
            if (typeof xpub === 'string') {
              const value = Buffer.from(xpub, 'ascii').toString('hex');
              dispatch({ type: ActionType.SET_QR_CODE_CONTENTS, qrCodeContents: value });
            } else {
              throw new Error('Expected getXpub() to return a string.');
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            dispatch({ type: ActionType.SET_ERROR, error: errorMessage });
          }
        } else {
          dispatch({ type: ActionType.SET_ERROR, error: 'Wallet not found' });
        }
      });

      return () => {
        task.cancel();
        disableBlur();
      };
    }, [disableBlur, enableBlur, wallet]),
  );

  const renderView = wallet ? (
    <>
      <View>
        <BlueText style={[styles.type, stylesHook.type]}>{wallet.getLabel()}</BlueText>
      </View>
      <BlueSpacing20 />
      {qrCodeContents && <DynamicQRCode value={qrCodeContents} ref={dynamicQRCode} />}
      <BlueSpacing20 />
      {isShareButtonTapped ? (
        <ActivityIndicator />
      ) : (
        <SquareButton style={[styles.exportButton, stylesHook.exportButton]} onPress={exportTxtFile} title={loc.multisig.share} />
      )}
      <BlueSpacing20 />
      <BlueText style={[styles.secret, stylesHook.secret]}>{wallet.getXpub()}</BlueText>
    </>
  ) : null;

  return (
    <SafeArea style={stylesHook.root}>
      <ScrollView contentContainerStyle={styles.scrollViewContent} centerContent={isLoading}>
        {isLoading ? <ActivityIndicator /> : renderView}
      </ScrollView>
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  scrollViewContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  type: {
    fontSize: 17,
    fontWeight: '700',
  },
  secret: {
    alignItems: 'center',
    paddingHorizontal: 16,
    fontSize: 16,
    lineHeight: 24,
  },
  exportButton: {
    height: 48,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    width: '80%',
    maxWidth: 300,
  },
});

export default ExportMultisigCoordinationSetup;
