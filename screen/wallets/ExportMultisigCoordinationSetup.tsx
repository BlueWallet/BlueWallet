import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useMemo, useReducer, useRef } from 'react';
import { ActivityIndicator, InteractionManager, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BlueSpacing20, BlueText } from '../../BlueComponents';
import { TWallet } from '../../class/wallets/types';
import { DynamicQRCode } from '../../components/DynamicQRCode';
import SaveFileButton from '../../components/SaveFileButton';
import { SquareButton } from '../../components/SquareButton';
import { useTheme } from '../../components/themes';
import { disallowScreenshot } from 'react-native-screen-capture';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import { ExportMultisigCoordinationSetupStackRootParamList } from '../../navigation/ExportMultisigCoordinationSetupStack';
import { useSettings } from '../../hooks/context/useSettings';
import { isDesktop } from '../../blue_modules/environment';

const enum ActionType {
  SET_LOADING = 'SET_LOADING',
  SET_SHARE_BUTTON_TAPPED = 'SET_SHARE_BUTTON_TAPPED',
  SET_ERROR = 'SET_ERROR',
  SET_QR_CODE_CONTENTS = 'SET_QR_CODE_CONTENTS',
  SET_XPUB = 'SET_XPUB',
  SET_CLOSE_BUTTON_STATE = 'SET_CLOSE_BUTTON_STATE',
}

type State = {
  isLoading: boolean;
  isShareButtonTapped: boolean;
  qrCodeContents?: string;
  xpub?: string;
  error: string | null;
  closeButtonState: boolean;
};

type Action =
  | { type: ActionType.SET_LOADING; isLoading: boolean }
  | { type: ActionType.SET_SHARE_BUTTON_TAPPED; isShareButtonTapped: boolean }
  | { type: ActionType.SET_ERROR; error: string | null }
  | { type: ActionType.SET_QR_CODE_CONTENTS; qrCodeContents: string }
  | { type: ActionType.SET_XPUB; xpub: string }
  | { type: ActionType.SET_CLOSE_BUTTON_STATE; closeButtonState: boolean };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case ActionType.SET_LOADING:
      return { ...state, isLoading: action.isLoading };
    case ActionType.SET_SHARE_BUTTON_TAPPED:
      return { ...state, isShareButtonTapped: action.isShareButtonTapped };
    case ActionType.SET_ERROR:
      return { ...state, error: action.error, isLoading: false, closeButtonState: true };
    case ActionType.SET_QR_CODE_CONTENTS:
      return { ...state, qrCodeContents: action.qrCodeContents, isLoading: false, closeButtonState: true };
    case ActionType.SET_XPUB:
      return { ...state, xpub: action.xpub, isLoading: false };
    case ActionType.SET_CLOSE_BUTTON_STATE:
      return { ...state, closeButtonState: action.closeButtonState };
    default:
      return state;
  }
}

const initialState: State = {
  isLoading: true,
  isShareButtonTapped: false,
  qrCodeContents: undefined,
  xpub: undefined,
  error: null,
  closeButtonState: false,
};

const ExportMultisigCoordinationSetup: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { isLoading, isShareButtonTapped, qrCodeContents, xpub, closeButtonState } = state;
  const { params } = useRoute<RouteProp<ExportMultisigCoordinationSetupStackRootParamList, 'ExportMultisigCoordinationSetup'>>();
  const walletID = params.walletID;
  const { wallets } = useStorage();
  const { isPrivacyBlurEnabled } = useSettings();
  const wallet: TWallet | undefined = wallets.find(w => w.getID() === walletID);
  const dynamicQRCode = useRef<any>();
  const { colors } = useTheme();

  const navigation = useNavigation();
  const stylesHook = StyleSheet.create({
    scrollViewContent: {
      backgroundColor: colors.elevated,
    },
    type: { color: colors.foregroundColor },
    secret: { color: colors.foregroundColor },
    exportButton: {
      backgroundColor: colors.buttonDisabledBackgroundColor,
    },
  });

  const label = useMemo(() => wallet?.getLabel(), [wallet]);

  const setIsShareButtonTapped = (value: boolean) => {
    dispatch({ type: ActionType.SET_SHARE_BUTTON_TAPPED, isShareButtonTapped: value });
  };

  useFocusEffect(
    useCallback(() => {
      dispatch({ type: ActionType.SET_LOADING, isLoading: true });

      const task = InteractionManager.runAfterInteractions(() => {
        if (!isDesktop) disallowScreenshot(isPrivacyBlurEnabled);
        if (wallet) {
          setTimeout(async () => {
            try {
              const walletXpub = await wallet.getXpub();
              if (walletXpub) {
                const value = Buffer.from(walletXpub, 'ascii').toString('hex');
                dispatch({ type: ActionType.SET_XPUB, xpub: walletXpub });
                dispatch({ type: ActionType.SET_QR_CODE_CONTENTS, qrCodeContents: value });
              } else {
                dispatch({ type: ActionType.SET_ERROR, error: 'xpub not found' });
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
              dispatch({ type: ActionType.SET_ERROR, error: errorMessage });
            }
            dispatch({ type: ActionType.SET_CLOSE_BUTTON_STATE, closeButtonState: true });
          }, 0);
        } else {
          dispatch({ type: ActionType.SET_ERROR, error: 'Wallet not found' });
          dispatch({ type: ActionType.SET_CLOSE_BUTTON_STATE, closeButtonState: true });
        }
      });

      return () => {
        task.cancel();
        if (!isDesktop) disallowScreenshot(false);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [walletID]),
  );

  useFocusEffect(
    useCallback(() => {
      if (closeButtonState) {
        navigation.setOptions({ closeButtonState: 'Enabled' });
      }
    }, [closeButtonState, navigation]),
  );

  const exportTxtFileBeforeOnPress = async () => {
    setIsShareButtonTapped(true);
    dynamicQRCode.current?.stopAutoMove();
  };

  const exportTxtFileAfterOnPress = () => {
    setIsShareButtonTapped(false);
    dynamicQRCode.current?.startAutoMove();
  };

  const renderView = wallet ? (
    <>
      <View>
        <BlueText style={[styles.type, stylesHook.type]}>{label}</BlueText>
      </View>
      <BlueSpacing20 />
      {qrCodeContents && <DynamicQRCode value={qrCodeContents} ref={dynamicQRCode} />}
      <BlueSpacing20 />
      {isShareButtonTapped ? (
        <ActivityIndicator />
      ) : (
        label &&
        xpub && (
          <SaveFileButton
            style={[styles.exportButton, stylesHook.exportButton]}
            fileName={`${label}.txt`}
            fileContent={xpub}
            beforeOnPress={exportTxtFileBeforeOnPress}
            afterOnPress={exportTxtFileAfterOnPress}
          >
            <SquareButton title={loc.multisig.share} />
          </SaveFileButton>
        )
      )}

      <BlueSpacing20 />
      <Text selectable style={[styles.secret, stylesHook.secret]}>
        {xpub}
      </Text>
    </>
  ) : null;

  return (
    <ScrollView
      style={stylesHook.scrollViewContent}
      contentContainerStyle={[styles.scrollViewContent, stylesHook.scrollViewContent]}
      centerContent
      automaticallyAdjustContentInsets
      contentInsetAdjustmentBehavior="automatic"
    >
      {isLoading ? <ActivityIndicator /> : renderView}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollViewContent: {
    justifyContent: 'center',
    alignItems: 'center',
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
    justifyContent: 'center',
    paddingHorizontal: 16,
    width: '80%',
    maxWidth: 300,
  },
});

export default ExportMultisigCoordinationSetup;
