import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationScreenProps } from 'react-navigation';
import { useNavigationParam } from 'react-navigation-hooks';

import { Header, InputItem, Button, ScreenTemplate } from 'app/components';

type KeyboardType =
  | 'default'
  | 'email-address'
  | 'numeric'
  | 'phone-pad'
  | 'number-pad'
  | 'decimal-pad'
  | 'visible-password'
  | 'ascii-capable'
  | 'numbers-and-punctuation'
  | 'url'
  | 'name-phone-pad'
  | 'twitter'
  | 'web-search'
  | undefined;
export interface EditTextProps {
  title: string;
  onSave: (value: string) => void;
  label: string;
  value?: string;
  keyboardType?: KeyboardType;
}

export const EditTextScreen = (props: NavigationScreenProps) => {
  const label: string = useNavigationParam('label');
  const keyboardType: string = useNavigationParam('keyboardType') || 'default';
  const header: React.ReactNode = useNavigationParam('header');
  const onSave: (value: string) => void = useNavigationParam('onSave');
  const [value, setValue] = useState(useNavigationParam('value') || '');

  const handlePressOnSaveButton = () => {
    onSave(value);
    props.navigation.pop();
  };

  return (
    <ScreenTemplate footer={<Button title="Save" onPress={handlePressOnSaveButton} disabled={!value} />}>
      {header}
      <View style={styles.inputItemContainer}>
        <InputItem
          label={label}
          value={value}
          setValue={setValue}
          autoFocus={true}
          keyboardType={keyboardType as KeyboardType}
        />
      </View>
    </ScreenTemplate>
  );
};

EditTextScreen.navigationOptions = (props: NavigationScreenProps) => ({
  header: (
    <View>
      <Header navigation={props.navigation} isBackArrow={true} title={props.navigation.getParam('title')} />
    </View>
  ),
});

const styles = StyleSheet.create({
  inputItemContainer: {
    paddingTop: 20,
    width: '100%',
  },
});
