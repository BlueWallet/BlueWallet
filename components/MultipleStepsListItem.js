import React from 'react';
import { useTheme } from '@react-navigation/native';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import PropTypes from 'prop-types';
import { Icon } from 'react-native-elements';
export const MultipleStepsListItemDashType = Object.freeze({ none: 0, top: 1, bottom: 2, topAndBottom: 3 });

const MultipleStepsListItem = props => {
  const { colors } = useTheme();
  const {
    showActivityIndicator = false,
    dashes = MultipleStepsListItemDashType.none,
    circledText = '',
    leftText = '',
    checked = false,
  } = props;
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

  const renderDashes = () => {
    switch (dashes) {
      case MultipleStepsListItemDashType.topAndBottom:
        return {
          width: 1,
          borderStyle: 'dashed',
          borderWidth: 0.8,
          borderColor: '#c4c4c4',
          top: 0,
          bottom: 0,
          marginLeft: 20,
          position: 'absolute',
        };
      case MultipleStepsListItemDashType.bottom:
        return {
          width: 1,
          borderStyle: 'dashed',
          borderWidth: 0.8,
          borderColor: '#c4c4c4',
          top: '50%',
          bottom: 0,
          marginLeft: 20,
          position: 'absolute',
        };
      case MultipleStepsListItemDashType.top:
        return {
          width: 1,
          borderStyle: 'dashed',
          borderWidth: 0.8,
          borderColor: '#c4c4c4',
          top: 0,
          bottom: '50%',
          marginLeft: 20,
          position: 'absolute',
        };
      default:
        return {};
    }
  };
  const buttonOpacity = { opacity: props.button?.disabled ? 0.5 : 1.0 };
  const rightButtonOpacity = { opacity: props.rightButton?.disabled ? 0.5 : 1.0 };
  return (
    <View>
      <View style={renderDashes()} />
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
          {!showActivityIndicator && leftText.length > 0 && (
            <View style={styles.vaultKeyTextWrapper}>
              <Text style={[styles.vaultKeyText, stylesHook.vaultKeyText]}>{leftText}</Text>
            </View>
          )}
          {showActivityIndicator && <ActivityIndicator style={styles.activityIndicator} />}
        </View>
        {!showActivityIndicator && props.button && (
          <>
            <TouchableOpacity
              disabled={props.button.disabled}
              style={[styles.provideKeyButton, stylesHook.provideKeyButton, buttonOpacity]}
              onPress={props.button.onPress}
            >
              <Text style={[styles.provideKeyButtonText, stylesHook.provideKeyButtonText]}>{props.button.text}</Text>
            </TouchableOpacity>
          </>
        )}
        {!showActivityIndicator && props.rightButton && checked && (
          <View style={styles.rightButtonContainer} accessibilityComponentType>
            <TouchableOpacity
              disabled={props.rightButton.disabled}
              style={[styles.rightButton, rightButtonOpacity]}
              onPress={props.rightButton.onPress}
            >
              <Text style={[styles.provideKeyButtonText, stylesHook.provideKeyButtonText]}>{props.rightButton.text}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

MultipleStepsListItem.propTypes = {
  circledText: PropTypes.string,
  checked: PropTypes.bool,
  leftText: PropTypes.string,
  showActivityIndicator: PropTypes.bool,
  dashes: PropTypes.number,
  button: PropTypes.shape({
    text: PropTypes.string,
    onPress: PropTypes.func,
    disabled: PropTypes.bool,
  }),
  rightButton: PropTypes.shape({
    text: PropTypes.string,
    onPress: PropTypes.func,
    disabled: PropTypes.bool,
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
  vaultKeyTextWrapper: { justifyContent: 'center', alignContent: 'flex-start', paddingLeft: 16 },
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
  activityIndicator: {
    marginLeft: 40,
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
