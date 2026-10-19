import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';

import ListItem from '../../components/ListItem';
import loc from '../../loc';
import { ReceiveDetailsStackParamList } from '../../navigation/ReceiveDetailsStackParamList';

const ReceiveMoreOptionsSheet = () => {
  const navigation = useNavigation<NativeStackNavigationProp<ReceiveDetailsStackParamList, 'ReceiveMoreOptions'>>();
  const route = useRoute<RouteProp<ReceiveDetailsStackParamList, 'ReceiveMoreOptions'>>();
  const { address, currentLabel, currentAmount, currentUnit, preferredUnit } = route.params;

  const navigateToCustomAmount = useCallback(() => {
    navigation.replace('ReceiveCustomAmount', { address, currentLabel, currentAmount, currentUnit, preferredUnit });
  }, [navigation, address, currentLabel, currentAmount, currentUnit, preferredUnit]);

  const navigateToAddressLabel = useCallback(() => {
    navigation.replace('ReceiveAddressLabel', { address });
  }, [navigation, address]);

  return (
    <SafeAreaView style={styles.root} edges={['bottom', 'left', 'right']}>
      <ListItem
        title={loc.receive.details_setAmount}
        subtitle={loc.receive.option_amount_subtitle}
        chevron
        onPress={navigateToCustomAmount}
        testID="ReceiveWithAmountOption"
      />
      <ListItem
        title={loc.receive.option_label}
        subtitle={loc.receive.option_label_subtitle}
        chevron
        bottomDivider={false}
        onPress={navigateToAddressLabel}
        testID="AddressLabelOption"
      />
    </SafeAreaView>
  );
};

export default ReceiveMoreOptionsSheet;

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
});
