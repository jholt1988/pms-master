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

  const modalId = `form-modal-${title.replace(/\s+/g, '-').toLowerCase()}`;
  const titleId = `${modalId}-title`;

  return (
    <Modal 
      isOpen={isOpen} 
      onOpenChange={onOpenChange} 
      size={size}
      aria-labelledby={titleId}
      aria-describedby={`${modalId}-description`}
    >
      <ModalContent 
        className="bg-deep-900"
        classNames={{
          base: "bg-deep-900 border border-white/10",
          backdrop: "bg-black/80 backdrop-blur-sm",
        }}
      >
        {(onClose) => (
          <>
            <ModalHeader id={titleId} className="text-xl font-bold text-white">
              {title}
            </ModalHeader>
            <ModalBody id={`${modalId}-description`}>
              {children}
            </ModalBody>
            <ModalFooter>
              <Button 
                variant="flat" 
                size="md" 
                onPress={handleCancel}
                aria-label={cancelLabel}
              >
                {cancelLabel}
              </Button>
              <Button
                color="primary"
                size="md"
                onPress={onSubmit}
                isLoading={isLoading}
                isDisabled={isDisabled}
                aria-label={submitLabel}
                aria-busy={isLoading}
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