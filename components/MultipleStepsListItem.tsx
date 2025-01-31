import React, { useRef } from 'react';
import {
  ActivityIndicator,
  findNodeHandle,
  GestureResponderEvent,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Icon } from '@rneui/themed';
import ActionSheet from '../screen/ActionSheet';
import { useTheme } from './themes';
import { ActionSheetOptions } from '../screen/ActionSheet.common';

export enum MultipleStepsListItemDashType {
  None = 0,
  Top = 1,
  Bottom = 2,
  TopAndBottom = 3,
}

export enum MultipleStepsListItemButtonType {
  Partial = 0,
  Full = 1,
}

interface MultipleStepsListItemProps {
  circledText?: string;
  checked?: boolean;
  leftText?: string;
  showActivityIndicator?: boolean;
  isActionSheet?: boolean;
  actionSheetOptions?: ActionSheetOptions;
  dashes?: MultipleStepsListItemDashType;
  button?: {
    text?: string;
    onPress?: (e: GestureResponderEvent | number) => void;
    disabled?: boolean;
    buttonType?: MultipleStepsListItemButtonType;
    leftText?: string;
    showActivityIndicator?: boolean;
    testID?: string;
  };
  rightButton?: {
    text?: string;
    onPress?: () => void;
    disabled?: boolean;
    showActivityIndicator?: boolean;
  };
}

const MultipleStepsListItem = (props: MultipleStepsListItemProps) => {
  const { colors } = useTheme();
  const {
    showActivityIndicator = false,
    dashes = MultipleStepsListItemDashType.None,
    circledText = '',
    leftText = '',
    checked = false,
    isActionSheet = false,
    actionSheetOptions = null, // Default to null or appropriate default
  } = props;
  const stylesHook = StyleSheet.create({
    provideKeyButton: {
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
    vaultKeyCircleSuccess: {
      backgroundColor: colors.msSuccessBG,
    },
    rowPartialLeftText: {
      color: colors.alternativeTextColor,
    },
  });
  const selfRef = useRef(null); // Create a ref for the component itself

  const handleOnPressForActionSheet = () => {
    if (isActionSheet && actionSheetOptions) {
      // Clone options to modify them
      let modifiedOptions = { ...actionSheetOptions };

      // Use 'selfRef' if the component uses its own ref, or 'ref' if it's using forwarded ref
      const anchor = findNodeHandle(selfRef.current);

      if (anchor) {
        // Attach the anchor only if it exists
        modifiedOptions = { ...modifiedOptions, anchor };
      }

      ActionSheet.showActionSheetWithOptions(modifiedOptions, buttonIndex => {
        // Call the original onPress function, if provided, and not cancelled
        if (buttonIndex !== -1 && props.button?.onPress) {
          props.button.onPress(buttonIndex);
        }
      });
    }
  };

  const renderDashes = (): StyleProp<ViewStyle> => {
    switch (dashes) {
      case MultipleStepsListItemDashType.TopAndBottom:
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
      case MultipleStepsListItemDashType.Bottom:
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
      case MultipleStepsListItemDashType.Top:
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
  const onPress = isActionSheet ? handleOnPressForActionSheet : props.button?.onPress;
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
            {props.button.buttonType === undefined ||
              (props.button.buttonType === MultipleStepsListItemButtonType.Full && (
                <TouchableOpacity
                  ref={isActionSheet ? selfRef : null}
                  testID={props.button.testID}
                  accessibilityRole="button"
                  disabled={props.button.disabled}
                  style={[styles.provideKeyButton, stylesHook.provideKeyButton, buttonOpacity]}
                  onPress={onPress}
                >
                  <Text style={[styles.provideKeyButtonText, stylesHook.provideKeyButtonText]}>{props.button.text}</Text>
                </TouchableOpacity>
              ))}
            {props.button.buttonType === MultipleStepsListItemButtonType.Partial && (
              <View style={styles.buttonPartialContainer}>
                <Text numberOfLines={1} style={[styles.rowPartialLeftText, stylesHook.rowPartialLeftText]} lineBreakMode="middle">
                  {props.button.leftText}
                </Text>
                <TouchableOpacity
                  testID={props.button.testID}
                  accessibilityRole="button"
                  disabled={props.button.disabled}
                  style={[styles.rowPartialRightButton, stylesHook.provideKeyButton, rightButtonOpacity]}
                  onPress={onPress}
                >
                  {props.button.showActivityIndicator ? (
                    <ActivityIndicator />
                  ) : (
                    <Text style={[styles.provideKeyButtonText, stylesHook.provideKeyButtonText, styles.rightButton]}>
                      {props.button.text}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
        {!showActivityIndicator && props.rightButton && checked && (
          <View style={styles.rightButtonContainer}>
            <TouchableOpacity
              accessibilityRole="button"
              disabled={props.rightButton.disabled}
              style={styles.rightButton}
              onPress={props.rightButton.onPress}
            >
              {props.rightButton.showActivityIndicator ? (
                <ActivityIndicator />
              ) : (
                <Text style={[styles.provideKeyButtonText, stylesHook.provideKeyButtonText]}>{props.rightButton.text}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 16,
    flex: 1,
    justifyContent: 'space-between',
  },
  buttonPartialContainer: {
    borderRadius: 8,
    borderColor: '#EEF0F4',
    borderWidth: 1,
    height: 48,
    flex: 1,
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 5,
    marginLeft: 40,
  },
  rowPartialRightButton: {
    height: 36,
    borderRadius: 8,
    alignSelf: 'flex-end',
    minWidth: 64,
    justifyContent: 'center',
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
    borderRadius: 8,
    textAlign: 'center',
  },
  rightButtonContainer: {
    alignContent: 'center',
    justifyContent: 'center',
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
  rowPartialLeftText: {
    textAlign: 'center',
  },
});

export default MultipleStepsListItem;
