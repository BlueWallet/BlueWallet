import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, View, BackHandler, Text, ScrollView, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BlueSpacing20, SafeBlueArea, BlueNavigationStyle, BlueText, BlueButton } from '../../BlueComponents';
import Privacy from '../../Privacy';
const loc = require('../../loc');

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loading: {
    flex: 1,
    paddingTop: 20,
  },
  word: {
    width: 'auto',
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 8,
    paddingRight: 8,
    borderRadius: 4,
  },
  wortText: {
    color: '#81868E',
    fontWeight: 'bold',
  },
  scrollViewContent: {
    justifyContent: 'space-between',
  },
  please: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  successText: {
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#0C2550',
  },
  pleaseText: {
    paddingBottom: 10,
    paddingRight: 0,
    paddingLeft: 0,
    color: '#0C2550',
  },
  secret: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 14,
  },
  ok: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
});

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
        <View style={styles.word} key={`${secret}${index}`}>
          <Text style={styles.wortText}>
            {`${index + 1}`}. {secret}
          </Text>
        </View>,
      );
    }
    return component;
  };

  return isLoading ? (
    <View style={styles.loading}>
      <ActivityIndicator />
    </View>
  ) : (
    <SafeBlueArea style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scrollViewContent} testID="PleaseBackupScrollView">
        <View style={styles.please}>
          <BlueText style={styles.successText}>{loc.pleasebackup.success}</BlueText>
          <BlueText style={styles.pleaseText}>{loc.pleasebackup.text}</BlueText>

          <View style={styles.secret}>{renderSecret()}</View>

          <View style={styles.ok}>
            <View style={styles.flex}>
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
