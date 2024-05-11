import React, { useContext, useEffect, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import loc from '../../loc';
import CopyTextToClipboard from '../../components/CopyTextToClipboard';
import { AbstractHDElectrumWallet } from '../../class/wallets/abstract-hd-electrum-wallet';
import { PaymentCodeStackParamList } from '../../navigation/PaymentCodeStack';

interface DataSection {
  title: string;
  data: string[];
}

type Props = NativeStackScreenProps<PaymentCodeStackParamList, 'PaymentCodesList'>;

export default function PaymentCodesList() {
  const route = useRoute();
  const { walletID } = route.params as Props['route']['params'];
  const { wallets } = useContext(BlueStorageContext);
  const [data, setData] = useState<DataSection[]>([]);

  useEffect(() => {
    if (!walletID) return;

    const foundWallet = wallets.find(w => w.getID() === walletID) as unknown as AbstractHDElectrumWallet;
    if (!foundWallet) return;

    const newData: DataSection[] = [
      {
        title: loc.bip47.who_can_pay_me,
        data: foundWallet.getBIP47SenderPaymentCodes(),
      },
      {
        title: loc.bip47.whom_can_i_pay,
        data: foundWallet.getBIP47ReceiverPaymentCodes(),
      },
    ];
    setData(newData);
  }, [walletID, wallets]);

  return (
    <View style={styles.container}>
      {!walletID ? (
        <Text>Internal error</Text>
      ) : (
        <View>
          <SectionList
            sections={data}
            keyExtractor={(item, index) => item + index}
            renderItem={({ item }) => (
              <View>
                <CopyTextToClipboard truncated text={item} />
              </View>
            )}
            renderSectionHeader={({ section: { title } }) => <Text style={styles.titleText}>{title}</Text>}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: { fontSize: 20 },
});
