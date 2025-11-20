import React from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from '@nextui-org/react';

interface FormModalProps {
  isOpen: boolean;
  onOpenChange: () => void;
  title: string;
  children: React.ReactNode;
  onSubmit: () => void;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  isDisabled?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full';
}

export const FormModal: React.FC<FormModalProps> = ({
  isOpen,
  onOpenChange,
  title,
  children,
  onSubmit,
  onCancel,
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  isLoading = false,
  isDisabled = false,
  size = 'md',
}) => {
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onOpenChange();
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size={size}>
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader>{title}</ModalHeader>
            <ModalBody>{children}</ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={handleCancel}>
                {cancelLabel}
              </Button>
              <Button
                color="primary"
                onPress={onSubmit}
                isLoading={isLoading}
                isDisabled={isDisabled}
              >
                {submitLabel}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};