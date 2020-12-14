import React from 'react';
import { View, StyleSheet, ActivityIndicator, Text} from 'react-native'


const FullViewLoader = ({ message }) => {
    return (
        <View style={styles.mainContainer}>
            <ActivityIndicator size={'large'} color={'#5d5dff'}></ActivityIndicator>
            <Text style={styles.inidicatorText}>Settling...</Text>
        </View>
    )
    
}

export default FullViewLoader

const styles = StyleSheet.create({
    mainContainer: {
        height: '100%',
        width: '100%',
        justifyContent: 'center',
        position: 'absolute',
        zIndex: 999,
        backgroundColor: 'rgba(10, 10, 10, 0.8)'
    },
    inidicatorText: {
        color: 'white',
        textAlign: 'center',
        marginTop: 20,
        fontSize: 28
    }
})