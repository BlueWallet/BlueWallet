import React, { useEffect, useState, useContext } from 'react';
import {
    BackHandler,
    NativeEventEmitter, 
    NativeModules,  
    StyleSheet, 
    Text, 
    View,
    StatusBar,
    ScrollView,
    Image,
    Platform
} from 'react-native';
import { useNavigation, useRoute, useTheme, useFocusEffect } from '@react-navigation/native';
import {Icon, ListItem} from 'react-native-elements';
import Ionicons from 'react-native-vector-icons/Ionicons';
import QRCodeComponent from '../../components/QRCodeComponent';

import {
    BlueLoading,
    BlueCard,
    BlueText,
    BlueButton
} from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import loc, { formatBalance } from '../../loc';
import alert from '../../components/Alert';

const BoltCardCreate = () => {

    const { walletID } = useRoute().params;
    const { wallets, saveToDisk } = useContext(BlueStorageContext);
    const wallet = wallets.find(w => w.getID() === walletID);
    const { colors } = useTheme();
    const { navigate, goBack, setParams } = useNavigation();

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

    const [cardDetails, setCardDetails] = useState({});
    const [createUrl, setCreateUrl] = useState('');
    const [loading, setLoading] = useState(true);
    //setup
    const [keys, setKeys] = useState([]);
    const [lnurlw_base, setlnurlw_base] = useState();
    const [cardName, setCardName] = useState();
    const [writeMode, setWriteMode] = useState(false);

    //output
    const [cardUID, setCardUID] = useState();
    const [tagname, setTagname] = useState();
    const [tagTypeError, setTagTypeError] = useState();
    
    const [key0Changed, setKey0Changed] = useState();
    const [key1Changed, setKey1Changed] = useState();
    const [key2Changed, setKey2Changed] = useState();
    const [key3Changed, setKey3Changed] = useState();
    const [key4Changed, setKey4Changed] = useState();

    const [ndefWritten, setNdefWritten] = useState();
    const [writekeys, setWriteKeys] = useState();
    const [ndefRead, setNdefRead] = useState();
    const [testp, setTestp] = useState();
    const [testc, setTestc] = useState();
    const [testBolt, setTestBolt] = useState();

    const [enhancedPrivacy, setEnhancedPrivacy] = useState(false);

    useEffect(() => {
        if(cardDetails && (cardDetails.lnurlw_base && cardDetails.k0 && cardDetails.k1 && cardDetails.k2 && cardDetails.k3 && cardDetails.k4)) {
            setKeys([cardDetails.k0,cardDetails.k1,cardDetails.k2,cardDetails.k3,cardDetails.k4])
            setlnurlw_base(cardDetails.lnurlw_base)
            setCardName(cardDetails.card_name)

            console.log('native', NativeModules, NativeModules.MyReactModule);
            NativeModules.MyReactModule.changeKeys(
                cardDetails.lnurlw_base,
                cardDetails.k0, 
                cardDetails.k1, 
                cardDetails.k2, 
                cardDetails.k3, 
                cardDetails.k4, 
                cardDetails.uid_privacy != undefined && cardDetails.uid_privacy == "Y", 
                (response) => {
                    console.log('Change keys response', response)
                    if (response == "Success") {
                        setLoading(false);
                        setWriteMode(true);
                    }
                    NativeModules.MyReactModule.setCardMode('createBoltcard');
                }
            );
            resetOutput();
        }
    }, [cardDetails]);

    useEffect(() => {
        BackHandler.addEventListener('hardwareBackPress', handleBackButton);

        if(Platform.OS == 'android') {
            const eventEmitter = new NativeEventEmitter();
            const boltCardEventListener = eventEmitter.addListener('CreateBoltCard', (event) => {
                console.log('CREATE BOLTCARD LISTENER')
                if(event.tagTypeError) setTagTypeError(event.tagTypeError);
                if(event.cardUID) setCardUID(event.cardUID);
                if(event.tagname) setTagname(event.tagname);
    
                if(event.key0Changed) setKey0Changed(event.key0Changed);
                if(event.key1Changed) setKey1Changed(event.key1Changed);
                if(event.key2Changed) setKey2Changed(event.key2Changed);
                if(event.key3Changed) setKey3Changed(event.key3Changed);
                if(event.key4Changed) setKey4Changed(event.key4Changed);
                if(event.uid_privacy) setPrivateUID(event.uid_privacy == 'Y');
    
                if(event.ndefWritten) setNdefWritten(event.ndefWritten);
                if(event.writekeys) setWriteKeys(event.writekeys);
                
                if(event.readNDEF) {
                    setNdefRead(event.readNDEF)
                    //we have the latest read from the card fire it off to the server.
                    const httpsLNURL = event.readNDEF.replace("lnurlw://", "https://");
                    fetch(httpsLNURL)
                        .then((response) => response.json())
                        .then((json) => {
                            setTestBolt("success");
                        })
                        .catch(error => {
                            setTestBolt("Error: "+error.message);
                        });
                }
    
                if(event.testp) setTestp(event.testp);
                if(event.testc) setTestc(event.testc);
    
                NativeModules.MyReactModule.setCardMode('read');
                setWriteMode(false);
                setCardWritten('success');            
    
            });
        }

        return () => {
            if(Platform.OS == 'android') boltCardEventListener.remove();
          BackHandler.removeEventListener('hardwareBackPress', handleBackButton);
        };
    }, []);

    const getCardKeys = (wallet) => {
        wallet
            .getcardkeys()
            .then(keys => {
                console.log('KEYS', keys);
                setCardDetails(keys);
                wallet.setWipeData(null);
                saveToDisk();
            })
            .catch(err => {
                console.log('ERROR', err.message);
                alert(err.message);
                goBack();
            });
    }

    const getCreateUrl = (wallet) => {
        wallet
            .createcard()
            .then(url => {
                console.log('URL', url);
                setCreateUrl(url);
                wallet.setWipeData(null);
                saveToDisk();
                setLoading(false);
            })
            .catch(err => {
                console.log('ERROR', err.message);
                alert(err.message);
                goBack();
            })
    }
 
    const setCardWritten = async (status) => {
        if(wallet) {
            await wallet.setCardWritten(status);
            wallet.setCardKeys(null);
            saveToDisk();
        }
    }

    useEffect(() => {
        if(wallet) {
            if(Platform.OS == 'ios') {
                getCreateUrl(wallet);
            } else {
                getCardKeys(wallet);
            }
        }
    }, [walletID]);

    const updateNodeUrl = text => {
        setNodeURL(text);
        if(Platform.OS == 'android') {
            NativeModules.MyReactModule.setNodeURL(text);
        }
    }
    
    useFocusEffect(
        React.useCallback(() => {
            if(Platform.OS == 'android') NativeModules.MyReactModule.setCardMode("read");
        }, [])
    );

    const handleBackButton = () => {
        goBack(null);
        return true;
    };

    const resetOutput = () => {
        setTagTypeError(null);
        setTagname(null);
        setCardUID(null);
        setKey0Changed(null);
        setKey1Changed(null);
        setKey2Changed(null);
        setKey3Changed(null);
        setKey4Changed(null);
        setNdefWritten(null);
        setWriteKeys(null);
    }

    const writeAgain = () => {
        resetOutput();
        if(Platform.OS == 'android') {
            NativeModules.MyReactModule.setCardMode('createBoltcard');
        }
        setWriteMode(true);
    }

    const showTickOrError = (good) => {
        return good ? " ✓" : " ×"
    }

    const togglePrivacy = () => {
        if(Platform.OS == 'android') {
            NativeModules.MyReactModule.changeKeys(
                cardDetails.lnurlw_base,
                cardDetails.k0, 
                cardDetails.k1, 
                cardDetails.k2, 
                cardDetails.k3, 
                cardDetails.k4, 
                !enhancedPrivacy, 
                (response) => {
                    console.log('Change keys response', response)
                    if (response == "Success") {
                        setLoading(false);
                        setWriteMode(true);
                    }
                    NativeModules.MyReactModule.setCardMode('createBoltcard');
                }
            );
        }
        setEnhancedPrivacy(!enhancedPrivacy)
    }

    const key0display = keys[0] ? keys[0].substring(0, 4)+"............"+ keys[0].substring(28) : "pending...";
    const key1display = keys[1] ? keys[1].substring(0, 4)+"............"+ keys[1].substring(28) : "pending...";
    const key2display = keys[2] ? keys[2].substring(0, 4)+"............"+ keys[2].substring(28) : "pending...";
    const key3display = keys[3] ? keys[3].substring(0, 4)+"............"+ keys[3].substring(28) : "pending...";
    const key4display = keys[4] ? keys[4].substring(0, 4)+"............"+ keys[4].substring(28) : "pending...";

    const CreateBoltCardQRCode = () => {
        if(createUrl) {
            return (
                <>  
                    <View style={{marginBottom: 30, marginLeft: 'auto', marginRight: 'auto'}}>
                        <QRCodeComponent
                            value={createUrl}
                            size={300}
                        />
                    </View>
                    <Text style={{marginBottom: 20, fontSize: 15, textAlign: 'center'}}>The QR Code can be scanned only once. Make sure you have your card ready to be written.</Text>
                    <BlueButton
                        title="I've connected my card"
                        onPress={async () => {
                            const card = await wallet.getCardDetails(true);
                            if(card && card.uid) {
                                console.log('Connected');
                                alert('Card connected to the wallet');
                                goBack();
                            } else {
                                alert("Check if your card has been connected correctly.");
                            }
                        }}
                        // backgroundColor={colors.redBG}
                    />
                </>
            );
        }
        return null;
    }
    return(
        <View style={[styles.root, stylesHook.root]}>
            <StatusBar barStyle="light-content" />
            <ScrollView contentContainerStyle={[styles.root, stylesHook.root]} keyboardShouldPersistTaps="always">
                <View style={styles.scrollBody}>
                    <BlueCard>
                        {loading ? 
                            <>
                                <BlueLoading />
                                <BlueText>Loading...</BlueText>
                            </>
                        :
                            <>
                                {
                                    Platform.OS == 'ios' ?
                                        CreateBoltCardQRCode()
                                    :
                                    null
                                }
                                {writeMode ? 
                                    <>
                                        <BlueText style={styles.label}>Ready to write</BlueText>
                                        <BlueText style={styles.label}>
                                        <Image 
                                            source={(() => {
                                            return require('../../img/bolt-card-link.png');
                                            })()} style={{width: 40, height: 30, marginTop:20}}
                                        />
                                        </BlueText>
                                        <BlueText style={styles.label}>Tap and hold your nfc card to the reader.</BlueText>
                                        <BlueText style={styles.label}><BlueLoading /></BlueText>
                                        <BlueText style={styles.label}>Do not remove your card until writing is complete.</BlueText>
                                        <BlueText style={{borderWidth:1, borderColor:'#fff', paddingHorizontal:5}} onPress={()=>togglePrivacy()}>
                                            <ListItem.CheckBox checkedColor="#0070FF" checkedIcon="check" checked={enhancedPrivacy} onPress={()=>togglePrivacy()} />
                                            Enable Private UID (Hides card UID. One-way operation, can't undo)
                                        </BlueText>
                                        <BlueButton 
                                            style={styles.link}
                                            title={!showDetails ? "Show Key Details ▼" : "Hide Key Details ▴"}
                                            onPress={() => setShowDetails(!showDetails)}
                                        />
                                        {showDetails && 
                                        <View>
                                            <BlueText style={styles.monospace}>lnurl:</BlueText>
                                            <BlueText style={styles.monospace}>{lnurlw_base}</BlueText>
                                            <BlueText style={styles.monospace}>Private UID: {enhancedPrivacy ? "yes" : "no"}</BlueText>
                                            <BlueText style={styles.monospace}>Key 0: {key0display}</BlueText>
                                            <BlueText style={styles.monospace}>Key 1: {key1display}</BlueText>
                                            <BlueText style={styles.monospace}>Key 2: {key2display}</BlueText>
                                            <BlueText style={styles.monospace}>Key 3: {key3display}</BlueText>
                                            <BlueText style={styles.monospace}>Key 4: {key4display}</BlueText>
                                        </View>
                                        }
                                    </>
                                : 
                                    null
                                }
                                {cardUID && 
                                    <View style={{fontSize: 30}}>
                                            <Text>Output:</Text>
                                            {tagTypeError && <Text>Tag Type Error: {tagTypeError}<Ionicons name="alert-circle"  size={20} color="red" /></Text>}
                                            {cardUID && <Text>Card UID: {cardUID} {showTickOrError(true)}</Text>}
                                            {tagname && <Text style={{lineHeight:30, textAlignVertical:"center"}}>Tag: {tagname}{showTickOrError(true)}</Text>}
                                            {key0Changed && <Text>Keys ready to change: {key0Changed == "no" ? "yes" : "no"}{showTickOrError(key0Changed == "no")}</Text>}                       
                                            {ndefWritten && <Text>NDEF written: {ndefWritten}{showTickOrError(ndefWritten == "success")}</Text>}
                                            {writekeys && <Text>Keys Changed: {writekeys}{showTickOrError(writekeys == "success")}</Text>}
                                            {ndefRead && <Text>Read NDEF: {ndefRead}</Text>}
                                            {testp && <Text>Test PICC: {
                                                cardUID.length == 8 ? 
                                                <>test skipped {showTickOrError(true)}</>
                                                : 
                                                <>{testp}{showTickOrError(testp == "ok")}</>
                                            }</Text>}
                                            {testc && <Text>Test CMAC: {testc}{showTickOrError(testc == "ok")}</Text>}
                                            {testBolt && <Text>Bolt call test: {testBolt}{showTickOrError(testBolt == "success")}</Text>}

                                            {writekeys == "success" ? 
                                                <BlueButton 
                                                    style={styles.link}
                                                    title="Go back"
                                                    onPress={goBack}
                                                />
                                            :
                                                <BlueButton 
                                                    style={styles.link}
                                                    title="Retry"
                                                    onPress={writeAgain}
                                                />
                                            }
                                    </View>

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
        paddingHorizontal: 32,
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
});

BoltCardCreate.navigationOptions = navigationStyle(
{
    closeButton: true,
    headerHideBackButton: true,
},
opts => ({ ...opts, title: "Create bolt card" }),
);

export default BoltCardCreate;