import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { SheetSize, TrueSheet, TrueSheetProps } from '@lodev09/react-native-true-sheet';

interface BottomModalProps extends TrueSheetProps {
  children?: React.ReactNode;
  onClose?: () => void;
  name?: string;
  isGrabberVisible?: boolean;
  sizes?: SheetSize[] | undefined;
}

export interface BottomModalHandle {
  present: () => Promise<void>;
  dismiss: () => Promise<void>;
}

const BottomModal = forwardRef<BottomModalHandle, BottomModalProps>(
  ({ name, onClose, onPresent, onSizeChange, isGrabberVisible = true, sizes = ['auto'], children, ...props }, ref) => {
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

    return (
      <TrueSheet
        name={name ?? 'BottomModal'}
        ref={trueSheetRef}
        cornerRadius={24}
        sizes={sizes}
        blurTint="regular"
        onDismiss={onClose}
        onPresent={onPresent}
        onSizeChange={onSizeChange}
        grabber={isGrabberVisible}

        {...props}
      >
        {children}
      </TrueSheet>
    );
  },
);

export default BottomModal;
