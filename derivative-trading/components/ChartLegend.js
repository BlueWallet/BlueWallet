import React from 'react';
import { StyleSheet, Text, View, Image } from 'react-native'
import { getPairFromSymbol } from '../class/Utils';

class ChartLegend extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            elements: [
                { symbol: 'ETHUSD', color: 'purple' },
                { symbol: 'LTCUSD', color: 'grey' },
                { symbol: 'XBTUSD', color: 'orange' },
            ]
        }
        this.renderLegend = this.renderLegend.bind(this);
    }

    renderLegend() {
        let legend = this.state.elements.map(element => (
            <View>
                <View style={styles.bulletPoint}></View>
                <View>
                    <Text>
                        {element.symbol}
                    </Text>
                </View>
            </View>
        ))
        return legend
    }


    render() {
        return (
            <View style={styles.legendMainContainer}>
                {
                    this.props.elements.map(element => {
                        return (
                            <View style={styles.legendElementContainer}>
                                {/* <View style={styles.bulletPoint} backgroundColor={element.color}></View> */}
                                <Image source={element.avatarImage} style={styles.legendItemImage}/>
                                <View>
                                    <Text style={styles.legendText}>
                                        {getPairFromSymbol(element.symbol)}
                                    </Text>
                                </View>
                            </View>
                        )
                    })
                }
            </View>
        )
    }
}

const styles = StyleSheet.create({
    legendMainContainer: {
        marginTop: 10,
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },

    legendElementContainer: {
        marginLeft: 0,
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },

    legendText: {
        textAlign: 'center'
    },

    legendItemImage: {
        height: 25,
        width: 25,
    },

    bulletPoint: {
        width: 20,
        height: 20,
        borderRadius: 100 / 2,
        // backgroundColor: 'red'
    }
});

export default ChartLegend;