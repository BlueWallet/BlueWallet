import React, { forwardRef, useImperativeHandle, useRef, ReactElement, ComponentType, ReactNode } from 'react';
import { SheetSize, SizeInfo, TrueSheet, TrueSheetProps } from '@lodev09/react-native-true-sheet';
import { Keyboard, StyleSheet, View, TouchableOpacity, Platform, GestureResponderEvent, Text } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import SaveFileButton from './SaveFileButton';
import { useTheme } from './themes';
import { Image } from '@rneui/base';

interface BottomModalProps extends TrueSheetProps {
  children?: React.ReactNode;
  onClose?: () => void;
  onCloseModalPressed?: () => Promise<void>;
  isGrabberVisible?: boolean;
  sizes?: SheetSize[] | undefined;
  footer?: ReactElement | ComponentType<any> | null;
  footerDefaultMargins?: boolean | number;
  onPresent?: () => void;
  onSizeChange?: (size: SizeInfo) => void;
  showCloseButton?: boolean;
  shareContent?: BottomModalShareContent;
  shareButtonOnPress?: (event: GestureResponderEvent) => void;
  header?: ReactElement | ComponentType<any> | null;
  headerTitle?: string;
  headerSubtitle?: string;
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
      onSizeChange,
      showCloseButton = true,
      isGrabberVisible = true,
      shareContent,
      shareButtonOnPress,
      sizes = ['auto'],
      footer,
      footerDefaultMargins,
      header,
      headerTitle,
      headerSubtitle,
      children,
      ...props
    },
    ref,
  ) => {
    const trueSheetRef = useRef<TrueSheet>(null);
    const { colors } = useTheme();
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

    const renderTopRightButton = () => {
      const buttons = [];
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
              <Ionicons name="share" size={20} color={colors.buttonTextColor} />
            </SaveFileButton>,
          );
        } else if (shareButtonOnPress) {
          buttons.push(
            <TouchableOpacity
              testID="ModalShareButton"
              key="ModalShareButton"
              style={[styles.topRightButton, stylesHook.barButton]}
              onPress={shareButtonOnPress}
            >
              <Ionicons name="share" size={20} color={colors.buttonTextColor} />
            </TouchableOpacity>,
          );
        }
      }
      if (showCloseButton) {
        buttons.push(
          <TouchableOpacity
            style={[styles.topRightButton, stylesHook.barButton]}
            onPress={dismiss}
            key="ModalDoneButton"
            testID="ModalDoneButton"
          >
            {Platform.OS === 'ios' ? (
              <Ionicons name="close" size={20} color={colors.buttonTextColor} />
            ) : (
              <Image source={require('../img/close.png')} style={styles.closeButton} />
            )}
          </TouchableOpacity>,
        );
      }
      return <View style={styles.topRightButtonContainer}>{buttons}</View>;
    };

    const renderHeader = () => {
      if (headerTitle || headerSubtitle) {
        return (
          <View style={styles.headerContainer}>
            <View style={styles.headerContent}>
              {headerTitle && <Text style={[styles.headerTitle, stylesHook.headerTitle]}>{headerTitle}</Text>}
              {headerSubtitle && <Text style={[styles.headerSubtitle, stylesHook.headerTitle]}>{headerSubtitle}</Text>}
            </View>
            {renderTopRightButton()}
          </View>
        );
      }

      return (
        <View style={styles.headerContainer}>
          <View style={styles.headerContent}>{typeof header === 'function' ? <header /> : header}</View>
          {renderTopRightButton()}
        </View>
      );
    };

    const renderFooter = (): ReactElement | undefined => {
      // Footer is not working correctly on Android yet.
      if (!footer) return undefined;

      if (React.isValidElement(footer)) {
        return footerDefaultMargins ? <View style={styles.footerContainer}>{footer}</View> : footer;
      } else if (typeof footer === 'function') {
        const ModalFooterComponent = footer as ComponentType<any>;
        return <ModalFooterComponent />;
      }

      return undefined;
    };

    const FooterComponent = Platform.OS !== 'android' && renderFooter();

    return (
      <TrueSheet
        ref={trueSheetRef}
        sizes={sizes}
        onDismiss={onClose}
        onPresent={onPresent}
        onSizeChange={onSizeChange}
        grabber={isGrabberVisible}
        FooterComponent={FooterComponent as ReactElement}
        {...props}
      >
        <View style={styles.childrenContainer}>{children}</View>
        {Platform.OS === 'android' && (renderFooter() as ReactNode)}
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
  headerContent: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 22,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 10,
    height: 10,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  topRightButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 30,
    height: 30,
    borderRadius: 15,
    marginLeft: 22,
  },
  topRightButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  childrenContainer: {
    paddingTop: 66,
    paddingHorizontal: 16,
    width: '100%',
  },
});
