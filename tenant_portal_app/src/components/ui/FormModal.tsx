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
      <ModalContent className="bg-deep-900">
        {(onClose) => (
          <>
            <ModalHeader className="text-xl font-bold text-white">{title}</ModalHeader>
            <ModalBody>{children}</ModalBody>
            <ModalFooter>
              <Button variant="flat" size="md" onPress={handleCancel}>
                {cancelLabel}
              </Button>
              <Button
                color="primary"
                size="md"
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