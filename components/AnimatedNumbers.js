import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import Animated, { Easing } from 'react-native-reanimated';
import PropTypes from 'prop-types';

const NUMBERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const usePrevious = value => {
  const ref = React.useRef();
  React.useEffect(() => {
    ref.current = value;
  });

  if (typeof ref.current === 'undefined') {
    return 0;
  }

  return ref.current;
};

const AnimatedNumber = ({ animateToNumber, fontStyle, animationDuration, easing, prefixText, suffixText }) => {
  const prevNumber = usePrevious(animateToNumber);
  const animateToNumberString = String(animateToNumber);
  const prevNumberString = String(prevNumber);

  const animateToNumbersArr = Array.from(animateToNumberString, x => {
    if (isNaN(x)) {
      return String(x);
    } else {
      return Number(x);
    }
  });
  const prevNumberersArr = Array.from(prevNumberString, x => {
    if (isNaN(x)) {
      return String(x);
    } else {
      return Number(x);
    }
  });

  const [numberHeight, setNumberHeight] = React.useState(36);
  const animations = animateToNumbersArr.map((__, index) => {
    if (typeof prevNumberersArr[index] !== 'number') {
      return new Animated.Value(0);
    }

    const animationHeight = -1 * (numberHeight * prevNumberersArr[index]);
    return new Animated.Value(animationHeight);
  });

  const setButtonLayout = e => {
    setNumberHeight(e.nativeEvent.layout.height);
  };

  React.useEffect(() => {
    animations.map((animation, index) => {
      if (typeof animateToNumbersArr[index] !== 'number') {
        return;
      }
      Animated.timing(animation, {
        toValue: -1 * (numberHeight * animateToNumbersArr[index]),
        duration: animationDuration || 1400,
        useNativeDriver: true,
        easing: easing || Easing.elastic(1.2),
      }).start();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animateToNumber, numberHeight]);

  const getTranslateY = index => {
    return animations[index];
  };

  return (
    <>
      {numberHeight !== 0 && (
        <View style={styles.flexDirectionRow}>
          <Text adjustsFontSizeToFit style={[fontStyle, { height: numberHeight }]}>
            {prefixText}
          </Text>
          {animateToNumbersArr.map((n, index) => {
            if (typeof n === 'string') {
              return (
                <Text adjustsFontSizeToFit key={index} style={[fontStyle, { height: numberHeight }]}>
                  {n}
                </Text>
              );
            }

            return (
              <View key={index} style={[{ height: numberHeight }, styles.overFlowHidden]}>
                <Animated.View
                  style={[
                    {
                      transform: [
                        {
                          translateY: getTranslateY(index),
                        },
                      ],
                    },
                  ]}
                >
                  {NUMBERS.map((number, i) => (
                    <View style={styles.flexDirectionRow} key={i}>
                      <Text adjustsFontSizeToFit style={fontStyle}>
                        {number}
                      </Text>
                    </View>
                  ))}
                </Animated.View>
              </View>
            );
          })}
          <Text> </Text>
          <Text adjustsFontSizeToFit style={[fontStyle, { height: numberHeight }]}>
            {suffixText}
          </Text>
        </View>
      )}

      <Text adjustsFontSizeToFit style={[fontStyle, styles.numberText]} onLayout={setButtonLayout}>
        {0}
      </Text>
    </>
  );
};

const styles = StyleSheet.create({
  flexDirectionRow: { flexDirection: 'row' },
  overFlowHidden: { overflow: 'hidden' },
  numberText: { position: 'absolute', top: -999999 },
});

export default AnimatedNumber;
AnimatedNumber.propTypes = {
  animateToNumber: PropTypes.any,
  fontStyle: PropTypes.array,
  animationDuration: PropTypes.number,
  easing: PropTypes.bool,
  suffixText: PropTypes.string,
  prefixText: PropTypes.string,
};
