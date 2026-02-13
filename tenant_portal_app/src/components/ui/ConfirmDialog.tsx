import React from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from '@nextui-org/react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onOpenChange: () => void;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onOpenChange,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmColor = 'danger',
  isLoading = false,
}) => {
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onOpenChange();
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onOpenChange={onOpenChange} 
      size="sm"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
    >
      <ModalContent className="bg-deep-900 border border-white/10">
        {(onClose) => (
          <>
            <ModalHeader id="confirm-dialog-title">{title}</ModalHeader>
            <ModalBody>
              <p id="confirm-dialog-message" className="text-foreground-600">{message}</p>
            </ModalBody>
            <ModalFooter>
              <Button 
                variant="flat" 
                onPress={handleCancel}
                aria-label={cancelLabel}
              >
                {cancelLabel}
              </Button>
              <Button
                color={confirmColor}
                onPress={onConfirm}
                isLoading={isLoading}
                aria-label={confirmLabel}
              >
                {confirmLabel}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};