import React, { useEffect, useCallback, useState, useRef } from 'react';
import { Text, StyleSheet, View, TouchableOpacity, Animated } from 'react-native';

import { images, icons } from 'app/assets';
import { Image } from 'app/components';
import { Toast } from 'app/consts';
import { typography, palette } from 'app/styles';

const animationDuration = 500;

interface Props {
  toast: Toast;
  onClose: () => void;
}

export const CustomToast = ({ toast: { title, description, duration }, onClose }: Props) => {
  const [closedClicked, setClosedClicked] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fadeOut = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: animationDuration,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const fadeIn = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: animationDuration,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    fadeIn();

    setTimeout(() => {
      fadeOut();
    }, duration - animationDuration);
  }, [fadeAnim, fadeIn, duration, fadeOut]);

  const close = () => {
    if (closedClicked) {
      return;
    }
    setClosedClicked(true);
    fadeOut();
    setTimeout(() => {
      onClose();
    }, animationDuration);
  };

  return (
    <Animated.View style={[{ opacity: fadeAnim }, styles.container]}>
      <Image source={icons.warning} style={styles.warningIcon} />
      <View style={{ flex: 1, paddingLeft: 10 }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <TouchableOpacity onPress={close} style={styles.closeImageWrapper}>
        <Image source={images.closeInverted} style={styles.closeImage} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  closeImage: {
    height: 36,
    width: 36,
  },
  closeImageWrapper: {
    position: 'absolute',
    right: 5,
  },
  warningIcon: {
    width: 32,
    height: 32,
  },
  title: { ...typography.headline4, marginBottom: 4 },
  description: {
    ...typography.body,
    color: palette.textGrey,
    marginBottom: 15,
  },
  container: {
    position: 'relative',
    backgroundColor: palette.background,
    flex: 1,
    flexDirection: 'row',
    borderRadius: 13,
    marginHorizontal: 8,
    elevation: 5,
    padding: 10,
    marginBottom: 10,
    shadowColor: palette.textBlack,
    shadowOpacity: 0.12,
  },
});
