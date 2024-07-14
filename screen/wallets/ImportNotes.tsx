import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View, Alert, TouchableOpacity } from 'react-native';
import { useTheme } from '../../components/themes';
import { BlueCard, BlueSpacing10, BlueText } from '../../BlueComponents';
import ListItem from '../../components/ListItem';
import loc from '../../loc';
import { readFile } from 'react-native-fs';
import { useStorage } from '../../hooks/context/useStorage';
import dayjs from 'dayjs';
import * as RNLocalize from 'react-native-localize';
import { useRoute } from '@react-navigation/native';

const ImportNotes: React.FC = () => {
  const { colors } = useTheme();
  const { txMetadata, saveToDisk } = useStorage();
  const params = useRoute().params;
  const { importedDataUri } = params;
  const [data, setData] = useState<{ date: string; txid: string; amount: string; memo: string }[]>([]);
  const [selectedItems, setSelectedItems] = useState<{ [key: string]: string }>({});
  const locale = RNLocalize.getLocales()[0].languageTag;

  const stylesHook = StyleSheet.create({
    flex: {
      backgroundColor: colors.background,
    },
    headerRightButton: {
      marginRight: 10,
    },
    headerRightText: {
      color: colors.buttonAlternativeTextColor,
      fontSize: 16,
    },
    separator: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: 10,
    },
  });

  useEffect(() => {
    console.debug('Fetching data from:', importedDataUri);
    const fetchData = async () => {
      try {
        const fileContent = await readFile(importedDataUri, 'utf8');
        console.debug('File content:', fileContent);

        const lines = fileContent.trim().split('\n');
        console.debug('Lines read:', lines);

        const headers = lines.shift()?.trim().split(',');
        console.debug('Headers:', headers);

        if (
          !headers ||
          headers.length < 4 ||
          headers[0].trim() !== 'Date' ||
          headers[1].trim() !== 'Transaction ID' ||
          headers[2].trim() !== 'Amount (BTC)' ||
          headers[3].trim() !== 'Memo'
        ) {
          console.debug('Invalid format detected.');
          presentAlert({
            message: loc.wallets.details_import_notes_error,
          });
          return;
        }

        const parsedData = lines
          .map(line => {
            const [date, txid, amount, memo] = line.trim().split(',');

            // Exclude rows with empty or undefined/null memo
            if (!memo) return null;

            return {
              date: dayjs(new Date(date)).locale(locale).format('LLL'),
              txid,
              amount,
              memo,
            };
          })
          .filter(item => item !== null) as { date: string; txid: string; amount: string; memo: string }[];

        console.debug('Parsed data:', parsedData);
        setData(parsedData);
      } catch (error) {
        console.error('Error fetching or parsing data:', error);
        presentAlert({
          message: loc.wallets.details_import_notes_error,
        });
      }
    };

    fetchData();
  }, [importedDataUri, locale]);

  const renderItem = ({ item }: { item: { date: string; txid: string; amount: string; memo: string } }) => {
    const { date, txid, amount, memo } = item;

    const existingMemo = txMetadata[txid]?.memo;
    const isAlreadySaved = !!existingMemo;
    const checkmarkEnabled = !isAlreadySaved;

    const handleItemPress = () => {
      if (!isAlreadySaved) {
        setSelectedItems({ ...selectedItems, [txid]: memo });
      }
    };

    return (
      <View style={stylesHook.separator}>
        <ListItem
          title={`Memo goes here`}
          subtitle={`\nTransaction ID:\n${txid}\n\nAmount:\n${amount}\n\nDate:\n${date}`}
          containerStyle={StyleSheet.flatten([styles.flex, stylesHook.flex, { minHeight: 100 }])}
          checkmark={!checkmarkEnabled}
          onPress={handleItemPress}
        >
          {isAlreadySaved && (
            <View>
              <BlueText>{`Saved Memo: ${existingMemo}`}</BlueText>
              <BlueText>{`Imported Memo: ${memo}`}</BlueText>
            </View>
          )}
        </ListItem>
      </View>
    );
  };

  const handleSavePress = () => {
    Alert.alert(
      loc.settings.confirm_save_title,
      loc.settings.confirm_save_message,
      [
        {
          text: loc.settings.cancel,
          style: 'cancel',
        },
        {
          text: loc.settings.confirm,
          onPress: () => {
            console.debug('Saving selected items:', selectedItems);
            saveToDisk(selectedItems);
            setSelectedItems({});
            Alert.alert(loc.settings.save_success);
          },
        },
      ],
      { cancelable: false }
    );
  };

  return (
    <View style={[styles.flex, stylesHook.flex]}>
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustContentInsets
        keyExtractor={(item, index) => `${index}`}
        data={data}
        initialNumToRender={30}
        renderItem={renderItem}
      />
      <BlueCard>
        <BlueText>{loc.settings.transactions_imported}</BlueText>
      </BlueCard>
      <TouchableOpacity style={stylesHook.headerRightButton} onPress={handleSavePress}>
        <BlueText style={stylesHook.headerRightText}>{loc.settings.save}</BlueText>
      </TouchableOpacity>
    </View>
  );
};

export default ImportNotes;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});

const presentAlert = ({ message }: { message: string }) => {
  Alert.alert(message);
};