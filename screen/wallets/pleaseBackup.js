import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, View, BackHandler, Text, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BlueSpacing20, SafeBlueArea, BlueNavigationStyle, BlueText, BlueButton } from '../../BlueComponents';
import Privacy from '../../Privacy';
const loc = require('../../loc');

const PleaseBackup = () => {
  const [isLoading, setIsLoading] = useState(true);
  const route = useRoute();
  const words = route.params.secret.split(' ');
  const navigation = useNavigation();

  const handleBackButton = useCallback(() => {
    navigation.dangerouslyGetParent().pop();
    return true;
  }, [navigation]);

  useEffect(() => {
    Privacy.enableBlur();
    setIsLoading(false);
    return () => {
      Privacy.disableBlur();
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, [handleBackButton, words]);

  const renderSecret = () => {
    let component = [];
    for (const [index, secret] of words.entries()) {
      component.push(
        <View
          style={{
            width: 'auto',
            marginRight: 8,
            marginBottom: 8,
            backgroundColor: '#f5f5f5',
            paddingTop: 6,
            paddingBottom: 6,
            paddingLeft: 8,
            paddingRight: 8,
            borderRadius: 4,
          }}
          key={`${secret}${index}`}
        >
          <Text style={{ color: '#81868E', fontWeight: 'bold' }}>
            {`${index + 1}`}. {secret}
          </Text>
        </View>,
      );
    }
    return component;
  };

  return isLoading ? (
    <View style={{ flex: 1, paddingTop: 20 }}>
      <ActivityIndicator />
    </View>
  ) : (
    <SafeBlueArea style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ justifyContent: 'space-between' }} testID="PleaseBackupScrollView">
        <View style={{ alignItems: 'center', paddingHorizontal: 16 }}>
          <BlueText style={{ textAlign: 'center', fontWeight: 'bold', color: '#0C2550' }}>{loc.pleasebackup.success}</BlueText>
          <BlueText style={{ paddingBottom: 10, paddingRight: 0, paddingLeft: 0, color: '#0C2550' }}>{loc.pleasebackup.text}</BlueText>

          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginTop: 14,
            }}
          >
            {renderSecret()}
          </View>

          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
            <View style={{ flex: 1 }}>
              <BlueSpacing20 />
              <BlueButton testID="PleasebackupOk" onPress={handleBackButton} title={loc.pleasebackup.ok} />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeBlueArea>
  );
};

PleaseBackup.navigationOptions = ({ navigation }) => ({
  ...BlueNavigationStyle(navigation, true),
  title: loc.pleasebackup.title,
  headerLeft: null,
  headerRight: null,
});

export default PleaseBackup;
