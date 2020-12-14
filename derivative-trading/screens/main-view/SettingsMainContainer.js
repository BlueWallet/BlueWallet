import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { View, Text, StyleSheet, TextInput } from 'react-native';
import { BlueLoading } from '../../../BlueComponents';
import RestApiClient from '../../class/RestApiClient';
import { useReachability } from 'react-native-watch-connectivity';

const BlueApp = require('../../../BlueApp');

const SettingsMainContainer = ({ route: {
    params: {
        wallet: wallet
    }
} }) => {
    const [isLoadingUserData, setIsLoadingUserData] = useState(true);
    const [userData, setUserData] = useState([]);

    useEffect(() => {
        if (wallet !== null) {
            fetchUserData()
        }
    }, [wallet])

    async function fetchUserData() {
        setIsLoadingUserData(true);
        let savedData = await BlueApp.getKolliderUserData(wallet);
        savedData = JSON.parse(savedData);
        console.log(savedData)
        let restClient = new RestApiClient({ apiKey: savedData.token});
        let whoami = await restClient.whoAmI();
        let balances = await restClient.fetchBalances();
        let uD = {
            uid: whoami.id,
            apiKey: savedData.token,
            balances,
        };
        setUserData(uD);
        setIsLoadingUserData(false);
    }

    const SectionBody = () => {
        if (isLoadingUserData) {
            return <BlueLoading paddingTop={40} paddingBottom={40} />;
        } else {
            return (
                <View style={styles.rootContainer}>
                    <Text style={styles.itemLabel}> UID:</Text>
                    <TextInput
                        style={{ color: 'white' }}
                        numberOfLines={1}
                        value={userData.uid.toString()}
                    />
                    <Text style={styles.itemLabel}> API_KEY:</Text>
                    <TextInput
                        multiline={true}
                        style={{ borderColor: 'gray', borderWidth: 1, color: 'white' }}
                        numberOfLines={5}
                        value={userData.apiKey}
                    />
                    <Text style={styles.itemLabel}> BALANCES:</Text>
                    <Text style={styles.itemLabel}> Cash: {userData.balances.cash} </Text>
                    <Text style={styles.itemLabel}> Isolated: {userData.balances.isolated_margin}</Text>
                    <Text style={styles.itemLabel}> Cross: {userData.balances.cross_margin}</Text>
                </View>
            )
        }
    };

    return (
        <View>
            <SectionBody />
        </View>
    );
};

SettingsMainContainer.navigationOptions = ({ navigation }) => ({
    headerTitle: () => {
        return (
            <View style={[styles.headerIcon, { left: Platform.OS === 'ios' ? 0 : -24 }]}>
                <Text style={{ color: 'white', fontSize: 16 }}>Settings</Text>
            </View>
        )
    },
    headerStyle: {
        backgroundColor: 'black',
        borderBottomWidth: 0,
        elevation: 0,
        shadowOffset: { height: 0, width: 0 },
    },
    headerTintColor: '#FFFFFF',
    headerBackTitleVisible: false,
});

const styles = StyleSheet.create({
    navHeaderTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: 'white',
        textAlign: 'center',
        justifyContent: 'center',
    },
    itemLabel: {
        color: 'white',
    },
    headerIcon: {
        alignItems: 'center',
        textAlign: 'center',
        marginTop: 10,
    },
    rootContainer: {
        backgroundColor: 'black',
        height: '100%'
    },
});

SettingsMainContainer.propTypes = {
    style: PropTypes.object,
    apiKey: PropTypes.string.isRequired,
};

SettingsMainContainer.defaultProps = {
    style: {},
    userData: {
        uid: 0,
        apiKey: 'None'
    },
    isLoadingUserData: true,
};

export default SettingsMainContainer;