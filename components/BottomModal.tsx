import React, { forwardRef, useImperativeHandle, useRef, ReactElement, ComponentType } from 'react';
import { SheetSize, SizeInfo, TrueSheet, TrueSheetProps } from '@lodev09/react-native-true-sheet';
import { Keyboard, StyleSheet, View, TouchableOpacity, Platform, PlatformColor, GestureResponderEvent } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import SaveFileButton from './SaveFileButton';

interface BottomModalProps extends TrueSheetProps {
  children?: React.ReactNode;
  onClose?: () => void;
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
      children,
      ...props
    },
    ref,
  ) => {
    const trueSheetRef = useRef<TrueSheet>(null);

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

    const dismiss = () => {
      trueSheetRef.current?.dismiss();
    };

    const renderTopRightButton = () => {
      const buttons = [];
      if (shareContent || shareButtonOnPress) {
        if (shareContent) {
          buttons.push(
            <SaveFileButton
              style={styles.topRightButton}
              fileContent={shareContent.fileContent}
              fileName={shareContent.fileName}
              testID="ModalShareButton"
            >
              <Ionicons name="share" size={20} color={PlatformColor('lightText')} />
            </SaveFileButton>,
          );
        } else if (shareButtonOnPress) {
          buttons.push(
            <TouchableOpacity style={styles.topRightButton} onPress={shareButtonOnPress} testID="ModalShareButton">
              <Ionicons name="share" size={20} color={PlatformColor('lightText')} />
            </TouchableOpacity>,
          );
        }
      }
      if (showCloseButton) {
        buttons.push(
          <TouchableOpacity style={styles.topRightButton} onPress={dismiss} testID="ModalDoneButton">
            <Ionicons name="close" size={20} color={PlatformColor('lightText')} />
          </TouchableOpacity>,
        );
      }
      return <View style={styles.topRightButtonContainer}>{buttons}</View>;
    };

    const renderHeader = () => {
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
        const FooterComponent = footer as ComponentType<any>;
        return <FooterComponent />;
      }

      return undefined;
    };

    const FooterComponent = renderFooter();

    return (
      <TrueSheet
        ref={trueSheetRef}
        cornerRadius={24}
        sizes={sizes}
        onDismiss={onClose}
        onPresent={onPresent}
        onSizeChange={onSizeChange}
        grabber={isGrabberVisible}
        FooterComponent={FooterComponent}
        {...props}
      >
        {renderHeader()}
        <View style={styles.childrenContainer}>{children}</View>
        {Platform.OS === 'android' && FooterComponent}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    minHeight: 22,
  },
  headerContent: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 22,
  },
  topRightButton: {
    backgroundColor: PlatformColor('systemGray2'),
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
    marginTop: 0,
  },
});
