import React, { forwardRef, ReactNode, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Animated,
  Dimensions,
  LayoutAnimation,
  Platform,
  PixelRatio,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  useWindowDimensions,
  View,
  StyleProp,
  TextStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './themes';
import { useIsLargeScreen } from '../hooks/useIsLargeScreen';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PADDINGS = 30;
const ICON_MARGIN = 7;
const BUTTON_MARGIN = 10;
const MIN_BUTTON_WIDTH = 100;
const DRAWER_WIDTH = 320;
const BUTTON_HEIGHT = 52;
const CONTAINER_SIDE_MARGIN = 20;
const DEFAULT_BORDER_RADIUS = 8;
const MAX_BUTTON_FONT_SIZE = 24;

// We'll keep this for backwards compatibility but it will be overridden
const initialButtonFontSize = (() => {
  const baseSize = PixelRatio.roundToNearestPixel(Dimensions.get('window').width / 24);
  return Math.min(MAX_BUTTON_FONT_SIZE, baseSize);
})();

const containerStyles = StyleSheet.create({
  root: {
    alignSelf: 'center',
    height: '8%',
    minHeight: 52,
    marginHorizontal: CONTAINER_SIDE_MARGIN,
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
});

const buttonStyles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  icon: {
    alignItems: 'center',
  },
  touchContainer: {
    width: '100%',
    height: '100%',
  },
});

interface FContainerProps {
  children: ReactNode | ReactNode[];
  inline?: boolean;
}

export const FContainer = forwardRef<View, FContainerProps>((props, ref) => {
  const insets = useSafeAreaInsets();
  const [newWidth, setNewWidth] = useState<number | undefined>(undefined);
  const [isVertical, setIsVertical] = useState(false);
  const layoutCalculated = useRef(false);
  const layoutWidth = useRef<number>(0);
  const [layoutReady, setLayoutReady] = useState(false);
  const initialLayoutDone = useRef(false);
  const orientationKey = useRef<string>('');

  // Cache for calculations by orientation
  const calculationCache = useRef<
    Record<
      string,
      {
        width: number;
        isVertical: boolean;
        buttonRadius: number;
        singleButtonRadius: number;
      }
    >
  >({});

  // Create bottomInsets using useMemo to avoid creating a new object on every render
  const bottomInsets = useMemo(() => ({ bottom: insets.bottom ? insets.bottom + 10 : 30 }), [insets.bottom]);

  const { height, width } = useWindowDimensions();
  const slideAnimation = useRef(new Animated.Value(height)).current;
  const { isLargeScreen } = useIsLargeScreen();
  const [buttonBorderRadius, setButtonBorderRadius] = useState<number>(DEFAULT_BORDER_RADIUS);
  const [singleButtonBorderRadius, setSingleButtonBorderRadius] = useState<number>(BUTTON_HEIGHT / 2);
  const [isAnimating, setIsAnimating] = useState(false);
  const animatedButtonRadius = useRef(new Animated.Value(DEFAULT_BORDER_RADIUS)).current;
  const animatedSingleButtonRadius = useRef(new Animated.Value(BUTTON_HEIGHT / 2)).current;

  // Normalize the orientation key to be consistent regardless of how dimensions are reported
  const getNormalizedOrientationKey = useCallback(() => {
    // Always put the larger dimension first for consistency
    const isPortrait = height > width;
    const largerDim = Math.max(width, height);
    const smallerDim = Math.min(width, height);

    // Create a consistent key format that's the same whether we're in portrait or landscape
    return `${largerDim}x${smallerDim}-${isPortrait ? 'portrait' : 'landscape'}-${isLargeScreen ? 'large' : 'small'}`;
  }, [width, height, isLargeScreen]);

  // Animation for slide in
  useEffect(() => {
    slideAnimation.setValue(height);
    Animated.spring(slideAnimation, {
      toValue: 0,
      useNativeDriver: false,
      speed: 100,
      bounciness: 3,
    }).start();
  }, [height, slideAnimation]);

  // Animation configuration for layout changes
  const configureLayoutAnimation = useCallback(() => {
    LayoutAnimation.configureNext({
      duration: 300,
      create: {
        type: LayoutAnimation.Types.spring,
        property: LayoutAnimation.Properties.scaleXY,
        springDamping: 0.7,
      },
      update: {
        type: LayoutAnimation.Types.spring,
        springDamping: 0.7,
      },
      delete: {
        type: LayoutAnimation.Types.spring,
        property: LayoutAnimation.Properties.scaleXY,
        springDamping: 0.7,
      },
    });
  }, []);

  // Pure calculation function for button width
  const calculateButtonWidth = useCallback(
    (containerWidth: number, totalChildren: number, screenWidth: number, isLarge: boolean): number => {
      if (containerWidth <= 0) return 0;

      const drawerOffset = isLarge ? DRAWER_WIDTH : 0;
      const availableWidth = screenWidth - drawerOffset - CONTAINER_SIDE_MARGIN * 2;

      const contentWidth = Math.ceil(containerWidth);
      const buttonWidth = contentWidth + PADDINGS * 2;
      const totalButtonWidth = buttonWidth * totalChildren;
      const totalSpacersWidth = (totalChildren - 1) * BUTTON_MARGIN;
      const totalWidthNeeded = totalButtonWidth + totalSpacersWidth;

      // Add safety margin
      const SAFETY_MARGIN = 20;
      const adjustedTotalWidthNeeded = totalWidthNeeded + SAFETY_MARGIN;

      // Fixed minimum width for each button on large screens to ensure buttons are usable
      const MIN_BUTTON_WIDTH_LARGE = 130;
      const effectiveMinButtonWidth = isLarge ? MIN_BUTTON_WIDTH_LARGE : MIN_BUTTON_WIDTH;

      let calculatedWidth;

      // Only consider vertical layout if isLargeScreen is true
      const shouldBeVertical = isLarge && adjustedTotalWidthNeeded > availableWidth && totalChildren > 1;

      if (shouldBeVertical) {
        // Vertical layout
        calculatedWidth = isLarge ? availableWidth - CONTAINER_SIDE_MARGIN * 2 : availableWidth;
      } else {
        // Horizontal layout
        if (adjustedTotalWidthNeeded > availableWidth) {
          // Distribute available width among buttons
          const availableWidthPerButton = (availableWidth - totalSpacersWidth) / totalChildren;
          calculatedWidth = Math.floor(availableWidthPerButton) - PADDINGS * 2;

          // If calculated width is too small, fall back to vertical layout for large screens
          if (isLarge && calculatedWidth < effectiveMinButtonWidth && totalChildren > 1) {
            console.debug('Forcing vertical layout due to small button width:', calculatedWidth);
            calculatedWidth = availableWidth - CONTAINER_SIDE_MARGIN * 2;
            // Signal that this should be vertical layout
            // This will be picked up by the next update cycle
            setTimeout(() => setIsVertical(true), 0);
          }
        } else {
          // Plenty of space, use original content width
          calculatedWidth = Math.max(contentWidth, effectiveMinButtonWidth);
        }
      }

      // Adjust minimum width for single button
      const effectiveMinWidth = isLarge ? MIN_BUTTON_WIDTH * 1.2 : MIN_BUTTON_WIDTH;
      if (totalChildren === 1 && calculatedWidth < effectiveMinWidth - PADDINGS * 2) {
        calculatedWidth = effectiveMinWidth - PADDINGS * 2;
      }

      return Math.floor(calculatedWidth); // Floor for consistency
    },
    [],
  );

  // Calculate all visual parameters at once to ensure consistency
  const calculateVisualParameters = useCallback(
    (calculatedWidth: number, totalChildren: number, isLarge: boolean) => {
      // Determine if vertical layout is needed
      const drawerOffset = isLarge ? DRAWER_WIDTH : 0;
      const availableWidth = width - drawerOffset - CONTAINER_SIDE_MARGIN * 2;

      const buttonWidth = calculatedWidth + PADDINGS * 2;
      const totalButtonWidth = buttonWidth * totalChildren;
      const totalSpacersWidth = (totalChildren - 1) * BUTTON_MARGIN;
      const totalWidthNeeded = totalButtonWidth + totalSpacersWidth;

      // Add safety margin for horizontal layout
      const SAFETY_MARGIN = 20;
      const adjustedTotalWidthNeeded = totalWidthNeeded + SAFETY_MARGIN;

      // Log detailed calculation for debugging
      console.debug(
        'Layout calculation:',
        `availWidth=${availableWidth}`,
        `buttonWidth=${buttonWidth}`,
        `totalButtons=${totalChildren}`,
        `totalNeeded=${totalWidthNeeded}`,
        `isLarge=${isLarge}`,
        `willFitHorizontal=${adjustedTotalWidthNeeded <= availableWidth}`,
      );

      // More generous threshold for horizontal layout on large screens
      // Never allow vertical layout when isLargeScreen is false
      const shouldBeVertical = isLarge && adjustedTotalWidthNeeded > availableWidth && totalChildren > 1;

      // Calculate border radius
      const baseRadius = isLarge ? Math.min(BUTTON_HEIGHT / 2, calculatedWidth / 8) : Math.min(BUTTON_HEIGHT / 2, calculatedWidth / 10);

      const buttonRadius = Math.max(DEFAULT_BORDER_RADIUS, Math.floor(baseRadius));
      const singleButtonRadius = totalChildren === 1 ? BUTTON_HEIGHT / 2 : buttonRadius;

      return { buttonRadius, singleButtonRadius, shouldBeVertical };
    },
    [width],
  );

  // Animate border radius changes
  const animateBorderRadius = useCallback(
    (buttonRadius: number, singleRadius: number) => {
      Animated.parallel([
        Animated.timing(animatedButtonRadius, {
          toValue: buttonRadius,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(animatedSingleButtonRadius, {
          toValue: singleRadius,
          duration: 300,
          useNativeDriver: false,
        }),
      ]).start(() => {
        // Update state only after the animation finished with final values.
        setButtonBorderRadius(buttonRadius);
        setSingleButtonBorderRadius(singleRadius);
        setIsAnimating(false);
      });
    },
    [animatedButtonRadius, animatedSingleButtonRadius],
  );

  // Wait for layout to complete before triggering calculations
  useEffect(() => {
    if (!layoutReady || layoutWidth.current <= 0) return;

    const normalizedKey = getNormalizedOrientationKey();
    console.debug('Current orientation key:', normalizedKey, 'screenWidth:', width);

    // Check if we've calculated this orientation before
    const cachedCalculation = calculationCache.current[normalizedKey];

    // Clear cache when dimensions change significantly
    if (width > 900 && Object.keys(calculationCache.current).length > 5) {
      console.debug('Clearing calculation cache due to large screen width');
      calculationCache.current = {};
    }

    if (cachedCalculation) {
      // Use cached values to ensure exact consistency
      console.debug('Using cached calculation for', normalizedKey, 'isVertical:', cachedCalculation.isVertical);

      // If layout is changing, animate the transition
      if (cachedCalculation.isVertical !== isVertical || newWidth !== cachedCalculation.width) {
        // Start animation
        setIsAnimating(true);
        configureLayoutAnimation();

        // Apply new width and layout orientation with animation
        setNewWidth(cachedCalculation.width);
        setIsVertical(cachedCalculation.isVertical);

        // Animate border radius changes
        animateBorderRadius(cachedCalculation.buttonRadius, cachedCalculation.singleButtonRadius);
      } else {
        // No layout change, just update values
        setNewWidth(cachedCalculation.width);
        setIsVertical(cachedCalculation.isVertical);
        setButtonBorderRadius(cachedCalculation.buttonRadius);
        setSingleButtonBorderRadius(cachedCalculation.singleButtonRadius);
      }

      layoutCalculated.current = true;
      return;
    }

    // New calculation needed
    console.debug('New calculation needed for', normalizedKey);
    const totalChildren = React.Children.toArray(props.children).filter(Boolean).length;

    // Calculate dimensions
    const calculatedWidth = calculateButtonWidth(layoutWidth.current, totalChildren, width, isLargeScreen);

    // Calculate visual parameters
    const { buttonRadius, singleButtonRadius, shouldBeVertical } = calculateVisualParameters(calculatedWidth, totalChildren, isLargeScreen);

    // Check if layout is changing
    if (shouldBeVertical !== isVertical || newWidth !== calculatedWidth) {
      // Start animation
      setIsAnimating(true);
      configureLayoutAnimation();

      // Apply new width and layout orientation with animation
      setNewWidth(calculatedWidth);
      setIsVertical(shouldBeVertical);

      // Animate border radius changes
      animateBorderRadius(buttonRadius, singleButtonRadius);
    } else {
      // No layout change, just update values
      setNewWidth(calculatedWidth);
      setIsVertical(shouldBeVertical);
      setButtonBorderRadius(buttonRadius);
      setSingleButtonBorderRadius(singleButtonRadius);
    }

    // Cache the result for this orientation
    calculationCache.current[normalizedKey] = {
      width: calculatedWidth,
      isVertical: shouldBeVertical,
      buttonRadius,
      singleButtonRadius,
    };

    // Mark as calculated
    layoutCalculated.current = true;
    if (!initialLayoutDone.current) {
      orientationKey.current = normalizedKey;
      initialLayoutDone.current = true;
    }
  }, [
    isLargeScreen,
    width,
    height,
    props.children,
    layoutReady,
    getNormalizedOrientationKey,
    calculateButtonWidth,
    calculateVisualParameters,
    configureLayoutAnimation,
    animateBorderRadius,
    isVertical,
    newWidth,
  ]);

  const getContainerHeight = useCallback((childrenCount: number, isVerticalLayout: boolean) => {
    if (!isVerticalLayout) return { height: '8%', minHeight: BUTTON_HEIGHT };

    const totalButtonsHeight = childrenCount * BUTTON_HEIGHT;
    const totalMarginsHeight = (childrenCount - 1) * BUTTON_MARGIN;
    const calculatedHeight = totalButtonsHeight + totalMarginsHeight;

    return { height: calculatedHeight };
  }, []);

  const onLayout = (event: { nativeEvent: { layout: { width: number } } }) => {
    const { width: currentLayoutWidth } = event.nativeEvent.layout;

    if (currentLayoutWidth > 0) {
      // Only update if width changed significantly (avoid minor pixel differences)
      if (Math.abs(layoutWidth.current - currentLayoutWidth) > 2) {
        layoutWidth.current = currentLayoutWidth;
        layoutCalculated.current = false;
      }

      // Signal layout is ready
      if (!layoutReady) {
        setLayoutReady(true);
      }
    }
  };

  // Calculate dynamic font size based on current dimensions
  const buttonFontSize = useMemo(() => {
    // Use a slightly smaller divisor for large screens to make text more readable
    const divisor = isLargeScreen ? 22 : 24;
    const baseSize = PixelRatio.roundToNearestPixel(width / divisor);
    return Math.min(MAX_BUTTON_FONT_SIZE, baseSize);
  }, [width, isLargeScreen]);

  const renderChild = (child: ReactNode, index: number, array: ReactNode[]): ReactNode => {
    if (typeof child === 'string') {
      return (
        <View key={index} style={{ width: newWidth }}>
          <Text adjustsFontSizeToFit numberOfLines={1}>
            {child}
          </Text>
        </View>
      );
    }
    // Pass correct border radius values to child buttons
    const isSingleChild = array.length === 1;
    const borderRadiusToUse = isSingleChild
      ? isAnimating
        ? animatedSingleButtonRadius
        : singleButtonBorderRadius
      : isAnimating
        ? animatedButtonRadius
        : buttonBorderRadius;

    return React.cloneElement(child as React.ReactElement<any>, {
      width: newWidth,
      key: index,
      first: index === 0,
      last: index === array.length - 1,
      singleChild: isSingleChild,
      isVertical,
      borderRadius: borderRadiusToUse,
      fontSize: buttonFontSize,
      isAnimating,
    });
  };

  // Make sure container height is recalculated whenever isVertical changes
  const totalChildren = React.Children.toArray(props.children).filter(Boolean).length;
  const containerHeight = useMemo(() => getContainerHeight(totalChildren, isVertical), [getContainerHeight, totalChildren, isVertical]);

  // Dynamic round style based on current parameters - now with animated values
  const dynamicRoundStyle = useMemo(() => {
    if (totalChildren === 1) {
      return {
        borderRadius: isAnimating ? animatedSingleButtonRadius : singleButtonBorderRadius,
        overflow: 'hidden',
      };
    }
    return null;
  }, [totalChildren, singleButtonBorderRadius, isAnimating, animatedSingleButtonRadius]);

  // Use useMemo for the combined styles to ensure they're recalculated when dependencies change
  const combinedStyles = useMemo(
    () => [
      containerStyles.root,
      props.inline ? containerStyles.rootInline : containerStyles.rootAbsolute,
      bottomInsets,
      newWidth ? (isVertical ? containerStyles.rootPostVertical : containerStyles.rootPost) : containerStyles.rootPre,
      dynamicRoundStyle,
      isVertical ? containerHeight : null,
      { transform: [{ translateY: slideAnimation }] },
    ],
    [props.inline, bottomInsets, newWidth, isVertical, dynamicRoundStyle, containerHeight, slideAnimation],
  );

  return (
    <Animated.View ref={ref} onLayout={onLayout} style={combinedStyles}>
      {newWidth && layoutReady ? React.Children.toArray(props.children).filter(Boolean).map(renderChild) : props.children}
    </Animated.View>
  );
});

interface FButtonProps {
  text: string;
  icon: ReactNode;
  width?: number;
  first?: boolean;
  last?: boolean;
  singleChild?: boolean;
  isVertical?: boolean;
  borderRadius?: number | Animated.Value;
  fontSize?: number;
  isAnimating?: boolean;
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

const ButtonContent = ({ icon, text, textStyle }: ButtonContentProps) => (
  <>
    <View style={buttonStyles.icon}>{icon}</View>
    <Text numberOfLines={1} adjustsFontSizeToFit style={textStyle}>
      {text}
    </Text>
  </>
);

export const FButton = ({
  text,
  icon,
  width,
  first,
  last,
  singleChild,
  isVertical,
  borderRadius = DEFAULT_BORDER_RADIUS,
  fontSize = initialButtonFontSize,
  isAnimating = false,
  testID,
  ...props
}: FButtonProps) => {
  const { colors } = useTheme();

  const customButtonStyles = StyleSheet.create({
    root: {
      backgroundColor: colors.buttonBackgroundColor,
      height: BUTTON_HEIGHT,
      overflow: 'hidden',
    },
    text: {
      color: colors.buttonAlternativeTextColor,
      fontSize,
    },
    textDisabled: {
      color: colors.formBorder,
    },
    marginRight: {
      marginRight: BUTTON_MARGIN,
    },
    marginBottom: {
      marginBottom: BUTTON_MARGIN,
    },
    textBase: {
      fontWeight: '600',
      marginLeft: ICON_MARGIN,
      backgroundColor: 'transparent',
    },
  });

  const style: Record<string, any> = {};
  const additionalStyles = !last ? (isVertical ? customButtonStyles.marginBottom : customButtonStyles.marginRight) : {};

  if (width) {
    style.paddingHorizontal = PADDINGS;
    style.width = isVertical ? '100%' : width + PADDINGS * 2;
  }

  const textStyle = [customButtonStyles.textBase, props.disabled ? customButtonStyles.textDisabled : customButtonStyles.text];

  // If we're animating, use Animated.View for smooth transitions
  if (isAnimating && borderRadius instanceof Animated.Value) {
    return (
      <Animated.View style={[buttonStyles.root, customButtonStyles.root, style, additionalStyles, { borderRadius }]}>
        <TouchableOpacity
          accessibilityLabel={text}
          accessibilityRole="button"
          testID={testID}
          style={[buttonStyles.root, buttonStyles.touchContainer]}
          {...props}
        >
          <ButtonContent icon={icon} text={text} textStyle={textStyle} />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Standard non-animated button
  return (
    <TouchableOpacity
      accessibilityLabel={text}
      accessibilityRole="button"
      testID={testID}
      style={[
        buttonStyles.root,
        customButtonStyles.root,
        style,
        additionalStyles,
        { borderRadius: typeof borderRadius === 'number' ? borderRadius : DEFAULT_BORDER_RADIUS },
      ]}
      {...props}
    >
      <ButtonContent icon={icon} text={text} textStyle={textStyle} />
    </TouchableOpacity>
  );
};
