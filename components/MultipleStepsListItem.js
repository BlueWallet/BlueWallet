import React from 'react';
import { useTheme } from '@react-navigation/native';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import PropTypes from 'prop-types';
import { Icon } from 'react-native-elements';

const MultipleStepsListItem = props => {
  const { colors } = useTheme();
  const { circledText = '', leftText = '', checked = false } = props;
  const stylesHook = StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.elevated,
    },
    textBtc: {
      color: colors.buttonAlternativeTextColor,
    },
    textDestinationFirstFour: {
      color: colors.buttonAlternativeTextColor,
    },
    textBtcUnitValue: {
      color: colors.buttonAlternativeTextColor,
    },
    textDestination: {
      color: colors.foregroundColor,
    },
    modalContentShort: {
      backgroundColor: colors.elevated,
    },
    modalContent: {
      backgroundColor: colors.elevated,
    },
    textFiat: {
      color: colors.alternativeTextColor,
    },
    provideKeyButton: {
      backgroundColor: colors.buttonDisabledBackgroundColor,
    },
    exportButton: {
      backgroundColor: colors.buttonDisabledBackgroundColor,
    },
    provideKeyButtonText: {
      color: colors.buttonTextColor,
    },
    vaultKeyCircle: {
      backgroundColor: colors.buttonDisabledBackgroundColor,
    },
    vaultKeyText: {
      color: colors.alternativeTextColor,
    },
    feeFiatText: {
      color: colors.alternativeTextColor,
    },
    vaultKeyCircleSuccess: {
      backgroundColor: colors.msSuccessBG,
    },
    vaultKeyTextSigned: {
      color: colors.msSuccessBG,
    },
  });
  return (
    <View style={styles.container}>
      <View style={styles.itemKeyUnprovidedWrapper}>
        {checked ? (
          <View style={[styles.vaultKeyCircleSuccess, stylesHook.vaultKeyCircleSuccess]}>
            <Icon size={24} name="check" type="ionicons" color={colors.msSuccessCheck} />
          </View>
        ) : circledText.length > 0 ? (
          <View style={styles.itemKeyUnprovidedWrapper}>
            <View style={[styles.vaultKeyCircle, stylesHook.vaultKeyCircle]}>
              <Text style={[styles.vaultKeyText, stylesHook.vaultKeyText]}>{circledText}</Text>
            </View>
          </View>
        ) : null}
        {leftText.length > 0 && (
          <View style={styles.vaultKeyTextWrapper}>
            <Text style={[styles.vaultKeyText, stylesHook.vaultKeyText]}>{leftText}</Text>
          </View>
        )}
      </View>

      {props.button && (
        <>
          <TouchableOpacity style={[styles.provideKeyButton, stylesHook.provideKeyButton]} onPress={props.button.onPress}>
            <Text style={[styles.provideKeyButtonText, stylesHook.provideKeyButtonText]}>{props.button.text}</Text>
          </TouchableOpacity>
        </>
      )}
      {props.rightButton && (
        <View style={styles.rightButtonContainer}>
          <TouchableOpacity style={styles.rightButton} onPress={props.rightButton.onPress}>
            <Text style={[styles.provideKeyButtonText, stylesHook.provideKeyButtonText]}>{props.rightButton.text}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

MultipleStepsListItem.propTypes = {
  circledText: PropTypes.string,
  checked: PropTypes.bool,
  leftText: PropTypes.string,
  button: PropTypes.shape({
    text: PropTypes.string,
    onPress: PropTypes.func,
  }),
  rightButton: PropTypes.shape({
    text: PropTypes.string,
    onPress: PropTypes.func,
  }),
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 16,
    flex: 1,
    justifyContent: 'space-between',
  },
  itemKeyUnprovidedWrapper: { flexDirection: 'row' },
  vaultKeyCircle: {
    width: 42,
    height: 42,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  vaultKeyText: { fontSize: 18, fontWeight: 'bold' },
  vaultKeyTextWrapper: { justifyContent: 'center', alignContent: 'center', paddingLeft: 16 },
  provideKeyButton: {
    marginLeft: 40,
    height: 48,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  rightButton: {
    height: 48,
    borderRadius: 8,
    right: 0,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  rightButtonContainer: {
    alignContent: 'flex-end',
  },
  grayButton: {
    marginTop: 24,
    marginLeft: 40,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  provideKeyButtonText: { fontWeight: '600', fontSize: 15 },
  vaultKeyCircleSuccess: {
    width: 42,
    height: 42,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vaultKeyTextSignedWrapper: { justifyContent: 'center', alignItems: 'center', paddingLeft: 16 },
  vaultKeyTextSigned: { fontSize: 18, fontWeight: 'bold' },
  exportButton: {
    height: 48,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});

export default MultipleStepsListItem;
