/**
 * P0-002: Accessible Form Field Component
 * Wrapper component that ensures proper labeling and error announcements
 */

import React from 'react';
import { Input, Textarea, Select, SelectItem } from '@nextui-org/react';
import { FormErrorAnnouncer } from './FormErrorAnnouncer';

interface FormFieldProps {
  label: string;
  name: string;
  errors?: string[];
  required?: boolean;
  children: React.ReactNode;
  description?: string;
  helpText?: string;
  hideLabel?: boolean; // Visually hide label but keep accessible
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  errors = [],
  required = false,
  children,
  description,
  helpText,
  hideLabel = true, // Default to visually hidden labels
}) => {
  const fieldId = `field-${name}`;
  const errorId = `${fieldId}-error`;
  const helpId = helpText ? `${fieldId}-help` : undefined;
  const describedBy = [errorId, helpId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="form-field">
      <FormErrorAnnouncer errors={errors} fieldName={label} />
      
      <label 
        htmlFor={fieldId}
        className={hideLabel ? "sr-only" : "block text-sm font-medium mb-1"}
      >
        {label}
        {required && (
          <span className="text-danger ml-1" aria-label="required">
            *
          </span>
        )}
      </label>

      {description && (
        <p id={helpId} className="text-sm text-foreground-500 mb-2">
          {description}
        </p>
      )}

      <div className="relative">
        {React.cloneElement(children as React.ReactElement<any>, {
          id: fieldId,
          'aria-describedby': describedBy,
          'aria-invalid': errors.length > 0,
          'aria-required': required,
        })}
      </div>

      {errors.length > 0 && (
        <div 
          id={errorId}
          role="alert"
          aria-live="polite"
          className="mt-1 text-sm text-danger"
        >
          {errors.map((error, index) => (
            <div key={index}>{error}</div>
          ))}
        </div>
      )}

      {helpText && !errors.length && (
        <p id={helpId} className="mt-1 text-sm text-foreground-500">
          {helpText}
        </p>
      )}
    </div>
  );
};

