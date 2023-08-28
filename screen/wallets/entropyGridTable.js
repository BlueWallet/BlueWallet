import React, { Component, useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Text } from 'react-native';
import { Table, TableWrapper, Row, Cell } from 'react-native-table-component';

export default class EntropyGridTable extends Component {
  render() {
    const cellWith = 50;
    const colHeadData = ['', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];
    const colHeadWidthArr = Array(17).fill(cellWith);
    const rowHeadData = Array(128)
      .fill(0)
      .map((_, i) => String(i + 1).padStart(3, '0'));
    const cellData = this.props.cellsData.reduce((a, c, i) => {
      if (i % 16 === 0) {
        a.push([c]);
      } else {
        a[Math.floor(i / 16)].push(c);
      }

      return a;
    }, []);

    return (
      <View style={styles.container}>
        <ScrollView horizontal={true}>
          <View>
            <Table borderStyle={styles.table}>
              <Row data={colHeadData} widthArr={colHeadWidthArr} style={styles.header} textStyle={styles.text} />
            </Table>
            <ScrollView style={styles.dataWrapper}>
              <Table borderStyle={styles.table}>
                {cellData.map((r, i) => (
                  <TableWrapper key={i} style={styles.wrapper}>
                    <Cell key={`r-${i}-c-0`} data={rowHeadData[i]} style={{ width: cellWith }} textStyle={styles.text} />
                    {r.map((c, j) => (
                      <Cell
                        key={`r-${i}-c-${j + 1}`}
                        data={<CellElement data={c} pattern={this.props.pattern} setPattern={this.props.setPattern} />}
                        style={{ width: cellWith }}
                        textStyle={styles.text}
                      />
                    ))}
                  </TableWrapper>
                ))}
              </Table>
            </ScrollView>
          </View>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
    backgroundColor: '#fff',
  },
  header: {
    height: 25,
    backgroundColor: '#fff',
  },
  text: {
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#333',
  },
  dataWrapper: {
    marginTop: 0,
  },
  wrapper: {
    flexDirection: 'row',
  },
  table: {
    borderWidth: 1, 
    borderColor: '#C1C0B9',
  }
});

const CellElement = ({ data, pattern, setPattern }) => {
  const [isChange, setIsChange] = useState(false);
  const [bgColor, setBgColor] = useState('#fff');

  useEffect(() => {
    setBgColor(isChange ? '#ff7300' : '#fff');
  }, [isChange]);

  const handleCellPress = () => {
    const dataIndex = Object.keys(pattern).findIndex(x => x === data);
    if (dataIndex === -1) {
      pattern[data] = setIsChange
      setPattern(pattern)
      setIsChange(true)
    }
  };

  return (
    <TouchableOpacity style={{ backgroundColor: bgColor }} onPress={() => data && handleCellPress()}>
      <View style={styles.text}>
        <Text>{data}</Text>
      </View>
    </TouchableOpacity>
  );
};
