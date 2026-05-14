import React, { useCallback, useContext, useEffect, useReducer, useRef, useMemo } from 'react';
import { useFocusEffect, useIsFocused, useRoute, RouteProp } from '@react-navigation/native';
import { Alert, Image, InteractionManager, StyleSheet, Text, useWindowDimensions, View, Switch } from 'react-native';
import { isDesktop } from '../../blue_modules/environment';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import DeeplinkSchemaMatch from '../../class/deeplink-schema-match';
import { ExtendedTransaction, TWallet } from '../../class/wallets/types';
import { FButton, FContainer, FloatButtonsBottomFade } from '../../components/FloatButtons';
import { useTheme } from '../../components/themes';
import { TransactionListItem } from '../../components/TransactionListItem';
import WalletsCarousel, { getWalletCarouselItemWidth } from '../../components/WalletsCarousel';
import { useSizeClass, SizeClass } from '../../blue_modules/sizeClass';
import loc from '../../loc';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ConnectionPollContext } from '../../navigation/ConnectionPollContext';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { useStorage } from '../../hooks/context/useStorage';
import { useSettings } from '../../hooks/context/useSettings';
import useMenuElements from '../../hooks/useMenuElements';
import SafeAreaSectionList from '../../components/SafeAreaSectionList';
import { scanQrHelper } from '../../helpers/scan-qr';
import { ModeContext } from '../../src/context/ModeContext';

const WalletsListSections = { CAROUSEL: 'CAROUSEL', TRANSACTIONS: 'TRANSACTIONS' };

const ELECTRUM_HEALTH_POLL_WHILE_WALLETS_LIST_FOCUSED_MS = 30_000;

type SectionData = {
  key: string;
  data: ExtendedTransaction[] | string[];
};

enum ActionTypes {
  SET_LOADING,
  SET_WALLETS,
  SET_CURRENT_INDEX,
  SET_REFRESH_FUNCTION,
}

interface SetLoadingAction { type: ActionTypes.SET_LOADING; payload: boolean; }
interface SetWalletsAction { type: ActionTypes.SET_WALLETS; payload: TWallet[]; }
interface SetCurrentIndexAction { type: ActionTypes.SET_CURRENT_INDEX; payload: number; }
interface SetRefreshFunctionAction { type: ActionTypes.SET_REFRESH_FUNCTION; payload: () => void; }

type WalletListAction = SetLoadingAction | SetWalletsAction | SetCurrentIndexAction | SetRefreshFunctionAction;

interface WalletListState {
  isLoading: boolean;
  wallets: TWallet[];
  currentWalletIndex: number;
  refreshFunction: () => void;
}

const initialState: WalletListState = {
  isLoading: false,
  wallets: [],
  currentWalletIndex: 0,
  refreshFunction: () => {},
};

function reducer(state: WalletListState, action: WalletListAction): WalletListState {
  switch (action.type) {
    case ActionTypes.SET_LOADING: return { ...state, isLoading: action.payload };
    case ActionTypes.SET_WALLETS: return { ...state, wallets: action.payload };
    case ActionTypes.SET_CURRENT_INDEX: return { ...state, currentWalletIndex: action.payload };
    case ActionTypes.SET_REFRESH_FUNCTION: return { ...state, refreshFunction: action.payload };
    default: return state;
  }
}

type NavigationProps = NativeStackNavigationProp<DetailViewStackParamList, 'WalletsList'>;
type RouteProps = RouteProp<DetailViewStackParamList, 'WalletsList'>;

const WalletsList: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { isLoading } = state;
  const { sizeClass, isLarge } = useSizeClass();
  const walletsCarousel = useRef<any>(null);
  const connectionPoll = useContext(ConnectionPollContext);
  const currentWalletIndex = useRef<number>(0);
  const { registerTransactionsHandler, unregisterTransactionsHandler } = useMenuElements();
  const { wallets, getTransactions, refreshAllWalletTransactions } = useStorage();
  const { isElectrumDisabled } = useSettings();
  const { width } = useWindowDimensions();
  const { colors, scanImage } = useTheme();
  const navigation = useExtendedNavigation<NavigationProps>();
  const isFocused = useIsFocused();
  const route = useRoute<RouteProps>();
  const dataSource = getTransactions(undefined, 10);
  const walletActionButtonsRef = useRef<View>(null);

  // === MODO SIMPLE / PRO ===
  const { toggleMode, isSimple } = useContext(ModeContext)!;

  const stylesHook = StyleSheet.create({
    listHeaderBack: { backgroundColor: colors.background, paddingTop: sizeClass === SizeClass.Large ? 8 : 0 },
    listHeaderText: { color: colors.foregroundColor },
  });

  const refreshWallets = useCallback(async (index?: number, showLoading = true) => {
    if (isElectrumDisabled) return;
    dispatch({ type: ActionTypes.SET_LOADING, payload: showLoading });
    try {
      await refreshAllWalletTransactions(index);
    } catch (e) {
      console.error(e);
    } finally {
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
    }
  }, [isElectrumDisabled, refreshAllWalletTransactions]);

  const refreshTransactions = useCallback(() => refreshWallets(), [refreshWallets]);

  // Toggle visible en la pantalla principal
  return (
    <>
      <View style={styles.modeToggle}>
        <Text style={styles.toggleLabel}>Simple</Text>
        <Switch
          value={!isSimple}
          onValueChange={toggleMode}
          trackColor={{ false: '#444', true: '#F7931A' }}
          thumbColor={isSimple ? '#888' : '#FFF'}
        />
        <Text style={styles.toggleLabel}>Pro</Text>
      </View>

      <SafeAreaSectionList
        renderItem={({ item, section }) => {
          if (section.key === WalletsListSections.CAROUSEL) {
            return (
              <WalletsCarousel
                data={wallets}
                onPress={(item) => navigation.navigate('WalletTransactions', { walletID: item.getID(), walletType: item.type })}
                handleLongPress={() => navigation.navigate('ManageWallets')}
                onMomentumScrollEnd={() => {}}
                horizontal
              />
            );
          }
          return <TransactionListItem item={item} itemPriceUnit={item.walletPreferredBalanceUnit} walletID={item.walletID} />;
        }}
        sections={[{ key: WalletsListSections.CAROUSEL, data: [{}] }, { key: WalletsListSections.TRANSACTIONS, data: dataSource }]}
        keyExtractor={(item, index) => String(index)}
        {...(isDesktop || isElectrumDisabled ? {} : { refreshing: isLoading, onRefresh: refreshTransactions })}
      />
    </>
  );
};

const styles = StyleSheet.create({
  modeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#1C1C1E',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  toggleLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    marginHorizontal: 12,
  },
});

export default WalletsList;