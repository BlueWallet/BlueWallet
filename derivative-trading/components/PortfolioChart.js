import React from 'react'
import { PieChart } from 'react-native-svg-charts'
import { Circle, G, Line } from 'react-native-svg'
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';


class PortfolioChart extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            selectedSlice: {
                label: '',
                value: 0
            },
            labelWidth: 100
        }
        this.unselectSlice = this.unselectSlice.bind(this);
    }

    unselectSlice() {
        this.setState({ selectedSlice: { label: '', value: 0 } })
    }

    render() {
        const { labelWidth, selectedSlice } = this.state;
        const { label, value } = selectedSlice;
        // const randomColor = () => ('#' + ((Math.random() * 0xffffff) << 0).toString(16) + '000000').slice(0, 7)
        const emptyData = [{ value: 100, svg: { fill: 'grey', fillOpacity: '.25' } }];

        const pieData = this.props.data
            .filter(item => item.value > 0)
            .map(value => ({
                value: value.value,
                svg: {
                    fill: value.color,
                    onPress: () => {
                        console.log('press', value.currencyPair)
                        this.setState({ selectedSlice: { label: value.currencyPair, value: value.value } })
                    }
                },
                key: `pie-${value.currencyPair}`,
                arc: {
                    outerRadius: selectedSlice.label === value.currencyPair ? '110%' : '100%',
                    padAngle: selectedSlice.label === value.currencyPair ? 0.15 : 0.05
                },
            }))

        let data = pieData.length > 0 ? pieData : emptyData;
        const deviceWidth = Dimensions.get('window').width
        let mainValue = this.props.mainGaugeValue ? this.props.mainGaugeValue.toFixed(0): 0;
        return (
            <View styles={{ justifyContent: 'center', flex: 1, height: 250 }}>
                <TouchableOpacity onPress={this.unselectSlice}>
                    <PieChart style={{ height: 200 }} data={data} innerRadius={'60%'} outerRadius={'90%'} >
                    </PieChart>
                    <Text
                        onLayout={({ nativeEvent: { layout: { width } } }) => {
                            this.setState({ labelWidth: width });
                        }}
                        style={{
                            position: 'absolute',
                            left: deviceWidth / 2 - labelWidth / 2,
                            top: 60,
                            textAlign: 'center',
                            fontWeight: '700',
                        }}>
                        {`${"Total Value:"} \n`}
                    </Text>
                    <Text
                        style={{
                            position: 'absolute',
                            alignItems: 'center',
                            width: '100%',
                            top: 80,
                            textAlign: 'center',
                            fontWeight: '300',
                            fontSize: 32
                        }}>
                        {`${mainValue || 0}`}
                    </Text>

                </TouchableOpacity>
            </View>
        )
    }
}

const styles = StyleSheet.create({
    totalPnlPortfolioText: {
        textAlign: 'center',
    }
});


export default PortfolioChart;