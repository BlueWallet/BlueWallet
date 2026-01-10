import React, { useMemo } from 'react';
import { Text, View, StyleSheet, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { BlueSpacing20 } from '../../components/BlueSpacing';
import { usePlatformStyles } from '../../theme/platformStyles';

const Licensing = () => {
  const { styles, colors, sizing } = usePlatformStyles();
  const insets = useSafeAreaInsets();

  // Calculate header height for Android with transparent header
  const headerHeight = useMemo(() => {
    if (Platform.OS === 'android' && insets.top > 0) {
      return 56 + (StatusBar.currentHeight || insets.top);
    }
    return 0;
  }, [insets.top]);

  const cardStyles = StyleSheet.create({
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: sizing.containerBorderRadius,
      padding: sizing.basePadding || 16,
      margin: sizing.baseMargin || 16,
    },
    infoText: {
      color: colors.textColor,
      fontSize: sizing.subtitleFontSize || 14,
      lineHeight: sizing.subtitleLineHeight || 20,
    },
  });

  return (
    <SafeAreaScrollView style={styles.container} contentContainerStyle={styles.contentContainer} headerHeight={headerHeight}>
      <View style={cardStyles.card}>
        <Text style={cardStyles.infoText}>MIT License</Text>
        <BlueSpacing20 />
        <Text style={cardStyles.infoText}>Copyright (c) 2018-2024 BlueWallet developers</Text>
        <BlueSpacing20 />
        <Text style={cardStyles.infoText}>
          Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files
          (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify,
          merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
          furnished to do so, subject to the following conditions:
        </Text>
        <BlueSpacing20 />

        <Text style={cardStyles.infoText}>
          The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
        </Text>
        <BlueSpacing20 />

        <Text style={cardStyles.infoText}>
          THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
          MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
          LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
          CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
        </Text>
      </View>
    </SafeAreaScrollView>
  );
};

export default Licensing;
