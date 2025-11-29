# Rental Application

The Rental Application feature allows prospective tenants to apply for a rental property through a streamlined 3-step process, and enables property managers to view and manage rental applications efficiently.

## Application Process Overview

### For Prospective Tenants

The rental application follows a guided 3-step workflow designed to be completed in approximately 14 minutes:

#### Step 1: Application Landing Page (`/rental-application`)

Before starting your application, you'll see:
- **Process Timeline**: Visual breakdown of the 4 application steps
  - Personal Information (3 minutes)
  - Employment Verification (5 minutes)
  - Rental History (4 minutes)
  - Review & Submit (2 minutes)
- **Required Documents Checklist**:
  - Valid government-issued ID
  - Proof of income (recent pay stubs)
  - Previous landlord contact information
  - References (personal and professional)
- **Application Fee**: $50 (non-refundable)
- **What to Expect**: Information about the review process and timeline

**Getting Started:**
Click the "Start Application" button to proceed to the application form.

#### Step 2: Application Form (`/rental-application/form`)

Complete the comprehensive application form with the following sections:

**Personal Information:**
- Full legal name
- Date of birth
- Contact information (phone, email)
- Social Security Number (encrypted)
- Current address

**Employment Information:**
- Current employer name and address
- Position/Job title
- Length of employment
- Monthly income
- Supervisor contact information

**Rental History:**
- Current/previous address
- Landlord contact information
- Length of tenancy
- Reason for moving
- Rental payment history

**References:**
- Personal references (2 required)
- Professional references (1 required)
- Emergency contact

**Additional Information:**
- Number of occupants
- Pets (type, breed, weight)
- Vehicles (make, model, license plate)
- Background check consent
- Terms and conditions agreement

**Form Features:**
- Real-time validation
- Auto-save functionality (future enhancement)
- Progress indicator
- Section-by-section navigation

#### Step 3: Confirmation Page (`/rental-application/confirmation?id=xxx`)

After successful submission, you'll receive:

- **Unique Confirmation Code** (e.g., APP-123456)
- **What Happens Next Timeline**:
  1. Application Review (1-2 business days)
  2. Background & Credit Check (1 business day)
  3. Verification Calls (As needed)
  4. Final Decision (3 business days total)
- **Email Confirmation**: Sent to your registered email address
- **Create Account Option**: Set up an account to track application status
- **Next Steps**: Information about the approval/denial notification process

**Expected Timeline:**
Applications are typically reviewed within 1-3 business days. You will be contacted via email and phone once a decision is made.

## For Property Managers

### Managing Applications (`/rental-applications-management`)

Property managers have access to a comprehensive application management interface:

**Application Dashboard:**
- View all pending applications
- Filter by status (Pending, Under Review, Approved, Denied)
- Sort by submission date, property, or applicant name
- Quick action buttons for common tasks

**Application Review Features:**
- Complete applicant information display
- Document preview and download
- Background check results integration
- Credit score display
- Rental history verification
- Reference check tracking
- Internal notes and comments
- Approval workflow with reasons

**Actions Available:**
1. **Approve Application**: 
   - Generate lease agreement
   - Send approval notification
   - Set move-in date
   - Collect security deposit

2. **Deny Application**:
   - Select denial reason
   - Send automated notification (compliance with Fair Housing Act)
   - Archive application

3. **Request More Information**:
   - Send message to applicant
   - Specify required documents
   - Set response deadline

4. **Schedule Interview**:
   - Calendar integration
   - Send meeting invitation
   - Add property showing

## Application Routing

### Route Structure

| Route | Access | Component | Purpose |
|-------|--------|-----------|---------|
| `/rental-application` | Public | `ApplicationLandingPage` | Information and process overview |
| `/rental-application/form` | Public | `RentalApplicationFormPage` | Application form submission |
| `/rental-application/confirmation` | Public | `ApplicationConfirmationPage` | Submission confirmation |
| `/rental-applications-management` | Property Manager | `RentalApplicationsManagementPage` | Application review dashboard |

### Flow Implementation

```tsx
// User completes form and clicks Submit
const handleSubmit = async (e) => {
  const response = await fetch('/api/rental-applications', {
    method: 'POST',
    body: JSON.stringify(formData)
  });
  
  const data = await response.json();
  const applicationId = data.id;
  
  // Navigate to confirmation with application ID
  navigate(`/rental-application/confirmation?id=${applicationId}`);
};
```

## Application Status Tracking

Applicants can track their application status (future enhancement):

**Status Values:**
- **Submitted**: Application received
- **Under Review**: Being evaluated by property manager
- **Background Check**: Third-party verification in progress
- **Pending Decision**: Final review stage
- **Approved**: Application accepted
- **Denied**: Application rejected
- **More Info Needed**: Waiting for additional documents

## Best Practices

### For Applicants

1. **Prepare Documents in Advance**: Gather all required documents before starting
2. **Complete in One Session**: The form takes ~14 minutes - complete it without interruptions
3. **Double-Check Information**: Review all entries before submitting
4. **Save Confirmation Code**: Keep your confirmation number for reference
5. **Create an Account**: Enable status tracking by setting up an account
6. **Respond Promptly**: If more information is requested, provide it quickly

### For Property Managers

1. **Review Promptly**: Respond to applications within 24-48 hours
2. **Document Decisions**: Always provide clear reasons for denials
3. **Fair Housing Compliance**: Ensure all decisions follow Fair Housing Act guidelines
4. **Communicate Clearly**: Keep applicants informed of status changes
5. **Verify Information**: Always contact references and previous landlords
6. **Maintain Records**: Keep all applications on file per legal requirements

## Security & Privacy

- All personal information is encrypted at rest and in transit
- SSN is tokenized and never displayed in full
- Access is logged for audit purposes
- Data retention follows state/federal regulations
- GDPR and CCPA compliant (where applicable)

## Technical Details

**Components:**
- `ApplicationLandingPage.tsx`: Landing page with process information
- `ApplicationPage.tsx`: Form component with validation
- `ApplicationConfirmationPage.tsx`: Success page with confirmation
- `RentalApplicationsManagementPage.tsx`: Property manager dashboard

**State Management:**
- Form data stored in component state
- Submission triggers API call to backend
- Success response includes application ID
- Navigation to confirmation with ID parameter

**Styling:**
- NextUI v2.6.11 components
- Design tokens for consistency
- Responsive layout for mobile/desktop
- Accessibility (WCAG 2.1 AA compliant)

## API Endpoints

```typescript
// Submit new application
POST /api/rental-applications
Body: ApplicationFormData
Response: { id: string, confirmationCode: string }

// Get application by ID (for tracking)
GET /api/rental-applications/:id
Response: ApplicationDetails

// Property Manager: List applications
GET /api/rental-applications
Query: { status?, propertyId?, page?, limit? }
Response: { applications: Application[], total: number }

// Property Manager: Update application status
PATCH /api/rental-applications/:id
Body: { status: string, notes?: string }
Response: UpdatedApplication
```

## Troubleshooting

### Form Won't Submit
- Check all required fields are filled
- Ensure file uploads are complete
- Verify email format is valid
- Check network connection

### Missing Confirmation Code
- Check email spam/junk folder
- Contact property manager with submission timestamp
- Confirmation codes are also stored in database

### Status Not Updating
- Allow 1-2 business days for initial review
- Check email for update notifications
- Contact property manager if >3 days with no update

## Related Documentation
- [Routing System](Routing-System.md)
- [Authentication](Authentication.md)
- [Payments](Payments.md) - For application fee processing
- [Tenant Screening](Tenant-Screening.md) - Background check integration
