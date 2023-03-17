import React from 'react';
import { StyleSheet, View, Text, ScrollView, Share, Alert, TouchableOpacity } from 'react-native'
import { useNavigation, useTheme } from '@react-navigation/native';
import {Icon} from 'react-native-elements';

import navigationStyle from '../../components/navigationStyle';
import { BlueButton } from '../../BlueComponents';

const BoltCardCreateHelp = () => {

    const { colors } = useTheme();
    const { navigate, goBacks } = useNavigation();

    const stylesHook = StyleSheet.create({
        modalContent: {
          backgroundColor: colors.modal,
          borderTopColor: colors.foregroundColor,
          borderWidth: colors.borderWidth,
        },
        customAmount: {
          borderColor: colors.formBorder,
          borderBottomColor: colors.formBorder,
          backgroundColor: colors.inputBackgroundColor,
        },
        customAmountText: {
          color: colors.foregroundColor,
        },
        root: {
          backgroundColor: colors.elevated,
        },
        rootBackgroundColor: {
          backgroundColor: colors.elevated,
        },
        amount: {
          color: colors.foregroundColor,
        },
        label: {
          color: colors.foregroundColor,
        },
        modalButton: {
          backgroundColor: colors.modalButton,
        },
    });

    const onShare = async () => {
        try {
          const result = await Share.share({
            message: 'Boltcard NFC Programmer',
            url: 'https://play.google.com/store/apps/details?id=com.lightningnfcapp'
          });
          if (result.action === Share.sharedAction) {
            if (result.activityType) {
              // shared with activity type of result.activityType
            } else {
              // shared
            }
          } else if (result.action === Share.dismissedAction) {
            // dismissed
          }
        } catch (error) {
          Alert.alert(error.message);
        }
    };

    return (
        <View style={[styles.root, stylesHook.root]}>
            <ScrollView contentContainerStyle={[styles.root, stylesHook.root]} keyboardShouldPersistTaps="always">
                <View style={styles.scrollBody}>
                    <Text style={styles.title}>You need an android phone</Text>
                    <Text style={styles.note}>You will need an android phone to programme your bolt card. iOS integration is coming. Follow us on any updates.</Text>
                    <View style={{marginTop: 20}}>
                        <Text style={styles.step}>1. Install <Text style={styles.bold}>Boltcard NFC Programmer</Text> on an android phone from Google Play Store</Text>
                        <View style={{marginBottom: 10}}>
                            <BlueButton title="Share the app" onPress={onShare}/>
                        </View>
                        <Text style={styles.step}>2. On the <Text style={styles.bold}>Create Bolt Card screen</Text>, click the <Text style={styles.bold}>Scan QR Code</Text> button.</Text>
                        <Text style={styles.step}>3. Scan the QR code shown on the Bolt card wallet app.</Text>
                        <Text style={styles.step}>4. Follow the steps on the app to connect your bolt card.</Text>
                        <Text style={styles.step}>5. After connecting the card successfully, click the <Text style={styles.bold}>I've connected my card</Text> button on the Bolt card wallet app.</Text>
                        <Text style={styles.step}>6. Your card should be all set to go to make your first payment!</Text>
                    </View>
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    title: {
        fontSize: 30,
        lineHeight: 35,
        fontWeight: '700',
        marginBottom: 20,
    },
    scrollBody: {
        marginTop: 32,
        flexGrow: 1,
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    note: {
        fontSize: 12,
        lineHeight: 16,
        marginBottom: 10
    },
    step: {
        fontSize: 16,
        lineHeight: 20,
        marginBottom: 10
    },
    bold: {
        fontWeight: '600'
    }
});

BoltCardCreateHelp.navigationOptions = navigationStyle(
    {
        closeButton: true,
        headerHideBackButton: true,
    },
    (options, { theme, navigation, route }) => (
        {
             ...options, 
             title: "How to connect bolt card",
             modal: "modal",
             headerLeft: () => (
                <TouchableOpacity onPress={() => {navigation.goBack()}}>
                    <Icon name="arrow-back" type="material" size={22} color="#000" />
                </TouchableOpacity>
             ),
             headerRight: () => null
        }
    )
);

export default BoltCardCreateHelp;