import React, { forwardRef, useImperativeHandle, useRef, ReactElement, ComponentType } from 'react';
import { SheetSize, SizeInfo, TrueSheet, TrueSheetProps } from '@lodev09/react-native-true-sheet';
import { StyleSheet, View } from 'react-native';

interface BottomModalProps extends TrueSheetProps {
  children?: React.ReactNode;
  onClose?: () => void;
  name?: string;
  isGrabberVisible?: boolean;
  sizes?: SheetSize[] | undefined;
  footer?: ReactElement | ComponentType<any>;
  footerDefaultMargins?: boolean | number;
  onPresent?: () => void;
  onSizeChange?: (size: SizeInfo) => void;
}

export interface BottomModalHandle {
  present: () => Promise<void>;
  dismiss: () => Promise<void>;
}

const BottomModal = forwardRef<BottomModalHandle, BottomModalProps>(
  (
    { name, onClose, onPresent, onSizeChange, isGrabberVisible = true, sizes = ['auto'], footer, footerDefaultMargins, children, ...props },
    ref,
  ) => {
    const trueSheetRef = useRef<TrueSheet>(null);

    useImperativeHandle(ref, () => ({
      present: async () => {
        if (trueSheetRef.current?.present) {
          await trueSheetRef.current.present();
        } else {
          return Promise.resolve();
        }
      },
      dismiss: async () => {
        if (trueSheetRef.current?.dismiss) {
          await trueSheetRef.current.dismiss();
        } else {
          return Promise.resolve();
        }
      },
    }));

    const styles = StyleSheet.create({
      footerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
      },
    });

    let FooterComponent: ReactElement | ComponentType<any> | undefined;
    if (footer) {
      if (React.isValidElement(footer)) {
        FooterComponent = footerDefaultMargins ? <View style={styles.footerContainer}>{footer}</View> : footer;
      } else {
        FooterComponent = footer;
      }
    }

    return (
      <TrueSheet
        name={name ?? 'BottomModal'}
        ref={trueSheetRef}
        cornerRadius={24}
        sizes={sizes}
        onDismiss={onClose}
        onPresent={onPresent}
        onSizeChange={onSizeChange}
        grabber={isGrabberVisible}
        FooterComponent={FooterComponent}
        {...props}
        blurTint="regular"
      >
        {children}
      </TrueSheet>
    );
  },
);

export default BottomModal;
