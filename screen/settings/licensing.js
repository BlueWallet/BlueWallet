import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeBlueArea, BlueCard, BlueTextHooks, BlueNavigationStyle, BlueSpacing20, BlueLoadingHook } from '../../BlueComponents';
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
    <BlueLoadingHook />
  ) : (
    <SafeBlueArea forceInset={{ horizontal: 'always' }} style={styles.root}>
      <ScrollView>
        <BlueCard>
          <BlueTextHooks>MIT License</BlueTextHooks>
          <BlueSpacing20 />
          <BlueTextHooks>Copyright (c) 2018-2020 BlueWallet Services</BlueTextHooks>
          <BlueSpacing20 />
          <BlueTextHooks>
            Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files
            (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify,
            merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
            furnished to do so, subject to the following conditions:
          </BlueTextHooks>
          <BlueSpacing20 />

          <BlueTextHooks>
            The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
          </BlueTextHooks>
          <BlueSpacing20 />

          <BlueTextHooks>
            THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
            OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
            LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR
            IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
          </BlueTextHooks>
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
