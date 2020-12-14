import * as shape from 'd3-shape';
import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { LineChart } from 'react-native-svg-charts';


export default class SparkLine extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            data: [],
            showVLine: false,
        }
        this.dimensions = Dimensions.get('window');
        this.calcMeanReturn = this.calcMeanReturn.bind(this);
        this.onLoadData = this.onLoadData.bind(this);
    }

    calcMeanReturn() {
        let meanReturn = this.props.data.map((item) => {
            return item.mean / 100
        }).reduce((a, b) => a + b, 0) / this.props.data.length;
        return meanReturn
    }

    onLoadData() {
        // this.setState({ data: index_values_response })
    }

    onChartInteraction(e) {
        if (e.nativeEvent.state == 5) {
            this.setState({ showVLine: false })
        }
        else {
            this.setState({ showVLine: true })
        }
    }

    calcColor() {
        const dataLength = this.props.data.length;
        if (this.props.data[0].mean > this.props.data[dataLength - 1].mean) {
            return 'rgb(189, 44, 30)'
        } else {
            return 'rgb(0, 204, 102)'
        }
    }

    render() {
        let chartColor = this.calcColor();
        return (
            <View>
                <View style={styles.mainContainer}>
                    {
                        this.props.data.length !== 0 && (
                            <LineChart
                                onPress={(event) => { console.log(event) }}
                                style={{ height: 40, width: 70 }}
                                data={this.props.data.map((items) => {
                                    return items.mean / 100
                                })}
                                contentInset={{ top: 5, bottom: 5 }}

                                curve={shape.curveNatural}
                                svg={{ stroke: chartColor, strokeWidth: 2 }}
                                animate={true}
                                animationDuration={200}
                            >
                            </LineChart>
                        )
                    }
                </View>
            </View>
        )

    }
}

const styles = StyleSheet.create({
    mainContainer: {
        padding: 0,
        backgroundColor: 'black',
    },
    button: {
        backgroundColor: 'white',
        color: 'white',
    }
});