import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { BlueLoading, SafeBlueArea, BlueCard, BlueText, BlueNavigationStyle, BlueSpacing20 } from '../../BlueComponents';
/** @type {AppStorage} */

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

const Licensing = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  return isLoading ? (
    <BlueLoading />
  ) : (
    <SafeBlueArea forceInset={{ horizontal: 'always' }} style={styles.root}>
      <ScrollView>
        <BlueCard>
          <BlueText>MIT License</BlueText>
          <BlueSpacing20 />
          <BlueText>Copyright (c) 2018-2020 BlueWallet Services</BlueText>
          <BlueSpacing20 />
          <BlueText>
            Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files
            (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify,
            merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
            furnished to do so, subject to the following conditions:
          </BlueText>
          <BlueSpacing20 />

          <BlueText>
            The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
          </BlueText>
          <BlueSpacing20 />

          <BlueText>
            THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
            OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
            LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR
            IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
          </BlueText>
        </BlueCard>
      </ScrollView>
    </SafeBlueArea>
  );
};

Licensing.navigationOptions = () => ({
  ...BlueNavigationStyle(),
  title: 'License',
});

export default Licensing;
