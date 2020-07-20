import React, { useReducer, useState } from 'react';
import PropTypes from 'prop-types';
import BN from 'bignumber.js';
import { Dimensions, View, ScrollView, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Icon } from 'react-native-elements';

import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import { BlueCurrentTheme } from '../../components/themes';
import { BlueSpacing20, SafeBlueArea, BlueNavigationStyle, BlueTabs } from '../../BlueComponents';
import loc from '../../loc';

const ENTROPY_LIMIT = 256;

const shiftLeft = (value, places) => value.multipliedBy(2 ** places);
const shiftRight = (value, places) => value.div(2 ** places).dp(0, BN.ROUND_DOWN);

const initialState = { entropy: BN(0), bits: 0, items: [] };
export const eReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'push': {
      let { value, bits } = action;
      if (value >= 2 ** bits) {
        throw new TypeError("Can't push value exceeding size in bits");
      }
      if (state.bits === ENTROPY_LIMIT) return state;
      if (state.bits + bits > ENTROPY_LIMIT) {
        value = shiftRight(BN(value), bits + state.bits - ENTROPY_LIMIT);
        bits = ENTROPY_LIMIT - state.bits;
      }
      const entropy = shiftLeft(state.entropy, bits).plus(value);
      const items = [...state.items, bits];
      return { entropy, bits: state.bits + bits, items };
    }
    case 'pop': {
      if (state.bits === 0) return state;
      const bits = state.items.pop();
      const entropy = shiftRight(state.entropy, bits);
      return { entropy, bits: state.bits - bits, items: [...state.items] };
    }
    default:
      return state;
  }
};

export const entropyToHex = ({ entropy, bits }) => {
  if (bits === 0) return '0x';
  const hex = entropy.toString(16);
  const hexSize = Math.floor((bits - 1) / 4) + 1;
  return '0x' + '0'.repeat(hexSize - hex.length) + hex;
};

export const getEntropy = (number, base) => {
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
export const convertToBuffer = ({ entropy, bits }) => {
  if (bits < 8) return Buffer.from([]);
  const bytes = Math.floor(bits / 8);

  // convert to byte array
  let arr = [];
  const ent = entropy.toString(16).split('').reverse();
  ent.forEach((v, index) => {
    if (index % 2 === 1) {
      arr[0] = v + arr[0];
    } else {
      arr.unshift(v);
    }
  });
  arr = arr.map(i => parseInt(i, 16));

  if (arr.length > bytes) {
    arr.shift();
  } else if (arr.length < bytes) {
    const zeros = [...Array(bytes - arr.length)].map(() => 0);
    arr = [...zeros, ...arr];
  }
  return Buffer.from(arr);
};

const Coin = ({ push }) => (
  <View style={styles.coinRoot}>
    <TouchableOpacity onPress={() => push(getEntropy(0, 2))} style={styles.coinBody}>
      <Image style={styles.coinImage} source={require('../../img/coin1.png')} />
    </TouchableOpacity>
    <TouchableOpacity onPress={() => push(getEntropy(1, 2))} style={styles.coinBody}>
      <Image style={styles.coinImage} source={require('../../img/coin2.png')} />
    </TouchableOpacity>
  </View>
);

Coin.propTypes = {
  push: PropTypes.func.isRequired,
};

const Dice = ({ push, sides }) => {
  const diceIcon = i => {
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

  return (
    <ScrollView contentContainerStyle={styles.diceContainer}>
      {[...Array(sides)].map((_, i) => (
        <TouchableOpacity key={i} onPress={() => push(getEntropy(i, sides))}>
          <View style={styles.diceRoot}>
            {sides === 6 ? (
              <Icon style={styles.diceIcon} name={diceIcon(i + 1)} size={70} color="grey" type="font-awesome-5" />
            ) : (
              <View style={styles.dice}>
                <Text style={styles.diceText}>{i + 1}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

Dice.propTypes = {
  sides: PropTypes.number.isRequired,
  push: PropTypes.func.isRequired,
};

const Buttons = ({ pop, save }) => (
  <View style={styles.buttonsRoot}>
    <TouchableOpacity onPress={pop}>
      <View style={styles.buttonsBody}>
        <View style={styles.buttonsRow}>
          <View style={styles.buttonsIcon}>
            <Icon name="undo" size={16} type="font-awesome" color={BlueCurrentTheme.colors.buttonAlternativeTextColor} />
          </View>
          <Text style={styles.buttonsLabel}>{loc.entropy.undo}</Text>
        </View>
      </View>
    </TouchableOpacity>
    <TouchableOpacity onPress={save}>
      <View style={styles.buttonsBody}>
        <View style={styles.buttonsRow}>
          <View style={styles.buttonsIcon}>
            <Icon name="arrow-down" size={16} type="font-awesome" color={BlueCurrentTheme.colors.buttonAlternativeTextColor} />
          </View>
          <Text style={[styles.buttonsLabel, styles.buttonsLabelRight]}>{loc.entropy.save}</Text>
        </View>
      </View>
    </TouchableOpacity>
  </View>
);

Buttons.propTypes = {
  pop: PropTypes.func.isRequired,
  save: PropTypes.func.isRequired,
};

const Entropy = () => {
  const [entropy, dispatch] = useReducer(eReducer, initialState);
  const { onGenerated } = useRoute().params;
  const navigation = useNavigation();
  const [tab, setTab] = useState(1);
  const [show, setShow] = useState(false);
  const { colors } = useTheme();

  const push = v => v && dispatch({ type: 'push', value: v.value, bits: v.bits });
  const pop = () => dispatch({ type: 'pop' });
  const save = () => {
    navigation.pop();
    const buf = convertToBuffer(entropy);
    onGenerated(buf);
  };

  const hex = entropyToHex(entropy);
  let bits = entropy.bits.toString();
  bits = ' '.repeat(bits.length < 3 ? 3 - bits.length : 0) + bits;

  return (
    <SafeBlueArea>
      <BlueSpacing20 />
      <TouchableOpacity onPress={() => setShow(!show)}>
        <View style={styles.entropy}>
          <Text style={styles.entropyText}>{show ? hex : `${bits} of 256 bits`}</Text>
        </View>
      </TouchableOpacity>

      <BlueTabs
        active={tab}
        onSwitch={setTab}
        tabs={[
          ({ active }) => (
            <Icon name="toll" type="material" color={active ? colors.buttonAlternativeTextColor : colors.buttonBackgroundColor} />
          ),
          ({ active }) => (
            <Icon name="dice" type="font-awesome-5" color={active ? colors.buttonAlternativeTextColor : colors.buttonBackgroundColor} />
          ),
          ({ active }) => (
            <Icon name="dice-d20" type="font-awesome-5" color={active ? colors.buttonAlternativeTextColor : colors.buttonBackgroundColor} />
          ),
        ]}
      />

      {tab === 0 && <Coin push={push} />}
      {tab === 1 && <Dice sides={6} push={push} />}
      {tab === 2 && <Dice sides={20} push={push} />}

      <Buttons pop={pop} save={save} />
    </SafeBlueArea>
  );
};

Entropy.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
};

Entropy.navigationOptions = () => ({
  ...BlueNavigationStyle(),
  title: loc.entropy.title,
});

const styles = StyleSheet.create({
  entropy: {
    padding: 5,
    marginLeft: 10,
    marginRight: 10,
    backgroundColor: BlueCurrentTheme.colors.inputBackgroundColor,
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
    color: BlueCurrentTheme.colors.foregroundColor,
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
    width: Dimensions.get('window').width / 4,
    aspectRatio: 1,
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
  diceText: {
    color: BlueCurrentTheme.colors.foregroundColor,
  },
  diceIcon: {
    margin: 3,
    justifyContent: 'center',
    alignItems: 'center',
    aspectRatio: 1,
    color: 'grey',
  },
  buttonsRoot: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: 'transparent',
    position: 'absolute',
    bottom: 30,
    borderRadius: 30,
    minHeight: 48,
    overflow: 'hidden',
  },
  buttonsBody: {
    flex: 1,
    minWidth: 130,
    backgroundColor: BlueCurrentTheme.colors.buttonBackgroundColor,
  },
  buttonsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonsIcon: {
    minWidth: 30,
    minHeight: 30,
    left: 5,
    backgroundColor: 'transparent',
    transform: [{ rotate: '-45deg' }],
    alignItems: 'center',
    marginBottom: -11,
  },
  buttonsLabel: {
    color: BlueCurrentTheme.colors.buttonAlternativeTextColor,
    fontWeight: '500',
    left: 5,
    backgroundColor: 'transparent',
    paddingRight: 20,
  },
  buttonsLabelRight: {
    paddingRight: 20,
  },
});

export default Entropy;
