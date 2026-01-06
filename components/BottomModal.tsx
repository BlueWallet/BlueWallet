import React, { forwardRef, useImperativeHandle, useRef, ReactElement, ComponentType } from 'react';
import { SheetDetent, DetentChangeEvent, TrueSheet, TrueSheetProps } from '@lodev09/react-native-true-sheet';
import { Keyboard, Image, StyleSheet, View, Pressable, Platform, GestureResponderEvent, Text, StyleProp, ViewStyle } from 'react-native';
import SaveFileButton from './SaveFileButton';
import { useTheme } from './themes';
import { Icon } from '@rneui/base';

interface BottomModalProps extends TrueSheetProps {
  children?: React.ReactNode;
  onClose?: () => void;
  onCloseModalPressed?: () => Promise<void>;
  isGrabberVisible?: boolean;
  detents?: SheetDetent[];
  footer?: ReactElement | ComponentType<any>;
  footerDefaultMargins?: boolean | number;
  onPresent?: () => void;
  onDetentChange?: (event: DetentChangeEvent) => void;
  showCloseButton?: boolean;
  shareContent?: BottomModalShareContent;
  shareButtonOnPress?: (event: GestureResponderEvent) => void;
  header?: ReactElement | ComponentType<any>;
  headerTitle?: string;
  headerSubtitle?: string;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

type BottomModalShareContent = {
  fileName: string;
  fileContent: string;
};

export interface BottomModalHandle {
  present: () => Promise<void>;
  dismiss: () => Promise<void>;
}

const BottomModal = forwardRef<BottomModalHandle, BottomModalProps>(
  (
    {
      onClose,
      onCloseModalPressed,
      onPresent,
      showCloseButton = true,
      isGrabberVisible = true,
      shareContent,
      shareButtonOnPress,
      detents = ['auto'],
      footer,
      footerDefaultMargins,
      header,
      headerTitle,
      headerSubtitle,
      children,
      onDetentChange,
      contentContainerStyle,
      ...props
    },
    ref,
  ) => {
    const trueSheetRef = useRef<TrueSheet>(null);
    const { colors, closeImage } = useTheme();
    const stylesHook = StyleSheet.create({
      barButton: {
        backgroundColor: colors.lightButton,
      },
      headerTitle: {
        color: colors.foregroundColor,
      },
    });

    useImperativeHandle(ref, () => ({
      present: async () => {
        Keyboard.dismiss();
        if (trueSheetRef.current?.present) {
          await trueSheetRef.current.present();
        } else {
          return Promise.resolve();
        }
      },
      dismiss: async () => {
        Keyboard.dismiss();
        if (trueSheetRef.current?.dismiss) {
          await trueSheetRef.current.dismiss();
        } else {
          return Promise.resolve();
        }
      },
    }));

    const dismiss = async () => {
      try {
        await onCloseModalPressed?.();
        await trueSheetRef.current?.dismiss();
      } catch (error) {
        console.error('Error during dismiss:', error);
      }
    };

    const renderHeaderButtons = (headerNode: React.ReactNode, hasTextHeader: boolean) => {
      const buttons = [] as React.ReactNode[];

      if (headerNode && !hasTextHeader) {
        buttons.push(
          <View key="ModalHeaderNode" style={[styles.topRightButton, styles.headerNodeWrapper]}>
            {headerNode}
          </View>,
        );
      }

      if (shareContent || shareButtonOnPress) {
        if (shareContent) {
          buttons.push(
            <SaveFileButton
              style={[styles.topRightButton, stylesHook.barButton]}
              fileContent={shareContent.fileContent}
              fileName={shareContent.fileName}
              testID="ModalShareButton"
              key="ModalShareButton"
            >
              <Icon
                name={Platform.OS === 'android' ? 'share' : 'file-upload'}
                type="font-awesome6"
                size={24}
                color={colors.buttonTextColor}
              />
            </SaveFileButton>,
          );
        } else if (shareButtonOnPress) {
          buttons.push(
            <Pressable
              testID="ModalShareButton"
              key="ModalShareButton"
              style={({ pressed }) => [pressed && styles.pressed, styles.topRightButton, stylesHook.barButton]}
              onPress={shareButtonOnPress}
            >
              <Icon
                name={Platform.OS === 'android' ? 'share' : 'file-upload'}
                type="font-awesome6"
                size={24}
                color={colors.buttonTextColor}
              />
            </Pressable>,
          );
        }
      }

      if (showCloseButton) {
        buttons.push(
          <Pressable
            style={({ pressed }) => [pressed && styles.pressed, styles.topRightButton, stylesHook.barButton]}
            onPress={dismiss}
            key="ModalDoneButton"
            testID="ModalDoneButton"
          >
            <Image source={closeImage} />
          </Pressable>,
        );
      }

      return buttons.length > 0 ? <View style={styles.topRightButtonContainer}>{buttons}</View> : null;
    };

    const renderHeader = () => {
      const headerNode = React.isValidElement(header)
        ? header
        : typeof header === 'function'
        ? React.createElement(header as ComponentType)
        : null;

      const hasButtons = showCloseButton || shareContent || headerNode;
      const hasTextHeader = headerTitle || headerSubtitle;
      const hasAnyHeader = hasTextHeader || headerNode || hasButtons;

      if (!hasAnyHeader) return null;

      const containerStyle = hasButtons ? styles.headerContainer : styles.headerContainerWithCloseButton;

      return (
        <View style={containerStyle}>
          {hasTextHeader && (
            <View style={styles.headerContent}>
              {headerTitle && <Text style={[styles.headerTitle, stylesHook.headerTitle]}>{headerTitle}</Text>}
              {headerSubtitle && <Text style={[styles.headerSubtitle, stylesHook.headerTitle]}>{headerSubtitle}</Text>}
            </View>
          )}
          {hasButtons && renderHeaderButtons(headerNode, Boolean(hasTextHeader))}
        </View>
      );
    };

    const renderFooter = (): ReactElement | undefined => {
      if (React.isValidElement(footer)) {
        return footerDefaultMargins ? <View style={styles.footerContainer}>{footer}</View> : footer;
      } else if (typeof footer === 'function') {
        const ModalFooterComponent = footer as ComponentType<any>;
        return <ModalFooterComponent />;
      }

      return undefined;
    };

    const FooterComponent = renderFooter();

    return (
      <TrueSheet
        ref={trueSheetRef}
        detents={detents}
        onDidDismiss={onClose}
        onDidPresent={onPresent}
        onDetentChange={onDetentChange}
        grabber={isGrabberVisible}
        footer={FooterComponent as ReactElement}
        {...props}
      >
        <View style={[styles.childrenContainer, contentContainerStyle]}>{children}</View>
        {renderHeader()}
      </TrueSheet>
    );
  },
);

export default BottomModal;

const styles = StyleSheet.create({
  footerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContainer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    minHeight: 22,
    right: 16,
    top: 16,
  },
  headerContainerWithCloseButton: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    minHeight: 22,
    width: '100%',
    top: 16,
    left: 0,
    justifyContent: 'space-between',
  },
  headerContent: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 22,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
  },
  topRightButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 8,
  },
  topRightButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerNodeWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 0,
  },
  childrenContainer: {
    paddingTop: 66,
    paddingHorizontal: 16,
    width: '100%',
  },
  pressed: {
    opacity: 0.6,
  },
});
