import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useContext, useEffect, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { BlueCopyTextToClipboard } from '../../BlueComponents';
import { PaymentCodeStackParamList } from '../../Navigation';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import { AbstractHDElectrumWallet } from '../../class/wallets/abstract-hd-electrum-wallet';
import loc from '../../loc';

interface DataSection {
  title: string;
  data: string[];
}

type Props = NativeStackScreenProps<PaymentCodeStackParamList, 'PaymentCodesList'>;

export default function PaymentCodesList({ route }: Props) {
  const { walletID } = route.params;
  const { wallets } = useContext(BlueStorageContext);
  const [data, setData] = useState<DataSection[]>([]);

  useEffect(() => {
    if (!walletID) return;

    const foundWallet: AbstractHDElectrumWallet = wallets.find((w: AbstractHDElectrumWallet) => w.getID() === walletID);
    if (!foundWallet) return;

    const newData: DataSection[] = [
      {
        title: loc.bip47.who_can_pay_me,
        data: foundWallet.getBIP47SenderPaymentCodes(),
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
                <BlueCopyTextToClipboard truncated text={item} />
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
