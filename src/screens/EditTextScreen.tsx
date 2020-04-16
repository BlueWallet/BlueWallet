import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationScreenProps } from 'react-navigation';
import { useNavigationParam } from 'react-navigation-hooks';

import { Header, InputItem, Button } from 'app/components';

export interface EditTextProps {
  title: string;
  onSave: (value: string) => void;
  label: string;
  value?: string;
}

export const EditTextScreen = (props: NavigationScreenProps) => {
  const label: string = useNavigationParam('label');
  const onSave: (value: string) => void = useNavigationParam('onSave');
  const [value, setValue] = useState(useNavigationParam('value') || '');

  const handlePressOnSaveButton = () => {
    onSave(value);
    props.navigation.pop();
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputItemContainer}>
        <InputItem label={label} value={value} setValue={setValue} autoFocus={true} />
      </View>
      <Button title="Save" onPress={handlePressOnSaveButton} containerStyle={styles.buttonContainer} />
    </View>
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
  buttonContainer: {
    justifyContent: 'flex-end',
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
  },
});
