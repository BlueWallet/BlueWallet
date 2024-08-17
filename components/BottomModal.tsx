import React, { forwardRef, useImperativeHandle, useRef, ReactElement, ComponentType, JSXElementConstructor, ReactNode } from 'react';
import { SheetSize, SizeInfo, TrueSheet, TrueSheetProps } from '@lodev09/react-native-true-sheet';
import { Keyboard, StyleSheet, View, TouchableOpacity, Platform, Image } from 'react-native';

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
}

export interface BottomModalHandle {
  present: () => Promise<void>;
  dismiss: () => Promise<void>;
}

const styles = StyleSheet.create({
  footerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContainer: {
    position: 'absolute',
    backgroundColor: 'lightgray',
    justifyContent: 'center',
    alignItems: 'center',
    width: 30,
    height: 30,
    borderRadius: 15,
    top: 20,
    right: 20,
    zIndex: 10,
  },
});

const BottomModal = forwardRef<BottomModalHandle, BottomModalProps>(
  (
    {
      onClose,
      onPresent,
      onSizeChange,
      showCloseButton = true,
      isGrabberVisible = true,
      sizes = ['auto'],
      footer,
      footerDefaultMargins,
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

    const renderTopRightButton = () =>
      showCloseButton ? (
        <TouchableOpacity style={styles.buttonContainer} onPress={dismiss} testID="ModalDoneButton">
          <Image source={require('../img/close.png')} width={20} height={20} />
        </TouchableOpacity>
      ) : null;

    const renderFooter = (): ReactElement<any, string | JSXElementConstructor<any>> | ComponentType<unknown> | undefined => {
      // Footer is not working correctly on Android yet.
      if (!footer) return undefined;

      if (React.isValidElement(footer)) {
        return footerDefaultMargins ? <View style={styles.footerContainer}>{footer}</View> : footer;
      } else if (typeof footer === 'function') {
        // Render the footer component dynamically
        const FooterComponent = footer as ComponentType<any>;
        return <FooterComponent />;
      }

      return undefined;
    };

    const FooterComponent = Platform.OS !== 'android' && renderFooter();

    return (
      <TrueSheet
        ref={trueSheetRef}
        cornerRadius={24}
        sizes={sizes}
        onDismiss={onClose}
        onPresent={onPresent}
        onSizeChange={onSizeChange}
        grabber={isGrabberVisible}
        // Footer is not working correctly on Android yet.
        FooterComponent={FooterComponent as ReactElement}
        {...props}
      >
        {children}
        {renderTopRightButton()}
        {Platform.OS === 'android' && (renderFooter() as ReactNode)}
      </TrueSheet>
    );
  },
);

export default BottomModal;
