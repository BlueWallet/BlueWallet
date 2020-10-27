import React, { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, View, BackHandler, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
import { BlueSpacing20, SafeBlueArea, BlueNavigationStyle, BlueText, BlueButton } from '../../BlueComponents';
import Privacy from '../../Privacy';
import loc from '../../loc';
import SquareEnumeratedWords from '../../components/SquareEnumeratedWords';

const PleaseBackup = () => {
  const [isLoading, setIsLoading] = useState(true);
  const route = useRoute();
  const words = route.params.secret.split(' ');
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: colors.elevated,
    },
    loading: {
      flex: 1,
      paddingTop: 20,
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
      color: colors.foregroundColor,
    },
    pleaseText: {
      paddingBottom: 10,
      paddingRight: 0,
      paddingLeft: 0,
      color: colors.foregroundColor,
    },
  });

  const handleBackButton = useCallback(() => {
    navigation.dangerouslyGetParent().pop();
    return true;
  }, [navigation]);

  useEffect(() => {
    Privacy.enableBlur();
    setIsLoading(false);
    BackHandler.addEventListener('hardwareBackPress', handleBackButton);
    return () => {
      Privacy.disableBlur();
      BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
    };
  }, [handleBackButton, words]);

  return isLoading ? (
    <View style={styles.loading}>
      <ActivityIndicator />
    </View>
  ) : (
    <SafeBlueArea style={styles.flex}>
      <StatusBar barStyle="default" />
      <ScrollView contentContainerStyle={styles.scrollViewContent} testID="PleaseBackupScrollView">
        <View style={styles.please}>
          <BlueText style={styles.successText}>{loc.pleasebackup.success}</BlueText>
          <BlueText style={styles.pleaseText}>{loc.pleasebackup.text}</BlueText>
          <SquareEnumeratedWords entries={words} />

          <BlueSpacing20 />
          <BlueButton testID="PleasebackupOk" onPress={handleBackButton} title={loc.pleasebackup.ok} />
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
  gestureEnabled: false,
  swipeEnabled: false,
});

export default PleaseBackup;
