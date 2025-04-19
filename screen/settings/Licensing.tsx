import React from 'react';
import { Text, View } from 'react-native';
import { useSettingsStyles } from '../../hooks/useSettingsStyles';
import SafeAreaScrollView from '../../components/SafeAreaScrollView';
import { BlueSpacing20 } from '../../BlueComponents';

const Licensing = () => {
  const { styles } = useSettingsStyles();

  return (
    <SafeAreaScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.card}>
        <Text style={styles.infoText}>MIT License</Text>
        <BlueSpacing20 />
        <Text style={styles.infoText}>Copyright (c) 2018-2024 BlueWallet developers</Text>
        <BlueSpacing20 />
        <Text style={styles.infoText}>
          Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files
          (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify,
          merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
          furnished to do so, subject to the following conditions:
        </Text>
        <BlueSpacing20 />

        <Text style={styles.infoText}>
          The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
        </Text>
        <BlueSpacing20 />

        <Text style={styles.infoText}>
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
