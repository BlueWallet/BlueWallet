import React, { useEffect, useReducer, useState } from 'react';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Icon } from '@rneui/themed';
import BN from 'bignumber.js';
import {
  Alert,
  Dimensions,
  Image,
  PixelRatio,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import { BlueSpacing20 } from '../../BlueComponents';
import { randomBytes } from '../../class/rng';
import { FButton, FContainer } from '../../components/FloatButtons';
import SafeArea from '../../components/SafeArea';
import { Tabs } from '../../components/Tabs';
import { BlueCurrentTheme, useTheme } from '../../components/themes';
import loc from '../../loc';
import { AddWalletStackParamList } from '../../navigation/AddWalletStack';

type RouteProps = RouteProp<AddWalletStackParamList, 'ProvideEntropy'>;
type NavigationProp = NativeStackNavigationProp<AddWalletStackParamList, 'ProvideEntropy'>;

export enum EActionType {
  push = 'push',
  pop = 'pop',
  limit = 'limit',
  noop = 'noop',
}

type TEntropy = { value: number; bits: number };
type TState = { entropy: BN; bits: number; items: number[]; limit: number };
type TAction =
  | ({ type: EActionType.push } & TEntropy)
  | { type: EActionType.pop }
  | { type: EActionType.limit; limit: number }
  | { type: EActionType.noop };
type TPush = (v: TEntropy | null) => void;
type TPop = () => void;

const initialState: TState = {
  entropy: BN(0),
  bits: 0,
  items: [],
  limit: 256,
};

const shiftLeft = (value: BN, places: number) => value.multipliedBy(2 ** places);
const shiftRight = (value: BN, places: number) => value.div(2 ** places).dp(0, BN.ROUND_DOWN);

export const eReducer = (state: TState = initialState, action: TAction): TState => {
  switch (action.type) {
    case EActionType.noop:
      return state;

    case EActionType.push: {
      let value: number | BN = action.value;
      let bits: number = action.bits;

      if (value >= 2 ** bits) {
        throw new TypeError("Can't push value exceeding size in bits");
      }
      if (state.bits === state.limit) return state;
      if (state.bits + bits > state.limit) {
        value = shiftRight(BN(value), bits + state.bits - state.limit);
        bits = state.limit - state.bits;
      }
      const entropy = shiftLeft(state.entropy, bits).plus(value);
      const items = [...state.items, bits];
      return { ...state, entropy, bits: state.bits + bits, items };
    }

    case EActionType.pop: {
      if (state.bits === 0) return state;
      const bits = state.items.pop()!;
      const entropy = shiftRight(state.entropy, bits);
      return { ...state, entropy, bits: state.bits - bits, items: [...state.items] };
    }

    case EActionType.limit: {
      return { ...state, limit: action.limit };
    }

    default:
      return state;
  }
};

export const entropyToHex = ({ entropy, bits }: { entropy: BN; bits: number }): string => {
  if (bits === 0) return '0x';
  const hex = entropy.toString(16);
  const hexSize = Math.floor((bits - 1) / 4) + 1;
  return '0x' + '0'.repeat(hexSize - hex.length) + hex;
};

export const getEntropy = (number: number, base: number): TEntropy | null => {
  if (base === 1) return null;
  let maxPow = 1;
  while (2 ** (maxPow + 1) <= base) {
    maxPow += 1;
  }

  let bits = maxPow;
  let summ = 0;
  while (bits >= 1) {
    const block = 2 ** bits;
    if (summ + block > base) {
      bits -= 1;
      continue;
    }
    if (number < summ + block) {
      return { value: number - summ, bits };
    }
    summ += block;
    bits -= 1;
  }
  return null;
};

// cut entropy to bytes, convert to Buffer
export const convertToBuffer = ({ entropy, bits }: { entropy: BN; bits: number }): Buffer => {
  if (bits < 8) return Buffer.from([]);
  const bytes = Math.floor(bits / 8);

  // convert to byte array
  const arr: string[] = [];
  const ent = entropy.toString(16).split('').reverse();
  ent.forEach((v, index) => {
    if (index % 2 === 1) {
      arr[0] = v + arr[0];
    } else {
      arr.unshift(v);
    }
  });

  let arr2 = arr.map(i => parseInt(i, 16));

  if (arr.length > bytes) {
    arr2.shift();
  } else if (arr2.length < bytes) {
    const zeros = [...Array(bytes - arr2.length)].map(() => 0);
    arr2 = [...zeros, ...arr2];
  }
  return Buffer.from(arr2);
};

const Coin = ({ push }: { push: TPush }) => (
  <View style={styles.coinRoot}>
    <TouchableOpacity accessibilityRole="button" onPress={() => push(getEntropy(0, 2))} style={styles.coinBody}>
      <Image style={styles.coinImage} source={require('../../img/coin1.png')} />
    </TouchableOpacity>
    <TouchableOpacity accessibilityRole="button" onPress={() => push(getEntropy(1, 2))} style={styles.coinBody}>
      <Image style={styles.coinImage} source={require('../../img/coin2.png')} />
    </TouchableOpacity>
  </View>
);

const diceIcon = (i: number): string => {
  switch (i) {
    case 1:
      return 'dice-one';
    case 2:
      return 'dice-two';
    case 3:
      return 'dice-three';
    case 4:
      return 'dice-four';
    case 5:
      return 'dice-five';
    default:
      return 'dice-six';
  }
};

const Dice = ({ push, sides }: { push: TPush; sides: number }) => {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const diceWidth = width / 4;
  const stylesHook = StyleSheet.create({
    dice: {
      borderColor: colors.buttonBackgroundColor,
    },
    diceText: {
      color: colors.foregroundColor,
    },
    diceContainer: {
      backgroundColor: colors.elevated,
    },
  });

  return (
    <ScrollView contentContainerStyle={[styles.diceContainer, stylesHook.diceContainer]}>
      {[...Array(sides)].map((_, i) => (
        <TouchableOpacity accessibilityRole="button" key={i} onPress={() => push(getEntropy(i, sides))}>
          <View style={[styles.diceRoot, { width: diceWidth }]}>
            {sides === 6 ? (
              <Icon style={styles.diceIcon} name={diceIcon(i + 1)} size={70} color="grey" type="font-awesome-5" />
            ) : (
              <View style={[styles.dice, stylesHook.dice]}>
                <Text style={stylesHook.diceText}>{i + 1}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const buttonFontSize =
  PixelRatio.roundToNearestPixel(Dimensions.get('window').width / 26) > 22
    ? 22
    : PixelRatio.roundToNearestPixel(Dimensions.get('window').width / 26);

const Buttons = ({ pop, save, colors }: { pop: TPop; save: () => void; colors: any }) => (
  <FContainer>
    <FButton
      onPress={pop}
      text={loc.entropy.undo}
      icon={
        <View style={styles.buttonsIcon}>
          <Icon name="undo" size={buttonFontSize} type="font-awesome" color={colors.buttonAlternativeTextColor} />
        </View>
      }
    />
    <FButton
      onPress={save}
      text={loc.entropy.save}
      icon={
        <View style={styles.buttonsIcon}>
          <Icon name="arrow-down" size={buttonFontSize} type="font-awesome" color={colors.buttonAlternativeTextColor} />
        </View>
      }
    />
  </FContainer>
);

const TollTab = ({ active }: { active: boolean }) => {
  const { colors } = useTheme();
  return <Icon name="toll" type="material" color={active ? colors.buttonAlternativeTextColor : colors.buttonBackgroundColor} />;
};

const D6Tab = ({ active }: { active: boolean }) => {
  const { colors } = useTheme();
  return <Icon name="dice" type="font-awesome-5" color={active ? colors.buttonAlternativeTextColor : colors.buttonBackgroundColor} />;
};

const D20Tab = ({ active }: { active: boolean }) => {
  const { colors } = useTheme();
  return <Icon name="dice-d20" type="font-awesome-5" color={active ? colors.buttonAlternativeTextColor : colors.buttonBackgroundColor} />;
};

const ProvideEntropy = () => {
  const [entropy, dispatch] = useReducer(eReducer, initialState);
  const { words } = useRoute<RouteProps>().params;
  const navigation = useNavigation<NavigationProp>();
  const [tab, setTab] = useState(1);
  const [show, setShow] = useState(false);
  const { colors } = useTheme();
  const stylesHook = StyleSheet.create({
    entropy: {
      backgroundColor: colors.inputBackgroundColor,
    },
    entropyText: {
      color: colors.foregroundColor,
    },
  });

  useEffect(() => {
    dispatch({ type: EActionType.limit, limit: words === 24 ? 256 : 128 });
  }, [dispatch, words]);

  const handlePush: TPush = v => {
    if (v === null) {
      dispatch({ type: EActionType.noop });
    } else {
      dispatch({ type: EActionType.push, value: v.value, bits: v.bits });
    }
  };

  const handlePop: TPop = () => {
    dispatch({ type: EActionType.pop });
  };

  const handleSave = async () => {
    let buf = convertToBuffer(entropy);
    const bufLength = words === 24 ? 32 : 16;
    const remaining = bufLength - buf.length;

    let entropyTitle = '';
    if (buf.length < bufLength) {
      entropyTitle = loc.formatString(loc.wallets.add_entropy_remain, {
        gen: buf.length,
        rem: remaining,
      });
    } else {
      entropyTitle = loc.formatString(loc.wallets.add_entropy_generated, {
        gen: buf.length,
      });
    }

    Alert.alert(
      loc.wallets.add_entropy,
      entropyTitle,
      [
        {
          text: loc._.cancel,
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: loc._.ok,
          onPress: async () => {
            if (remaining > 0) {
              const random = await randomBytes(remaining);
              buf = Buffer.concat([buf, random], bufLength);
            }

            /* Convert Buffer to hex string before navigating as React Navigation
              does not support passing Buffer objects between screens
            */
            navigation.navigate('AddWallet', { entropy: buf.toString('hex'), words });
          },
          style: 'default',
        },
      ],
      { cancelable: true },
    );
  };

  const hex = entropyToHex(entropy);
  let bits = entropy.bits.toString();
  bits = ' '.repeat(bits.length < 3 ? 3 - bits.length : 0) + bits;

  return (
    <SafeArea>
      <BlueSpacing20 />
      <TouchableOpacity accessibilityRole="button" onPress={() => setShow(!show)}>
        <View style={[styles.entropy, stylesHook.entropy]}>
          <Text style={[styles.entropyText, stylesHook.entropyText]}>
            {show ? hex : loc.formatString(loc.entropy.amountOfEntropy, { bits, limit: entropy.limit })}
          </Text>
        </View>
      </TouchableOpacity>

      <Tabs active={tab} onSwitch={setTab} tabs={[TollTab, D6Tab, D20Tab]} />

      {tab === 0 && <Coin push={handlePush} />}
      {tab === 1 && <Dice sides={6} push={handlePush} />}
      {tab === 2 && <Dice sides={20} push={handlePush} />}

      <Buttons pop={handlePop} save={handleSave} colors={colors} />
    </SafeArea>
  );
};

const styles = StyleSheet.create({
  entropy: {
    padding: 5,
    marginLeft: 10,
    marginRight: 10,
    borderRadius: 9,
    minHeight: 49,
    paddingHorizontal: 8,
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
  },
  entropyText: {
    fontSize: 15,
    fontFamily: 'Courier',
  },
  coinRoot: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  coinBody: {
    flex: 0.33,
    justifyContent: 'center',
    alignItems: 'center',
    aspectRatio: 1,
    borderWidth: 1,
    borderRadius: 5,
    borderColor: BlueCurrentTheme.colors.lightButton,
    margin: 10,
    padding: 10,
    maxWidth: 100,
    maxHeight: 100,
  },
  coinImage: {
    aspectRatio: 1,
    width: '100%',
    height: '100%',
    borderRadius: 75,
  },
  diceContainer: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  diceRoot: {
    aspectRatio: 1,
    maxWidth: 100,
    maxHeight: 100,
  },
  dice: {
    margin: 3,
    borderWidth: 1,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    aspectRatio: 1,
    borderColor: BlueCurrentTheme.colors.buttonBackgroundColor,
  },
  diceIcon: {
    margin: 3,
    justifyContent: 'center',
    alignItems: 'center',
    aspectRatio: 1,
    color: 'grey',
  },
  buttonsIcon: {
    backgroundColor: 'transparent',
    transform: [{ rotate: '-45deg' }],
    alignItems: 'center',
  },
});

export default ProvideEntropy;
