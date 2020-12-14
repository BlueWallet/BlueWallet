import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Icon } from 'react-native-elements';
import { formatCurrencyValue } from '../class/Utils';

import PriceChart from './PriceChart';

const BalanceChartView = ({ chart }) => {

    const [cursorValue, setCursorValue] = useState(0);
    const [isCursorActive, setIsCursorActive] = useState(false);
    const [isUp, setIsUp] = useState(false);
    const [valueChange, setValueChange] = useState({ value: 0, percentage: 0 })
    const [cursorCounter, setCursorCounter] = useState(0);

    useEffect(() => {
        setIsUp(chart.open < chart.close)
        let dif = chart.close - chart.open;
        let change = {
            value: Math.abs(dif.toFixed(2)),
            percentage: Math.abs((dif / chart.open) * 100).toFixed(2)
        }
        setValueChange(change)
        setCursorValue(chart.close.toFixed(2));
    }, [chart])

    // function onCursorChange(data) {
    //     let value = data.toFixed(2);
    //     if (cursorCounter > 2) {
    //         setCursorValue(value.toFixed(2))
    //     }
    // }

    // function onCursorRelease(isReleased, data) {
    //     let counter = cursorCounter + 1;
    //     setCursorCounter(counter)
    //     setIsCursorActive(!isReleased);
    //     if (isReleased) {
    //         setCursorValue(chart.close.toFixed(2));
    //     }

    // }

    const SubHeading = () => {
        let color = isUp ? 'rgb(0, 204, 102)' : 'rgb(189, 44, 30)';
        let arrow = isUp ? 'arrow-up-left' : 'arrow-down-left';
        let sign = isUp ? '+' : '-';
        return (
            <View style={styles.subHeading}>
                <Icon
                    name={arrow}
                    type='feather'
                    color={color}
                    size={15}
                    style={{ transform: [{ rotate: '0deg' }], marginRight: 0, padding: 4 }}
                ></Icon>
                <Text style={[styles.changeText, { color }]}>{sign} ${valueChange.value} ({valueChange.percentage}%) Today</Text>
            </View>
        )
    }

    const ValueGauge = ({ value }) => (
        <View style={styles.mainContainer}>
            <Text style={styles.heading}>Bitcoin</Text>
            <View style={styles.valueSection}>
                <Text style={styles.valueText}>
                    <Text style={styles.unitText}>$</Text>
                    {formatCurrencyValue(value)}
                </Text>
            </View>
            <SubHeading />
        </View>
    )

    return (
        <View>
            <ValueGauge value={cursorValue} />
            <PriceChart data={chart.data} />
        </View>
    )
}

const styles = StyleSheet.create({
    heading: {
        color: 'white',
        marginLeft: 20,
    },
    valueSection: {
        flexDirection: 'row',
        marginLeft: 20,
    },
    valueText: {
        color: 'white',
        fontSize: 42,
    },
    unitText: {
        color: 'white',
        fontSize: 24,
    },
    mainContainer: {
    },
    subHeading: {
        marginLeft: 20,
        flexDirection: 'row',
    },
    changeText: {
        fontSize: 15,
        color: 'white'
    }
})

export default BalanceChartView;