import React, { forwardRef, ReactNode, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Animated,
  PixelRatio,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  StyleProp,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './themes';
import { useSizeClass, SizeClass } from '../blue_modules/sizeClass';
import { isDesktop } from '../blue_modules/environment';

const LAYOUT = {
  PADDINGS: 30,
  ICON_MARGIN: 7,
  BUTTON_MARGIN: 10,
  MIN_BUTTON_WIDTH: 100,
  MIN_BUTTON_WIDTH_LARGE: 130,
  DRAWER_WIDTH: 320,
  BUTTON_HEIGHT: 52,
  SINGLE_BUTTON_HEIGHT: 58,
  CONTAINER_SIDE_MARGIN: 16,
  DEFAULT_BORDER_RADIUS: 8,
  SINGLE_BUTTON_RADIUS: 29,
  SINGLE_BUTTON_WIDTH_FACTOR: 0.625,
  MAX_BUTTON_FONT_SIZE: 24,
  SAFETY_MARGIN: 20,
};

const BUTTON_ACTIVE_OPACITY = 0.82;

const computeAvailableWidth = (width: number, sizeClass: SizeClass) => {
  const drawerOffset = sizeClass === SizeClass.Large ? LAYOUT.DRAWER_WIDTH : 0;
  return Math.max(0, width - drawerOffset - LAYOUT.CONTAINER_SIDE_MARGIN * 2);
};

const useSlideInAnimation = (initialHeight: number) => {
  // Slide is a once-per-mount animation: capture height on first render and never react to subsequent
  // height changes (Android navigation transitions can re-emit height, which would yank the buttons
  // off-screen mid-spring).
  const slideAnimation = useRef(new Animated.Value(isDesktop ? 0 : initialHeight)).current;

  useEffect(() => {
    if (isDesktop) return;
    Animated.spring(slideAnimation, {
      toValue: 0,
      friction: 7,
      tension: 40,
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return slideAnimation;
};

const useFloatButtonLayout = (width: number, sizeClass: SizeClass) => {
  const lastVerticalDecision = useRef(false);

  const shouldUseVerticalLayout = useCallback(
    (totalWidthNeeded: number, availableWidth: number, totalChildren: number) => {
      if (sizeClass !== SizeClass.Large || totalChildren <= 1) return false;

      const minWidthPerButton = 130;
      const totalButtonsWidth = minWidthPerButton * totalChildren;
      const totalSpacing = LAYOUT.BUTTON_MARGIN * (totalChildren - 1);
      const minRequiredWidth = totalButtonsWidth + totalSpacing;

      const wouldBeTooNarrow = availableWidth < minRequiredWidth;

      if (!lastVerticalDecision.current && wouldBeTooNarrow) {
        const shouldSwitch = availableWidth < minRequiredWidth * 0.9;
        lastVerticalDecision.current = shouldSwitch;
        return shouldSwitch;
      }

      if (lastVerticalDecision.current && !wouldBeTooNarrow) {
        const shouldSwitchBack = availableWidth > minRequiredWidth * 1.2;
        lastVerticalDecision.current = !shouldSwitchBack;
        return !shouldSwitchBack;
      }

      return lastVerticalDecision.current;
    },
    [sizeClass],
  );

  const calculateButtonWidth = useCallback(
    (containerWidth: number, totalChildren: number): number => {
      if (containerWidth <= 0) return 0;

      const availableWidth = computeAvailableWidth(width, sizeClass);

      const contentWidth = Math.ceil(containerWidth);
      const buttonWidth = contentWidth + LAYOUT.PADDINGS * 2;
      const totalButtonWidth = buttonWidth * totalChildren;
      const totalSpacersWidth = (totalChildren - 1) * LAYOUT.BUTTON_MARGIN;
      const totalWidthNeeded = totalButtonWidth + totalSpacersWidth + LAYOUT.SAFETY_MARGIN;

      const effectiveMinButtonWidth =
        sizeClass === SizeClass.Large
          ? LAYOUT.MIN_BUTTON_WIDTH_LARGE
          : sizeClass === SizeClass.Regular
            ? LAYOUT.MIN_BUTTON_WIDTH
            : LAYOUT.MIN_BUTTON_WIDTH * 0.85;

      const shouldBeVertical = shouldUseVerticalLayout(totalWidthNeeded, availableWidth, totalChildren);

      let calculatedWidth;

      if (shouldBeVertical) {
        calculatedWidth = sizeClass === SizeClass.Large ? availableWidth - LAYOUT.CONTAINER_SIDE_MARGIN * 2 : availableWidth;
      } else {
        if (totalWidthNeeded > availableWidth) {
          const availableWidthPerButton = (availableWidth - totalSpacersWidth) / totalChildren;
          calculatedWidth = Math.floor(availableWidthPerButton) - LAYOUT.PADDINGS * 2;
        } else {
          calculatedWidth = Math.max(contentWidth, effectiveMinButtonWidth);
        }
      }

      if (totalChildren === 1 && !shouldBeVertical) {
        const singleButtonMaxWidth = availableWidth * (sizeClass === SizeClass.Compact ? 0.7 : LAYOUT.SINGLE_BUTTON_WIDTH_FACTOR);
        const effectiveSingleMinWidth = sizeClass === SizeClass.Large ? LAYOUT.MIN_BUTTON_WIDTH * 1.2 : LAYOUT.MIN_BUTTON_WIDTH;

        calculatedWidth = Math.max(
          effectiveSingleMinWidth - LAYOUT.PADDINGS * 2,
          Math.min(calculatedWidth, singleButtonMaxWidth - LAYOUT.PADDINGS * 2),
        );
      }

      return Math.floor(calculatedWidth);
    },
    [width, sizeClass, shouldUseVerticalLayout],
  );

  const calculateVisualParameters = useCallback(
    (calculatedWidth: number, totalChildren: number) => {
      const availableWidth = computeAvailableWidth(width, sizeClass);

      const buttonWidth = Math.max(calculatedWidth, LAYOUT.MIN_BUTTON_WIDTH_LARGE) + LAYOUT.PADDINGS * 2;
      const totalButtonWidth = buttonWidth * totalChildren;
      const totalSpacersWidth = (totalChildren - 1) * LAYOUT.BUTTON_MARGIN;
      const totalWidthNeeded = totalButtonWidth + totalSpacersWidth;

      const shouldBeVertical = shouldUseVerticalLayout(totalWidthNeeded, availableWidth, totalChildren);

      let buttonRadius;
      if (totalChildren === 1) {
        buttonRadius = LAYOUT.SINGLE_BUTTON_RADIUS;
      } else {
        buttonRadius = Math.min(LAYOUT.DEFAULT_BORDER_RADIUS * 1.5, calculatedWidth / 12);
      }

      const multiButtonRadius = Math.max(LAYOUT.DEFAULT_BORDER_RADIUS, Math.floor(buttonRadius));
      const singleButtonRadius = LAYOUT.SINGLE_BUTTON_RADIUS;

      return { buttonRadius: multiButtonRadius, singleButtonRadius, shouldBeVertical };
    },
    [width, sizeClass, shouldUseVerticalLayout],
  );

  const calculateContainerHeight = useCallback((childrenCount: number, isVerticalLayout: boolean) => {
    if (!isVerticalLayout) return { height: '8%', minHeight: LAYOUT.BUTTON_HEIGHT };

    const totalButtonsHeight = childrenCount * LAYOUT.BUTTON_HEIGHT;
    const totalMarginsHeight = (childrenCount - 1) * LAYOUT.BUTTON_MARGIN;
    const calculatedHeight = totalButtonsHeight + totalMarginsHeight;

    return { height: calculatedHeight };
  }, []);

  const calculateButtonFontSize = useMemo(() => {
    const divisor = sizeClass === SizeClass.Large ? 22 : sizeClass === SizeClass.Regular ? 24 : 28;
    const baseSize = PixelRatio.roundToNearestPixel(width / divisor);
    return Math.min(LAYOUT.MAX_BUTTON_FONT_SIZE, baseSize);
  }, [width, sizeClass]);

  return {
    calculateButtonWidth,
    calculateVisualParameters,
    calculateContainerHeight,
    buttonFontSize: calculateButtonFontSize,
  };
};

const containerStyles = StyleSheet.create({
  root: {
    alignSelf: 'center',
    height: '8%',
    minHeight: LAYOUT.BUTTON_HEIGHT,
    marginHorizontal: LAYOUT.CONTAINER_SIDE_MARGIN,
  },
  rootAbsolute: {
    position: 'absolute',
  },
  rootInline: {},
  rootPre: {
    position: 'absolute',
    bottom: -1000,
  },
  rootPost: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
  rootPostVertical: {
    flexDirection: 'column',
    overflow: 'hidden',
  },
  childWrapper: {
    width: '100%',
  },
});

const buttonStyles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 24,
    minHeight: 24,
    overflow: 'visible',
    alignSelf: 'center',
  },
  centeredText: {
    textAlign: 'center',
    textAlignVertical: 'center',
  },
});

const buttonContentStaticStyles = StyleSheet.create({
  root: {
    height: LAYOUT.BUTTON_HEIGHT,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  rootSingle: {
    height: LAYOUT.SINGLE_BUTTON_HEIGHT,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  marginRight: {
    marginRight: LAYOUT.BUTTON_MARGIN,
  },
  marginBottom: {
    marginBottom: LAYOUT.BUTTON_MARGIN,
  },
  textBase: {
    fontWeight: '600',
    marginLeft: LAYOUT.ICON_MARGIN,
    backgroundColor: 'transparent',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
});

interface FContainerProps {
  children: ReactNode | ReactNode[];
  inline?: boolean;
}

interface FButtonProps {
  text: string;
  icon: ReactNode;
  width?: number;
  last?: boolean;
  singleChild?: boolean;
  isVertical?: boolean;
  borderRadius?: number;
  fontSize?: number;
  disabled?: boolean;
  testID?: string;
  onPress: () => void;
  onLongPress?: () => void;
}

interface ButtonContentProps {
  icon: ReactNode;
  text: string;
  textStyle: StyleProp<TextStyle>;
}

const ButtonContent = ({ icon, text, textStyle }: ButtonContentProps) => {
  const computedStyle = StyleSheet.flatten(textStyle);
  const fontSize = computedStyle.fontSize || LAYOUT.MAX_BUTTON_FONT_SIZE;
  const iconSize = Math.max(Math.round(Number(fontSize) * 1.2), 16);

  const scaledIcon = React.isValidElement(icon)
    ? React.cloneElement(icon as React.ReactElement<any>, { size: iconSize, width: iconSize, height: iconSize })
    : icon;

  return (
    <View style={buttonContentStaticStyles.contentContainer}>
      <View style={buttonStyles.iconContainer}>{scaledIcon}</View>
      <Text numberOfLines={1} adjustsFontSizeToFit style={[textStyle, buttonStyles.centeredText, { lineHeight: fontSize * 1.2 }]}>
        {text}
      </Text>
    </View>
  );
};

export const FButton = ({
  text,
  icon,
  width,
  last,
  singleChild,
  isVertical,
  borderRadius = LAYOUT.DEFAULT_BORDER_RADIUS,
  fontSize = LAYOUT.MAX_BUTTON_FONT_SIZE,
  testID,
  ...props
}: FButtonProps) => {
  const { colors } = useTheme();

  const sizeStyle: ViewStyle | null = !width
    ? null
    : {
        paddingHorizontal: LAYOUT.PADDINGS,
        width:
          singleChild && !isVertical
            ? width * LAYOUT.SINGLE_BUTTON_WIDTH_FACTOR + LAYOUT.PADDINGS * 2
            : isVertical
              ? '100%'
              : width + LAYOUT.PADDINGS * 2,
      };

  const marginStyle = last ? null : isVertical ? buttonContentStaticStyles.marginBottom : buttonContentStaticStyles.marginRight;

  const textStyle = [
    buttonContentStaticStyles.textBase,
    props.disabled ? { color: colors.formBorder } : { color: colors.buttonAlternativeTextColor, fontSize },
  ];

  return (
    <TouchableOpacity
      accessibilityLabel={text}
      accessibilityRole="button"
      testID={testID}
      activeOpacity={BUTTON_ACTIVE_OPACITY}
      style={[
        buttonStyles.root,
        singleChild ? buttonContentStaticStyles.rootSingle : buttonContentStaticStyles.root,
        { backgroundColor: colors.buttonBackgroundColor },
        sizeStyle,
        marginStyle,
        { borderRadius },
      ]}
      {...props}
    >
      <ButtonContent icon={icon} text={text} textStyle={textStyle} />
    </TouchableOpacity>
  );
};

export const FContainer = forwardRef<View, FContainerProps>((props, ref) => {
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const { sizeClass } = useSizeClass();

  const childrenCount = React.Children.toArray(props.children).filter(Boolean).length;

  const initialLayoutWidth = useMemo(() => Math.ceil(computeAvailableWidth(width, sizeClass)), [width, sizeClass]);

  const { calculateButtonWidth, calculateVisualParameters, calculateContainerHeight, buttonFontSize } = useFloatButtonLayout(
    width,
    sizeClass,
  );

  // Compute initial geometry synchronously so frame 1 already has the correct button width and
  // border radius — eliminates the frame-1 → frame-2 width snap.
  const initialGeometry = useMemo(() => {
    const w = calculateButtonWidth(initialLayoutWidth, childrenCount);
    const v = calculateVisualParameters(w, childrenCount);
    return { width: w, ...v };
  }, [calculateButtonWidth, calculateVisualParameters, initialLayoutWidth, childrenCount]);

  const [newWidth, setNewWidth] = useState<number>(() => initialGeometry.width);
  const [isVertical, setIsVertical] = useState<boolean>(() => initialGeometry.shouldBeVertical);
  const [layoutReady, setLayoutReady] = useState<boolean>(() => initialLayoutWidth > 0);
  const [buttonBorderRadius, setButtonBorderRadius] = useState<number>(() => initialGeometry.buttonRadius);
  const [singleButtonBorderRadius, setSingleButtonBorderRadius] = useState<number>(() => initialGeometry.singleButtonRadius);

  const latest = useRef({ newWidth, isVertical, buttonBorderRadius, singleButtonBorderRadius });
  latest.current = { newWidth, isVertical, buttonBorderRadius, singleButtonBorderRadius };

  const layoutWidth = useRef<number>(initialLayoutWidth);

  const slideAnimation = useSlideInAnimation(height);

  useEffect(() => {
    if (!layoutReady || layoutWidth.current <= 0) return;

    const id = requestAnimationFrame(() => {
      const calculatedWidth = calculateButtonWidth(layoutWidth.current, childrenCount);
      const { buttonRadius, singleButtonRadius, shouldBeVertical } = calculateVisualParameters(calculatedWidth, childrenCount);

      const prev = latest.current;
      const widthDelta = Math.abs(prev.newWidth - calculatedWidth);
      const buttonRadiusDelta = Math.abs(buttonRadius - prev.buttonBorderRadius);
      const singleRadiusDelta = Math.abs(singleButtonRadius - prev.singleButtonBorderRadius);

      const widthEps = childrenCount === 1 ? 1 : 2;
      const radiusEps = 0.5;
      if (shouldBeVertical === prev.isVertical) {
        const radiusDelta = childrenCount === 1 ? singleRadiusDelta : buttonRadiusDelta;
        if (widthDelta <= widthEps && radiusDelta <= radiusEps) return;
      }

      setNewWidth(calculatedWidth);
      setIsVertical(shouldBeVertical);
      setButtonBorderRadius(buttonRadius);
      setSingleButtonBorderRadius(singleButtonRadius);
    });
    return () => cancelAnimationFrame(id);
  }, [layoutReady, width, height, childrenCount, sizeClass, calculateButtonWidth, calculateVisualParameters]);

  const onLayout = (event: { nativeEvent: { layout: { width: number } } }) => {
    const { width: currentLayoutWidth } = event.nativeEvent.layout;

    if (currentLayoutWidth > 0) {
      if (Math.abs(layoutWidth.current - currentLayoutWidth) > 2) {
        layoutWidth.current = currentLayoutWidth;
      }

      if (!layoutReady) {
        setLayoutReady(true);
      }
    }
  };

  const renderChild = (child: ReactNode, index: number, array: ReactNode[]): ReactNode => {
    if (typeof child === 'string') {
      return (
        <View key={index} style={[containerStyles.childWrapper, { width: newWidth }]}>
          <Text adjustsFontSizeToFit numberOfLines={1}>
            {child}
          </Text>
        </View>
      );
    }

    const isSingleChild = array.length === 1;

    return React.cloneElement(child as React.ReactElement<any>, {
      width: newWidth,
      key: index,
      last: index === array.length - 1,
      singleChild: isSingleChild,
      isVertical,
      borderRadius: isSingleChild ? singleButtonBorderRadius : buttonBorderRadius,
      fontSize: buttonFontSize,
    });
  };

  const combinedStyles = useMemo(
    () => [
      containerStyles.root,
      props.inline ? containerStyles.rootInline : containerStyles.rootAbsolute,
      { bottom: insets.bottom ? insets.bottom + 10 : 30 },
      newWidth ? (isVertical ? containerStyles.rootPostVertical : containerStyles.rootPost) : containerStyles.rootPre,
      childrenCount === 1 ? { borderRadius: singleButtonBorderRadius, overflow: 'hidden' as const } : null,
      isVertical ? calculateContainerHeight(childrenCount, isVertical) : null,
      { transform: [{ translateY: slideAnimation }] },
    ],
    [props.inline, insets.bottom, newWidth, isVertical, childrenCount, singleButtonBorderRadius, calculateContainerHeight, slideAnimation],
  );

  return (
    <Animated.View ref={ref} onLayout={onLayout} style={combinedStyles}>
      {layoutReady ? React.Children.toArray(props.children).filter(Boolean).map(renderChild) : props.children}
    </Animated.View>
  );
});
