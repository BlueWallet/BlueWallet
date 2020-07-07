import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import React, { useState } from 'react';
import { View, StyleSheet, KeyboardType } from 'react-native';

import { Header, InputItem, Button, ScreenTemplate } from 'app/components';
import { RootStackParams, Route } from 'app/consts';

const i18n = require('../../loc');

interface Props {
  navigation: StackNavigationProp<RootStackParams, Route.EditText>;
  route: RouteProp<RootStackParams, Route.EditText>;
}

export const EditTextScreen = (props: Props) => {
  const { params } = props.route;
  const { label, header, onSave, title } = params;
  const keyboardType = params.keyboardType || 'default';
  const validate = params.validate || null;
  const [value, setValue] = useState(params.value || '');

  const handlePressOnSaveButton = () => {
    onSave(value);
    props.navigation.pop();
  };

  return (
    <ScreenTemplate
      footer={
        <Button
          title={i18n._.save}
          onPress={handlePressOnSaveButton}
          disabled={!value || (!!validate && !!validate(value))}
        />
      }
      header={<Header navigation={props.navigation} isBackArrow={true} title={title} />}
    >
      {header}
      <View style={styles.inputItemContainer}>
        <InputItem
          label={label}
          value={value}
          setValue={setValue}
          autoFocus={true}
          error={!!validate && validate(value)}
          keyboardType={keyboardType as KeyboardType}
        />
      </View>
    </ScreenTemplate>
  );
};

const styles = StyleSheet.create({
  inputItemContainer: {
    paddingTop: 20,
    width: '100%',
  },
});
