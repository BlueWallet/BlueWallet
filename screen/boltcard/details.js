import React, { useEffect, useState, useContext } from 'react';
import {
    StyleSheet, 
    Text, 
    View,
    StatusBar,
    ScrollView,
    I18nManager,
    TouchableOpacity,
    Image,
    TextInput
} from 'react-native';
import { useNavigation, useRoute, useTheme, useFocusEffect } from '@react-navigation/native';
import {Icon, ListItem} from 'react-native-elements';
import Ionicons from 'react-native-vector-icons/Ionicons';

import {
    BlueLoading,
    BlueCard,
    BlueText,
    BlueButton,
    BlueFormMultiInput,
    BlueFormTextInput
} from '../../BlueComponents';
import navigationStyle from '../../components/navigationStyle';
import { BlueStorageContext } from '../../blue_modules/storage-context';
import alert from '../../components/Alert';

const BoltCardDetails = () => {

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
        textLabel1: {
          color: colors.feeText,
        },
        manageFundsButton: {
          backgroundColor: colors.redText
        }
    });

    const [loading, setLoading] = useState(true);
    const [details, setDetails] = useState({});
    const [editMode, setEditMode] = useState(false);

    const [dayMax, setDayMax] = useState(0);
    const [txMax, setTxMax] = useState(0);

    const fetchCardDetails = async (w, reload = false) => {
        setLoading(true);
        w.getCardDetails(reload)
            .then(response => {
                console.log('CARD', response, response.day_limit_sats);
                setDetails(response);
                saveToDisk();
                setLoading(false);
            })
            .catch(err => {
                console.log('ERROR', err.message);
                alert(err.message);
                goBack();
            });
    }
    useEffect(() => {
        if(wallet) {
            fetchCardDetails(wallet);
        }
    }, [walletID]);

    useEffect(() => {
      if(details && details.tx_limit_sats) {
        setTxMax(details.tx_limit_sats);
      }
      if(details && details.day_limit_sats) {
        setDayMax(details.day_limit_sats);
      }
    }, [details]);

    const updateCard = () => {
      wallet.updateCard(dayMax, txMax).then(response => {
        console.log('UPDATE CARD RESPONSE ', response);
        fetchCardDetails(wallet, true);
        setEditMode(false);
      }).catch(err => {
        console.log('ERROR', err.message);
        alert(err.message);
      });
    }
    
    const cancelUpdate = () => {
      setDayMax(details.day_limit_sats);
      setTxMax(details.tx_limit_sats);
      setEditMode(false);
    }

    const enableCard = (enable) => {
      console.log('ENABLECARD', enable);
      wallet.enableCard(enable).then(response => {
        console.log('UPDATE CARD RESPONSE ', response);
        fetchCardDetails(wallet, true);
      }).catch(err => {
        console.log('ERROR', err.message);
        alert(err.message);
      });
    }
    
    return(
        <View style={[styles.root, stylesHook.root]}>
            <StatusBar barStyle="light-content" />
            <ScrollView contentContainerStyle={[styles.root, stylesHook.root]} keyboardShouldPersistTaps="always">
                <View style={styles.scrollBody}>
                    {loading ?
                        <BlueText>Loading....</BlueText> 
                    :
                        <>
                            {details && details.uid &&
                                <>
                                    <Text style={[styles.textLabel1, stylesHook.textLabel1]}>Card UID</Text>
                                    <BlueText>{details.uid}</BlueText>
                                </>
                            }
                            {details && details.day_limit_sats &&
                                <>
                                    <Text style={[styles.textLabel1, stylesHook.textLabel1]}>Day limit sats</Text>
                                    {editMode ?
                                      <BlueFormTextInput 
                                        keyboardType = 'numeric' 
                                        value={dayMax.toString()} 
                                        onChangeText={(value) => {
                                          var newVal = value.replace(/[^0-9]/, '');
                                          setDayMax(newVal);
                                        }}
                                      />
                                    :
                                      <BlueText>{details.day_limit_sats}</BlueText>
                                    }
                                </>
                            }
                            {details && details.tx_limit_sats &&
                                <>
                                    <Text style={[styles.textLabel1, stylesHook.textLabel1]}>Transaction limit sats</Text>
                                    {editMode
                                      ?
                                      <BlueFormTextInput 
                                        keyboardType = 'numeric' 
                                        value={txMax.toString()} 
                                        onChangeText={(value) => {
                                          var newVal = value.replace(/[^0-9]/, '');
                                          setTxMax(newVal);
                                        }}
                                      />
                                      :
                                      <BlueText>{details.tx_limit_sats}</BlueText>
                                    }
                                </>
                            }

                            {details && details.lnurlw_enable &&
                                <>
                                    <Text style={[styles.textLabel1, stylesHook.textLabel1]}>Card enabled</Text>
                                    <BlueText>
                                      {/* <ListItem.CheckBox checkedColor="#0070FF" checkedIcon="check" checked={details.lnurlw_enable == 'Y'} /> */}
                                      {details.lnurlw_enable == 'Y' ? 'Yes' : 'No'}
                                    </BlueText>
                                    { !wallet.getWipeData()
                                      && 
                                      <>
                                        {!editMode &&
                                          <View style={{marginTop: 10}}>
                                            {details.lnurlw_enable == 'Y' ? 
                                              <BlueButton
                                                title="Temporarily Disable Card"
                                                onPress={() => {
                                                  enableCard('false')
                                                }}
                                                backgroundColor={colors.redBG}
                                              />
                                            : 
                                              <BlueButton
                                                title="Enable Card"
                                                onPress={() => {
                                                  enableCard('true')
                                                }}
                                              />
                                            }
                                          </View>
                                        }
                                      </>

                                    }
                                </>
                            }
                            {
                              wallet.getWipeData()
                              ?
                              <BlueText style={{fontWeight: '700', marginTop: 30}}>THE CARD IS WIPED. Disconnect the card by clicking "Disconnect bolt card" button below</BlueText>
                              :
                                <>
                                  {editMode
                                    ?
                                    <View>
                                      <View style={{marginTop: 10}}>
                                        <BlueButton
                                          title="Save"
                                          onPress={updateCard}
                                        />
                                      </View>
                                      <View style={{marginTop: 5}}>
                                        <BlueButton
                                          title="Cancel"
                                          onPress={cancelUpdate}
                                          backgroundColor={colors.redBG}
                                        />
                                      </View>
                                    </View>
                                    :
                                    <View style={{marginTop: 5}}>
                                        <BlueButton
                                          title="Edit"
                                          onPress={() => setEditMode(true)}
                                        />
                                    </View>
                                  }
                                </>

                            }

                            {!editMode &&
                              <View style={{alignItems: 'center', marginTop: 30}}>
                                <TouchableOpacity accessibilityRole="button" onPress={() => {
                                  navigate('BoltCardCreateRoot', {
                                    screen: 'BoltCardDisconnect',
                                    params: {
                                      walletID: walletID,
                                    },
                                  });
                                }}
                                >
                                  <View style={[styles.manageFundsButton, stylesHook.manageFundsButton]}>
                                  <Image 
                                    source={(() => {
                                      return require('../../img/bolt-card-unlink_black.png');
                                    })()} style={{width: 40, height: 30, marginTop:20, marginLeft: 'auto', marginRight: 'auto'}}
                                  />
                                    <Text style={styles.manageFundsButtonText}>Disconnect Bolt Card</Text>
                                  </View>
                                </TouchableOpacity>
                              </View>
                            }
                        </>
                    }
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
      textLabel1: {
        fontWeight: '500',
        fontSize: 14,
        marginVertical: 12,
        writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
      },
      manageFundsButton: {
        marginTop: 14,
        marginBottom: 10,
        borderRadius: 9,
        minHeight: 39,
        alignSelf: 'flex-start',
        justifyContent: 'center',
        alignItems: 'center',
      },
      manageFundsButtonText: {
        color:'#000',
        fontWeight: '500',
        fontSize: 14,
        padding: 12,
      },
});

BoltCardDetails.navigationOptions = navigationStyle(
{
    closeButton: true,
    headerHideBackButton: true,
},
opts => ({ ...opts, title: "Bolt Card Details" }),
);

export default BoltCardDetails;