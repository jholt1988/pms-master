/**
 * P0-002: Form Error Announcer Component
 * Provides aria-live region for form validation errors
 * Ensures screen readers announce validation errors immediately
 */

import React from 'react';

interface FormErrorAnnouncerProps {
  errors: string[];
  fieldName?: string;
}

export const FormErrorAnnouncer: React.FC<FormErrorAnnouncerProps> = ({ 
  errors, 
  fieldName 
}) => {
  if (!errors || errors.length === 0) {
    return null;
  }

  const errorMessage = fieldName 
    ? `${fieldName}: ${errors.join(', ')}`
    : errors.join(', ');

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className="sr-only"
      style={{
        position: 'absolute',
        left: '-10000px',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      }}
    >
      {errorMessage}
    </div>
  );
};

/**
 * Hook for managing form errors with accessibility
 */
export function useFormErrors(fieldName?: string) {
  const [errors, setErrors] = React.useState<string[]>([]);

  const addError = React.useCallback((error: string) => {
    setErrors(prev => [...prev, error]);
  }, []);

  const clearErrors = React.useCallback(() => {
    setErrors([]);
  }, []);

  const ErrorAnnouncer = React.useMemo(
    () => <FormErrorAnnouncer errors={errors} fieldName={fieldName} />,
    [errors, fieldName]
  );

  return {
    errors,
    addError,
    clearErrors,
    ErrorAnnouncer,
    hasErrors: errors.length > 0,
  };
}

