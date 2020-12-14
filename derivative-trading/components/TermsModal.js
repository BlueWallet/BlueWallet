import React from 'react';
import Modal from 'react-native-modal';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

const TCModal = ({ isVisible, onAccept, onDecline }) => {
    return (
        <View>
            <Modal isVisible={isVisible} style={styles.modalStyle}>
                <ScrollView>
                    <View style={styles.mainContainer}>
                        <Text style={styles.mainHeading}>Important Notice</Text>
                        <View style={styles.mainBody}>
                            <Text style={styles.paragraph}>Kollider and its affiliates are not authorised or regulated by the UK Financial Conduct Authority. Nothing on this
                            service is intended to constitude the marketing or promotion of Kollider services. By using Kollider services (including this integration)
                            you acknowledge that:
                        </Text>
                            <Text style={styles.listItem}>
                                1. You are doing so on the basis of your own enquiry, without solicitation or inducement by Kollider;
                        </Text>
                            <Text style={styles.listItem}>
                                2. Consumer protections under UK financial services or other regulations do not apply to services provided by Kollider because it is not regulated in the UK; and
                        </Text>
                            <Text style={styles.listItem}>
                                3. You have satisfied yourself that you have the necessary knowledge and experience to understand the risks involved.
                        </Text>
                        </View>
                    </View>
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.accept]}
                            onPress={onAccept}
                        >
                            <Text style={styles.buttonText}>Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.button, styles.decline]}
                            onPress={onDecline}
                        >
                            <Text style={styles.buttonText}>Decline</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
    },
    modalStyle: {
        backgroundColor: 'white',
        borderRadius: 10,
        marginBottom: 80,
        marginTop: 80,
    },
    mainHeading: {
        textAlign: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        fontSize: 24,
        width: '100%',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    button: {
        width: 125,
        height: 40,
        borderRadius: 20,
        margin: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
    },
    mainBody: {
        flex: 1,
        padding: 35,
    },
    paragraph: {
        fontSize: 16,
    },
    listItem: {
        marginTop: 10,
        fontSize: 16,
    },
    decline: {
        backgroundColor: 'rgb(189, 44, 30)',
    },
    accept: {
        backgroundColor: 'rgb(0, 204, 102)',
    }
})

export default TCModal;