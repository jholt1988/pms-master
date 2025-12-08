# Form Validation Accessibility Guide

**P0-002: Accessible Form Validation Implementation**

This document describes how to implement accessible form validation with proper error announcements.

**Last Updated:** January 2025

---

## Overview

Form validation errors must be announced to screen reader users immediately when they occur. This guide provides components and patterns for accessible form validation.

---

## Components Created

### 1. FormErrorAnnouncer Component

**Location:** `tenant_portal_app/src/components/ui/FormErrorAnnouncer.tsx`

**Purpose:** Provides aria-live region for form validation errors

**Features:**
- `role="alert"` for immediate announcements
- `aria-live="assertive"` for critical errors
- `aria-atomic="true"` for complete message reading
- Screen reader-only (visually hidden)

**Usage:**
```tsx
import { FormErrorAnnouncer } from '@/components/ui/FormErrorAnnouncer';

<FormErrorAnnouncer 
  errors={['Email is required', 'Email format is invalid']}
  fieldName="Email"
/>
```

### 2. FormField Component

**Location:** `tenant_portal_app/src/components/ui/FormField.tsx`

**Purpose:** Wrapper component that ensures proper labeling and error announcements

**Features:**
- Automatic label association with `htmlFor`
- Error announcements via `aria-describedby`
- `aria-invalid` for error state
- `aria-required` for required fields
- Help text support

**Usage:**
```tsx
import { FormField } from '@/components/ui/FormField';

<FormField
  label="Email Address"
  name="email"
  errors={errors.email}
  required
  description="We'll never share your email"
>
  <Input type="email" />
</FormField>
```

### 3. useFormErrors Hook

**Location:** `tenant_portal_app/src/components/ui/FormErrorAnnouncer.tsx`

**Purpose:** Hook for managing form errors with accessibility

**Usage:**
```tsx
import { useFormErrors } from '@/components/ui/FormErrorAnnouncer';

const { errors, addError, clearErrors, ErrorAnnouncer, hasErrors } = 
  useFormErrors('Email');

// In JSX
{ErrorAnnouncer}
```

---

## Best Practices

### 1. Error Announcements

**Do:**
- Use `role="alert"` for critical errors
- Use `aria-live="assertive"` for immediate errors
- Use `aria-live="polite"` for non-critical messages
- Include field name in error message
- Announce errors immediately when they occur

**Don't:**
- Hide errors from screen readers
- Use only visual indicators (color, icons)
- Delay error announcements
- Use generic error messages

### 2. Form Field Labeling

**Do:**
- Always associate labels with inputs using `htmlFor` and `id`
- Use `aria-describedby` to link help text and errors
- Mark required fields with `aria-required="true"`
- Use `aria-invalid="true"` when field has errors

**Don't:**
- Use placeholder text as the only label
- Rely on visual indicators alone
- Skip labels for icon-only inputs

### 3. Error Display

**Do:**
- Display errors near the field
- Use `role="alert"` for error containers
- Include error messages in aria-describedby
- Clear errors when field is corrected

**Don't:**
- Hide errors in tooltips only
- Use only color to indicate errors
- Place errors far from the field

---

## Implementation Examples

### Example 1: Basic Form Field with Errors

```tsx
import { FormField } from '@/components/ui/FormField';
import { Input } from '@nextui-org/react';

function MyForm() {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({ email: [] });

  const validateEmail = () => {
    const newErrors = [];
    if (!email) {
      newErrors.push('Email is required');
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.push('Email format is invalid');
    }
    setErrors({ email: newErrors });
  };

  return (
    <FormField
      label="Email Address"
      name="email"
      errors={errors.email}
      required
    >
      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onBlur={validateEmail}
      />
    </FormField>
  );
}
```

### Example 2: Using useFormErrors Hook

```tsx
import { useFormErrors } from '@/components/ui/FormErrorAnnouncer';
import { Input } from '@nextui-org/react';

function MyForm() {
  const [email, setEmail] = useState('');
  const { errors, addError, clearErrors, ErrorAnnouncer, hasErrors } = 
    useFormErrors('Email');

  const validateEmail = () => {
    clearErrors();
    if (!email) {
      addError('Email is required');
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      addError('Email format is invalid');
    }
  };

  return (
    <div>
      {ErrorAnnouncer}
      <label htmlFor="email">Email</label>
      <Input
        id="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onBlur={validateEmail}
        aria-invalid={hasErrors}
        aria-describedby={hasErrors ? 'email-error' : undefined}
      />
      {hasErrors && (
        <div id="email-error" role="alert" aria-live="polite">
          {errors.map((error, i) => <div key={i}>{error}</div>)}
        </div>
      )}
    </div>
  );
}
```

### Example 3: Form Submission Errors

```tsx
function MyForm() {
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async () => {
    try {
      await submitForm();
    } catch (error) {
      setSubmitError('Failed to submit form. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      
      {submitError && (
        <div 
          role="alert" 
          aria-live="assertive"
          className="text-danger"
        >
          {submitError}
        </div>
      )}
      
      <button type="submit">Submit</button>
    </form>
  );
}
```

---

## Testing

### Manual Testing Checklist
- [ ] Errors are announced immediately by screen reader
- [ ] Error messages include field name
- [ ] Errors are cleared when field is corrected
- [ ] Required fields are indicated
- [ ] Help text is announced
- [ ] Form submission errors are announced

### Automated Testing
- Use `@testing-library/react` to test error announcements
- Verify `role="alert"` is present on error containers
- Verify `aria-invalid` is set on fields with errors
- Verify `aria-describedby` links errors to fields

---

## WCAG 2.1 Compliance

### Success Criteria Met
- **3.3.1 Error Identification (Level A):** Errors are identified and described
- **3.3.2 Labels or Instructions (Level A):** Labels and instructions provided
- **3.3.3 Error Suggestion (Level AA):** Error suggestions provided
- **4.1.2 Name, Role, Value (Level A):** Form fields have accessible names
- **4.1.3 Status Messages (Level AA):** Status messages are announced

---

## Resources

- [WCAG 2.1 Form Validation](https://www.w3.org/WAI/WCAG21/Understanding/error-identification.html)
- [ARIA Authoring Practices - Forms](https://www.w3.org/WAI/ARIA/apg/patterns/form/)
- [WebAIM Form Accessibility](https://webaim.org/techniques/forms/)

---

**Last Updated:** January 2025  
**Status:** Components created, ready for integration

