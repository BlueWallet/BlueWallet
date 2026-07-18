import React from 'react';
import { View } from 'react-native';
import { BlueSpacing20 } from '../../components/BlueSpacing';
import BlueText from '../../components/BlueText';
import { SettingsSection, SettingsScrollView, settingsCardContent } from '../../components/SettingsSection';

const Licensing = () => {
  return (
    <SettingsScrollView>
      <SettingsSection>
        <View style={settingsCardContent}>
          <BlueText>MIT License</BlueText>
          <BlueSpacing20 />
          <BlueText>Copyright (c) 2018-2024 BlueWallet developers</BlueText>
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
        </View>
      </SettingsSection>
    </SettingsScrollView>
  );
};

export default Licensing;
