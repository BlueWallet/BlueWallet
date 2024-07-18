import React, { useEffect, useLayoutEffect, useRef, useReducer, useCallback, useMemo, useState } from 'react';
import { Platform, StyleSheet, View, TouchableOpacity, useColorScheme, SectionList, LayoutAnimation, SectionListData, Animated } from 'react-native';
// @ts-ignore: fix later
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { useTheme } from '../../components/themes';
import { WalletCarouselItem } from '../../components/WalletsCarousel';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import { Icon, ListItem, Button } from '@rneui/base';
import HeaderRightButton from '../../components/HeaderRightButton';
import { TWallet } from '../../class/wallets/types';
import { CloseButton, CloseButtonState } from '../../components/navigationStyle';

// Action Types
const SET_SEARCH_QUERY = 'SET_SEARCH_QUERY';
const SET_IS_SEARCH_FOCUSED = 'SET_IS_SEARCH_FOCUSED';
const SET_WALLET_DATA = 'SET_WALLET_DATA';
const TOGGLE_EDIT_MODE = 'TOGGLE_EDIT_MODE';

// Action Interfaces
interface SetSearchQueryAction {
  type: typeof SET_SEARCH_QUERY;
  payload: string;
}

interface SetIsSearchFocusedAction {
  type: typeof SET_IS_SEARCH_FOCUSED;
  payload: boolean;
}

interface SetWalletDataAction {
  type: typeof SET_WALLET_DATA;
  payload: TWallet[];
}

interface ToggleEditModeAction {
  type: typeof TOGGLE_EDIT_MODE;
}

type Action = SetSearchQueryAction | SetIsSearchFocusedAction | SetWalletDataAction | ToggleEditModeAction;

// State Interface
interface State {
  searchQuery: string;
  isSearchFocused: boolean;
  walletData: TWallet[];
  isEditing: boolean;
}

// Initial State
const initialState: State = {
  searchQuery: '',
  isSearchFocused: false,
  walletData: [],
  isEditing: false,
};

// Reducer
const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case SET_SEARCH_QUERY:
      return { ...state, searchQuery: action.payload };
    case SET_IS_SEARCH_FOCUSED:
      return { ...state, isSearchFocused: action.payload };
    case SET_WALLET_DATA:
      return { ...state, walletData: action.payload };
    case TOGGLE_EDIT_MODE:
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      return { ...state, isEditing: !state.isEditing };
    default:
      return state;
  }
};

const ManageWallets: React.FC = () => {
  const sortableList = useRef(null);
  const { colors } = useTheme();
  const { wallets, setWalletsWithNewOrder } = useStorage();
  const colorScheme = useColorScheme();
  const { navigate, setOptions, goBack } = useExtendedNavigation();
  const [state, dispatch] = useReducer(reducer, initialState);
  const [expandedSections, setExpandedSections] = useState<{ [key: number]: boolean }>({});
  const [dragging, setDragging] = useState(false);
  const scaleValue = useRef(new Animated.Value(1)).current;

  const stylesHook = {
    root: {
      backgroundColor: colors.elevated,
    },
    tip: {
      backgroundColor: colors.ballOutgoingExpired,
    },
  };

  const EditButton = useMemo(
    () => (
      <HeaderRightButton
        isTitleBold={state.isEditing}
        disabled={false}
        isTransparentBackground={!state.isEditing}
        title={state.isEditing ? loc.send.input_done : loc.wallets.edit}
        onPress={() => dispatch({ type: TOGGLE_EDIT_MODE })}
      />
    ),
    [state.isEditing],
  );

  const HeaderRight = useMemo(
    () => <CloseButton onPress={goBack} state={state.isEditing ? CloseButtonState.Disabled : CloseButtonState.Enabled} />,
    [goBack, state.isEditing],
  );

  useEffect(() => {
    dispatch({ type: SET_WALLET_DATA, payload: wallets });
  }, [wallets]);

  useEffect(() => {
    setOptions({
      statusBarStyle: Platform.select({ ios: 'light', default: colorScheme === 'dark' ? 'light' : 'dark' }),
      headerLeft: () => EditButton,
      headerRight: () => HeaderRight,
    });
  }, [EditButton, HeaderRight, colorScheme, setOptions, state.isEditing]);

  useEffect(() => {
    const filteredWallets = wallets.filter(wallet => wallet.getLabel().toLowerCase().includes(state.searchQuery.toLowerCase()));
    dispatch({ type: SET_WALLET_DATA, payload: filteredWallets });
  }, [wallets, state.searchQuery]);

  useLayoutEffect(() => {
    setOptions({
      headerSearchBarOptions: {
        hideWhenScrolling: false,
        onChangeText: (event: { nativeEvent: { text: string } }) => dispatch({ type: SET_SEARCH_QUERY, payload: event.nativeEvent.text }),
        onClear: () => dispatch({ type: SET_SEARCH_QUERY, payload: '' }),
        onFocus: () => dispatch({ type: SET_IS_SEARCH_FOCUSED, payload: true }),
        onBlur: () => dispatch({ type: SET_IS_SEARCH_FOCUSED, payload: false }),
        placeholder: loc.wallets.search_wallets,
      },
    });
  }, [setOptions]);

  const navigateToWallet = useCallback(
    (wallet: TWallet) => {
      const walletID = wallet.getID();
      goBack();
      navigate('WalletTransactions', {
        walletID,
        walletType: wallet.type,
      });
    },
    [goBack, navigate],
  );

  const toggleAccordion = (sectionIndex: number) => {
    setExpandedSections(prevState => ({
      ...prevState,
      [sectionIndex]: !prevState[sectionIndex],
    }));
  };

  const isDraggingDisabled = state.searchQuery.length > 0 || state.isSearchFocused || !state.isEditing;

  const WalletItemContent = ({ item, drag, isActive }: { item: TWallet; drag: () => void; isActive: boolean }) => {
    const animatedStyle = {
      transform: [{ scale: isActive ? 1 : scaleValue }, { scaleY: isActive ? 1 : scaleValue }],
    };

    useEffect(() => {
      Animated.timing(scaleValue, {
        toValue: dragging && !isActive ? 0.7 : 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, [dragging, isActive]);

    return (
      <Animated.View style={[styles.walletItemContainer, animatedStyle]}>
        <View style={styles.walletItem}>
          <WalletCarouselItem
            // @ts-ignore: fix later
            item={item}
            onPress={navigateToWallet}
            disabled={state.isEditing}
            allowOnPressAnimation={!state.isEditing}
          />
        </View>
        {!isDraggingDisabled && (
          <TouchableOpacity style={styles.walletItemContainer} delayLongPress={200} onLongPress={isDraggingDisabled ? undefined : drag}>
            <Icon name="grip-lines" size={24} type="font-awesome-5" color={colors.foregroundColor} style={styles.gripIcon} />
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  };

  const renderItem = useCallback(
    ({ item, drag, isActive }: { item: TWallet; drag: () => void; isActive: boolean }) => (
      <ScaleDecorator>
        {state.isEditing ? (
          <ListItem.Swipeable
            containerStyle={stylesHook.root}
            leftContent={(reset) => (
              <Button
                title="Info"
                onPress={() => reset()}
                icon={{ name: 'info', color: 'white' }}
                buttonStyle={{ minHeight: '100%' }}
              />
            )}
            rightContent={(reset) => (
              <Button
                title="Delete"
                onPress={() => reset()}
                icon={{ name: 'delete', color: 'white' }}
                buttonStyle={{ minHeight: '100%', backgroundColor: 'red' }}
              />
            )}
          >
            <ListItem.Content>
              <WalletItemContent item={item} drag={drag} isActive={isActive} />
            </ListItem.Content>
          </ListItem.Swipeable>
        ) : (
          <WalletItemContent item={item} drag={drag} isActive={isActive} />
        )}
      </ScaleDecorator>
    ),
    [state.isEditing, stylesHook.root, WalletItemContent],
  );

  const onChangeOrder = useCallback(() => {
    triggerHapticFeedback(HapticFeedbackTypes.ImpactMedium);
  }, []);

  const onDragBegin = useCallback(() => {
    setDragging(true);
    triggerHapticFeedback(HapticFeedbackTypes.Selection);
  }, []);

  const onRelease = useCallback(() => {
    setDragging(false);
    triggerHapticFeedback(HapticFeedbackTypes.ImpactLight);
  }, []);

  const onDragEnd = useCallback(
    ({ data }: { data: TWallet[] }) => {
      setDragging(false);
      setWalletsWithNewOrder(data);
      dispatch({ type: SET_WALLET_DATA, payload: data });
    },
    [setWalletsWithNewOrder],
  );

  const _keyExtractor = useCallback((item: TWallet, index: number) => index.toString(), []);

  const renderSectionHeader = useCallback(
    // eslint-disable-next-line react/no-unused-prop-types
    ({ section }: { section: SectionListData<TWallet> }) => {
      const sectionIndex = state.walletData.findIndex(wallet => wallet.getLabel() === section.data[0].getLabel());
      return (
        <ListItem.Accordion
          icon={<Icon name="chevron-down" size={24} type="font-awesome-5" color={colors.foregroundColor} style={styles.gripIcon} />}
          expandIcon={<Icon name="chevron-up" size={24} type="font-awesome-5" color={colors.foregroundColor} style={styles.gripIcon} />}
          content={
            <View style={styles.accordionContent}>
              <WalletCarouselItem
                // @ts-ignore: fix later
                item={section.data[0]}
                onPress={navigateToWallet}
              />
            </View>
          }
          containerStyle={stylesHook.root}
          isExpanded={expandedSections[sectionIndex]}
          onPress={() => toggleAccordion(sectionIndex)}
        >
          {section.data.map((wallet: TWallet, i: number) => (
            <ListItem key={i}>
              <ListItem.Content>
                <ListItem.Title>{wallet.getLabel()}</ListItem.Title>
                <ListItem.Subtitle>{wallet.getBalance()}</ListItem.Subtitle>
              </ListItem.Content>
              <ListItem.Chevron />
            </ListItem>
          ))}
        </ListItem.Accordion>
      );
    },
    [expandedSections, navigateToWallet, colors.foregroundColor, stylesHook.root, state.walletData],
  );

  return (
    <GestureHandlerRootView style={[styles.root, stylesHook.root]}>
      {state.isEditing ? (
        <DraggableFlatList
          ref={sortableList}
          contentInsetAdjustmentBehavior="automatic"
          automaticallyAdjustContentInsets
          data={state.walletData}
          keyExtractor={_keyExtractor}
          renderItem={renderItem}
          onChangeOrder={onChangeOrder}
          onDragBegin={onDragBegin}
          contentContainerStyle={styles.padding16}
          onRelease={onRelease}
          onDragEnd={onDragEnd}
        />
      ) : (
        <SectionList
          sections={state.walletData.map(wallet => ({ title: wallet.getLabel(), data: [wallet] }))}
          keyExtractor={_keyExtractor}
          automaticallyAdjustContentInsets
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.padding16}
          renderItem={() => null} // Render item inside accordion
          renderSectionHeader={renderSectionHeader}
        />
      )}
    </GestureHandlerRootView>
  );
};

export default ManageWallets;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  padding16: {
    paddingHorizontal: 8,
  },
  walletItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 80, // Initial height
  },
  walletItem: {
    flex: 1,
  },
  gripIcon: {
    marginLeft: 16,
  },
  accordionContent: {
    flex: 1,
  },
});
