import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Header, InputItem } from 'components';
import { Button } from 'components/Button';
import { Image } from 'components/Image';
import { images } from 'assets';
import { useNavigationParam } from 'react-navigation-hooks';
import { NavigationScreenProps } from 'react-navigation';

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
      <Header
        leftItem={<Image style={styles.image} source={images.backArrow} />}
        onLeftItemPress={() => props.navigation.pop()}
        title={props.navigation.getParam('title')}
      />
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
  image: {
    width: 8,
    height: 13,
  },
});
