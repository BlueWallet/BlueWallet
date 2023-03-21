import React, { useEffect, useState, useContext } from 'react';
import {
    NativeEventEmitter, 
    NativeModules,  
    StyleSheet, 
    Text, 
    View,
    StatusBar,
    ScrollView,
    TextInput,
    Image,
    Platform,
    Alert,
    TouchableOpacity
} from 'react-native';
import { useNavigation, useRoute, useTheme, useFocusEffect } from '@react-navigation/native';
import {Icon} from 'react-native-elements';
import Dialog from 'react-native-dialog';
import QRCodeComponent from '../../components/QRCodeComponent';

import {
    BlueLoading,
    BlueCard,
    BlueText,
    BlueButton
} from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import alert from '../../components/Alert';

const defaultKey = "00000000000000000000000000000000";

const BoltCardDisconnect = () => {

    const { walletID } = useRoute().params;
    const { wallets, saveToDisk } = useContext(BlueStorageContext);
    const wallet = wallets.find(w => w.getID() === walletID);
    const { colors } = useTheme();
    const { navigate, goBack, setParams, popToTop } = useNavigation();

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

    const [showDetails, setShowDetails] = useState(false);
    const [writeKeysOutput, setWriteKeysOutput] = useState();
    const [wipeCardDetails, setWipeCardDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    //setup
    const [uid, setUid] = useState()
    const [key0, setKey0] = useState()
    const [key1, setKey1] = useState()
    const [key2, setKey2] = useState()
    const [key3, setKey3] = useState()
    const [key4, setKey4] = useState()

    const [pasteWipeKeysJSON, setPasteWipeKeysJSON] = useState()
    const [resetNow, setResetNow] = useState(false);
    const [keyJsonError, setKeyJsonError] = useState(false);

    useEffect(() => {
       if(wipeCardDetails) {
            setUid(wipeCardDetails.uid);
            setKey0(wipeCardDetails.k0 || "00000000000000000000000000000000");
            setKey1(wipeCardDetails.k1 || "00000000000000000000000000000000");
            setKey2(wipeCardDetails.k2 || "00000000000000000000000000000000");
            setKey3(wipeCardDetails.k3 || "00000000000000000000000000000000");
            setKey4(wipeCardDetails.k4 || "00000000000000000000000000000000");
            let error = ''
            if(wipeCardDetails.action != 'wipe') {
                error = 'Wipe action not specified, proceed with caution.\r\n';
            }
            if(wipeCardDetails.version != '1') {
                error = error + ' Expected version 1, found version: '+wipeCardDetails.version+'\r\n';
            }
            if(!wipeCardDetails.k0 || !wipeCardDetails.k1 || !wipeCardDetails.k2 || !wipeCardDetails.k3 || !wipeCardDetails.k4) {
                error = error + ' Some keys missing, proceed with caution';
            }
            setKeyJsonError(error ? error : false)
            if(Platform.OS == 'android') enableResetMode(wipeCardDetails.k0, wipeCardDetails.k1, wipeCardDetails.k2, wipeCardDetails.k3, wipeCardDetails.k4, wipeCardDetails.uid);
       }
    }, [wipeCardDetails]);

    useEffect(() => {
        if(Platform.OS == 'android') {
            const eventEmitter = new NativeEventEmitter(NativeModules.ToastExample);
            const eventListener = eventEmitter.addListener('ChangeKeysResult', (event) => {
                console.log('CHANGE KEYS', event);
                if(event.status == 'success') {
                    setCardWiped();
                }
                setWriteKeysOutput(event.output);
    
                //@todo: ensure card wipe has worked.
            });
            
            return () => {
            eventListener.remove();
            };
        }
    }, []);

    const getWipeKeys = async (wallet) => {
        try {
            const data = await wallet.wipecard();
            setWipeCardDetails(data);
            setLoading(false);
        } catch(err) {
            alert(err.message);
        }
    }

    useEffect(() => {
        if(wallet) {
            getWipeKeys(wallet);
        }
    }, [walletID]);

    useFocusEffect(
        React.useCallback(() => {
            if(Platform.OS == 'android') NativeModules.MyReactModule.setCardMode("read");
        }, [])
    );

    const setCardWiped = async () => {
        console.log('setCardWiped');
        if(wallet) {
            await wallet.disconnectCard();
            saveToDisk();
        }
    }

    const enableResetMode = (k0, k1, k2, k3, k4, carduid) => {
        NativeModules.MyReactModule.setCardMode("resetkeys");
        if (k0 && k1 && k2 && k3 && k4 && carduid) {
            NativeModules.MyReactModule.setResetKeys(k0,k1,k2,k3,k4,carduid, ()=> {
                //callback
                console.log("reset keys set");
            });
        }
        else {
            NativeModules.MyReactModule.setResetKeys(key0,key1,key2,key3,key4,uid, ()=> {
                //callback
                console.log("reset keys set");
            });
        }
        setWriteKeysOutput(null)
        setResetNow(true);
    }

    const disableResetMode = () => {
        NativeModules.MyReactModule.setCardMode("read");
        setResetNow(false);
    }

    const disconnectQRCode = () => {
        const disconnect = wipeCardDetails;
        console.log('QRCODE', disconnect);
        return (
            <>
                <View style={{marginBottom: 20, marginLeft: 'auto', marginRight: 'auto'}}>
                    <QRCodeComponent
                        value={JSON.stringify(disconnect)}
                        size={300}
                    />
                </View>
                <View style={{marginBottom: 10}}>
                    <BlueButton
                        title="Instructions"
                        onPress={() => {
                            navigate("BoltCardDisconnectHelp")
                        }}
                        backgroundColor={colors.lightButton}
                    />
                </View>
                <BlueButton
                    title="I've disconnected my card"
                    onPress={() => {
                        Alert.alert('I\'ve disconnected my bolt card', 'Please make sure you\'ve disconnected your card before pressing the "OK" button. You won\'t be able to get the wipe key details after clicking this.', [
                            {
                              text: 'Cancel',
                              onPress: () => console.log('Cancel Pressed'),
                              style: 'cancel',
                            },
                            {text: 'OK', onPress: () =>{
                                setCardWiped();
                                popToTop();
                                goBack();
                            }},
                        ]);
                        
                    }}
                    // backgroundColor={colors.redBG}
                />        
            </>
        );
    }

    return(
        <View style={[styles.root, stylesHook.root]}>
            <StatusBar barStyle="light-content" />
            <ScrollView contentContainerStyle={[styles.root, stylesHook.root]} keyboardShouldPersistTaps="always">
                <View style={styles.scrollBody}>
                    <Dialog.Container visible={resetNow}>
                        <Dialog.Title style={styles.textBlack}>
                        <Icon name="creditcard" size={30} color="#000" type="antdesign" /> Tap NFC Card 
                        </Dialog.Title>
                        {!writeKeysOutput && <Text style={{fontSize:20, textAlign: 'center', borderColor:'black'}}>
                        Hold NFC card to reader when ready 
                        </Text>}
                        
                        <Text style={{fontSize:20, textAlign: 'center', borderColor:'black'}}>
                        {writeKeysOutput ? writeKeysOutput : <BlueLoading />}
                        </Text>
                        <Dialog.Button label="Close"
                        onPress={() => {
                            console.log('wallet', wallet.cardWritten);
                            if(!wallet.cardWritten) {
                                popToTop();
                                goBack();
                            } else {
                                disableResetMode();
                            }
                        }} />
                    </Dialog.Container>
                    <Dialog.Container visible={keyJsonError}>
                        <Dialog.Title style={styles.textBlack}>
                        Wipe Keys Issue
                        </Dialog.Title>
                        <Text>{keyJsonError}</Text>
                        <Dialog.Button label="I understand"
                        onPress={() => {
                            setKeyJsonError(false);
                        }} />
                    </Dialog.Container>
                    <BlueCard>
                        <BlueText style={styles.label}>
                            {/* <Image 
                                source={(() => {
                                return require('../../img/bolt-card-unlink.png');
                                })()} style={{width: 60, height: 40, marginTop:20}}
                            /> */}
                        </BlueText>
                        <BlueText style={styles.label}>Disconnect my bolt card</BlueText>
                        {loading ? 
                            <BlueLoading />
                        : 
                            <>
                                {Platform.OS == 'ios' &&
                                    disconnectQRCode()
                                }
                                <BlueButton 
                                    style={styles.link}
                                    title={!showDetails ? "Show Key Details ▼" : "Hide Key Details ▴"}
                                    onPress={() => setShowDetails(!showDetails)}
                                />
                                {showDetails && 
                                <>
                                    <View style={styles.titlecontainer}>
                                        <Text style={styles.title}>Key 0</Text>
                                    </View>
                                    <TextInput 
                                        style={styles.input} 
                                        value={key0} 
                                        maxLength={32}
                                        multiline = {true}
                                        numberOfLines = {1}
                                        autoCapitalize='none'
                                        onChangeText={(text) => setKey0(text)}
                                        placeholder={defaultKey}
                                    />
                                    <View style={styles.titlecontainer}>
                                        <Text style={styles.title}>Key 1</Text>
                                    </View>
                                    <TextInput 
                                        style={styles.input} 
                                        value={key1} 
                                        maxLength={32}
                                        multiline = {true}
                                        numberOfLines = {1}
                                        autoCapitalize='none'
                                        onChangeText={(text) => setKey1(text)}
                                        placeholder={defaultKey}
                                    />
                                    <View style={styles.titlecontainer}>
                                        <Text style={styles.title}>Key 2</Text>
                                    </View>
                                    <TextInput 
                                        style={styles.input} 
                                        value={key2} 
                                        maxLength={32}
                                        multiline = {true}
                                        numberOfLines = {1}
                                        autoCapitalize='none'
                                        onChangeText={(text) => setKey2(text)}
                                        placeholder={defaultKey}
                                    />
                                    <View style={styles.titlecontainer}>
                                        <Text style={styles.title}>Key 3</Text>
                                    </View>
                                    <TextInput 
                                        style={styles.input} 
                                        value={key3} 
                                        maxLength={32}
                                        multiline = {true}
                                        numberOfLines = {1}
                                        autoCapitalize='none'
                                        onChangeText={(text) => setKey3(text)}
                                        placeholder={defaultKey}
                                    />
                                    <View style={styles.titlecontainer}>
                                        <Text style={styles.title}>Key 4</Text>
                                    </View>
                                    <TextInput 
                                        style={styles.input} 
                                        value={key4} 
                                        maxLength={32}
                                        multiline = {true}
                                        numberOfLines = {1}
                                        autoCapitalize='none'
                                        onChangeText={(text) => setKey4(text)}
                                        placeholder={defaultKey}
                                    />
                                </>
                                }
                                { Platform.OS == 'android' &&
                                    <BlueButton 
                                        style={styles.button}
                                        title="Reset Again"
                                        color="#000000"
                                        onPress={enableResetMode}
                                    />
                                }
                            </>
                        }
                    </BlueCard>
                </View>
            </ScrollView>
            
        </View>
    );
}

const styles = StyleSheet.create({
    monospace: {
      fontFamily: "monospace"
    },
    modalContent: {
        padding: 22,
        justifyContent: 'center',
        alignItems: 'center',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        minHeight: 350,
        height: 350,
    },
    customAmount: {
        flexDirection: 'row',
        borderWidth: 1.0,
        borderBottomWidth: 0.5,
        minHeight: 44,
        height: 44,
        marginHorizontal: 20,
        alignItems: 'center',
        marginVertical: 8,
        borderRadius: 4,
    },
    root: {
        flexGrow: 1,
        justifyContent: 'space-between',
    },
    scrollBody: {
        marginTop: 32,
        flexGrow: 1,
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    share: {
        justifyContent: 'flex-end',
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: 8,
    },
    link: {
        marginVertical: 16,
        paddingHorizontal: 10,

    },
    button: {
        marginVertical: 16,
        paddingHorizontal: 10,
        paddingVertical: 16,
        borderWidth:1,
        borderColor: '#fff',

    },
    amount: {
        fontWeight: '600',
        fontSize: 36,
        textAlign: 'center',
    },
    label: {
        fontWeight: '600',
        textAlign: 'center',
        paddingBottom: 24,
    },
    modalButton: {
        paddingVertical: 14,
        paddingHorizontal: 70,
        maxWidth: '80%',
        borderRadius: 50,
        fontWeight: '700',
    },
    customAmountText: {
        flex: 1,
        marginHorizontal: 8,
        minHeight: 33,
    },
    title: {
        fontSize:16
    },
    titlecontainer: {
        flexDirection: 'row', 
        justifyContent: 'space-between'
    },
    input: {
        height: 30,
        width: '100%',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#fff',
        flexWrap: 'wrap',
        padding: 5,
        fontFamily: 'monospace',
        textAlignVertical: 'top',
        color:'#000'
    },
});

BoltCardDisconnect.navigationOptions = navigationStyle(
{
    closeButton: true,
    headerHideBackButton: true,
},
(options, { theme, navigation, route }) => (
    {
         ...options, 
         title: "Disconnect bolt card", 
        //  headerLeft: () => Platform.OS == 'ios' ? (
        //     <TouchableOpacity
        //     accessibilityRole="button"
        //     disabled={route.params.isLoading === true}
        //     onPress={() =>
        //         navigation.navigate('BoltCardDisconnectHelp')
        //     }
        //     >
        //         <Icon name="help-outline" type="material" size={22} color="#000" />
        //     </TouchableOpacity>
        // ) : null
    }
),
);

export default BoltCardDisconnect;