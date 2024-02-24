import { DimensionValue, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-elements';
import React from 'react';
import { useTheme } from './themes';

interface LdkButtonProps {
  text: string;
  subtext: string;
  active: boolean;
  style: {
    width: DimensionValue;
    height: DimensionValue;
  };
  onPress: () => void;
}

export const LdkButton: React.FC<LdkButtonProps> = ({ text, subtext, active, style, onPress }) => {
  const { colors } = useTheme();
  const stylesHook = StyleSheet.create({
    container: {
      borderColor: (active && colors.lnborderColor) || colors.buttonDisabledBackgroundColor,
      backgroundColor: colors.buttonDisabledBackgroundColor,
      minWidth: style.width,
      minHeight: style.height,
      height: style.height,
    },
    text: {
      color: colors.lnborderColor,
    },
    subtext: {
      color: colors.alternativeTextColor,
    },
  });

  return (
    <TouchableOpacity accessibilityRole="button" onPress={onPress}>
      <View style={[stylesHook.container, styles.container]}>
        <View style={styles.contentContainer}>
          <View>
            <Image style={styles.image} source={require('../img/addWallet/lightning.png')} />
          </View>
          <View>
            <Text style={[stylesHook.text, styles.text]}>{text}</Text>
            <Text style={[stylesHook.subtext, styles.subtext]}>{subtext}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1.5,
    borderRadius: 8,
    flex: 1,
    marginBottom: 8,
  },
  contentContainer: {
    marginHorizontal: 16,
    marginVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  image: {
    width: 34,
    height: 34,
    marginRight: 8,
  },
  text: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  subtext: {
    fontSize: 13,
    fontWeight: '500',
  },
});
