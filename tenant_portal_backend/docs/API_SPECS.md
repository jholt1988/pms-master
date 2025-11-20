# 1. Full API Endpoint Inventory (Backend-Centric)

This inventory details all API endpoints discovered by scanning the `tenant_portal_backend/src/` directory, including controllers and their methods, as well as the `prisma/schema.prisma` for domain understanding.

## Auth Domain

| HTTP Method | Path                 | Controller + Method          | DTOs / Request Body Shape | Response Shape | Auth/Roles Required | Notes                                     |
| :---------- | :------------------- | :--------------------------- | :------------------------ | :------------- | :------------------ | :---------------------------------------- |
| `POST`      | `/auth/login`        | `AuthController.login`       | `LoginRequestDto`         | JWT token      | None                | Handles user login, returns JWT.          |
| `POST`      | `/auth/register`     | `AuthController.register`    | `RegisterRequestDto`      | User object    | None                | Registers a new user.                     |
| `GET`       | `/auth/password-policy` | `AuthController.getPasswordPolicy` | None                      | Password policy object | None                | Returns password policy rules.            |
| `GET`       | `/auth/profile`      | `AuthController.getProfile`  | None                      | User object    | `AuthGuard('jwt')`  | Returns the profile of the authenticated user. |
| `POST`      | `/auth/mfa/prepare`  | `AuthController.prepareMfa`  | None                      | MFA setup data | `AuthGuard('jwt')`  | Prepares MFA setup for authenticated user. |
| `POST`      | `/auth/mfa/activate` | `AuthController.activateMfa` | `MfaActivateDto`          | `{ success: true }` | `AuthGuard('jwt')`  | Activates MFA for authenticated user.     |
| `POST`      | `/auth/mfa/disable`  | `AuthController.disableMfa`  | `MfaDisableDto`           | `{ success: true }` | `AuthGuard('jwt')`  | Disables MFA for authenticated user.      |
| `POST`      | `/auth/forgot-password` | `AuthController.forgotPassword` | `ForgotPasswordDto`       | `{ message: string }` | None                | Initiates password reset process.         |
| `POST`      | `/auth/reset-password` | `AuthController.resetPassword` | `ResetPasswordDto`        | `{ message: string }` | None                | Resets user password using a token.       |

## Billing Domain

| HTTP Method | Path                               | Controller + Method          | DTOs / Request Body Shape | Response Shape | Auth/Roles Required | Notes                                     |
| :---------- | :--------------------------------- | :--------------------------- | :------------------------ | :------------- | :------------------ | :---------------------------------------- |
| `GET`       | `/billing/schedules`               | `BillingController.listSchedules` | None                      | List of schedules | `PROPERTY_MANAGER`  | Retrieves all billing schedules.          |
| `POST`      | `/billing/schedules`               | `BillingController.upsertSchedule` | `UpsertScheduleDto`       | Schedule object | `PROPERTY_MANAGER`  | Creates or updates a billing schedule.    |
| `PATCH`     | `/billing/schedules/:leaseId/deactivate` | `BillingController.deactivate` | None                      | Schedule object | `PROPERTY_MANAGER`  | Deactivates a billing schedule for a lease. |
| `GET`       | `/billing/autopay`                 | `BillingController.getAutopay` | Query param: `leaseId`    | Autopay enrollment | `TENANT`, `PROPERTY_MANAGER` | Retrieves autopay configuration for tenant or lease. |
| `POST`      | `/billing/autopay`                 | `BillingController.configureAutopay` | `ConfigureAutopayDto`     | Autopay enrollment | `TENANT`, `PROPERTY_MANAGER` | Configures autopay for a tenant or lease. |
| `PATCH`     | `/billing/autopay/:leaseId/disable` | `BillingController.disableAutopay` | None                      | Autopay enrollment | `TENANT`, `PROPERTY_MANAGER` | Disables autopay for a lease.             |
| `POST`      | `/billing/run`                     | `BillingController.runBilling` | None                      | Success status | `PROPERTY_MANAGER`  | Manually triggers billing run.            |

## Dashboard Domain

| HTTP Method | Path                       | Controller + Method                               | DTOs / Request Body Shape | Response Shape | Auth/Roles Required | Notes                                     |
| :---------- | :------------------------- | :------------------------------------------------ | :------------------------ | :------------- | :------------------ | :---------------------------------------- |
| `GET`       | `/api/dashboard/metrics`   | `DashboardController.getPropertyManagerDashboardMetrics` | None                      | Metrics object | `PROPERTY_MANAGER`  | Returns dashboard metrics for property managers. |
| `GET`       | `/api/dashboard/tenant`    | `DashboardController.getTenantDashboard`          | None                      | Dashboard data | `TENANT`            | Returns dashboard data for tenants.       |
| `GET`       | `/api/tenant/dashboard`    | `TenantDashboardController.getTenantDashboard`   | None                      | Dashboard data | `TENANT`            | Alias endpoint for the tenant dashboard.  |

## Documents Domain

| HTTP Method | Path                 | Controller + Method          | DTOs / Request Body Shape | Response Shape | Auth/Roles Required | Notes                                     |
| :---------- | :------------------- | :--------------------------- | :------------------------ | :------------- | :------------------ | :---------------------------------------- |
| `POST`      | `/documents/upload`  | `DocumentsController.uploadFile` | File upload (`file`), `category`, `description?`, `leaseId?`, `propertyId?` | Document object | Authenticated user | Uploads a file and associates it with categories/leases/properties. |
| `GET`       | `/documents`         | `DocumentsController.listDocuments` | Query params: `category?`, `leaseId?`, `propertyId?`, `skip?`, `take?` | List of documents | Authenticated user | Retrieves a list of documents with filtering and pagination. |
| `GET`       | `/documents/:id/download` | `DocumentsController.downloadFile` | None                      | File stream    | Authenticated user | Downloads a specific document.            |
| `POST`      | `/documents/:id/share` | `DocumentsController.shareDocument` | `{ userIds: number[] }`   | Success status | Authenticated user | Shares a document with specified users.   |
| `DELETE`    | `/documents/:id`     | `DocumentsController.deleteDocument` | None                      | Success status | Authenticated user | Deletes a specific document.              |

## E-signature Domain

| HTTP Method | Path                                   | Controller + Method                     | DTOs / Request Body Shape | Response Shape | Auth/Roles Required | Notes                                     |
| :---------- | :------------------------------------- | :-------------------------------------- | :------------------------ | :------------- | :------------------ | :---------------------------------------- |
| `GET`       | `/esignature/leases/:leaseId/envelopes` | `EsignatureController.getLeaseEnvelopes` | None                      | List of envelopes | `PROPERTY_MANAGER`, `TENANT` | Retrieves e-signature envelopes for a specific lease. |
| `POST`      | `/esignature/leases/:leaseId/envelopes` | `EsignatureController.createEnvelope`   | `CreateEnvelopeDto`       | Created envelope | `PROPERTY_MANAGER`  | Creates a new e-signature envelope for a lease. |
| `POST`      | `/esignature/envelopes/:envelopeId/recipient-view` | `EsignatureController.createRecipientView` | `RecipientViewDto`        | Recipient view URL | `TENANT`            | Creates a recipient view for an envelope, allowing a tenant to sign. |
| `POST`      | `/webhooks/esignature`                 | `EsignatureWebhookController.handleWebhook` | `ProviderWebhookDto`      | `{ received: true }` | None                | Endpoint for e-signature provider webhooks. |

## Expense Domain

| HTTP Method | Path                 | Controller + Method          | DTOs / Request Body Shape | Response Shape | Auth/Roles Required | Notes                                     |
| :---------- | :------------------- | :--------------------------- | :------------------------ | :------------- | :------------------ | :---------------------------------------- |
| `POST`      | `/expenses`          | `ExpenseController.createExpense` | `{ propertyId: number; unitId?: number; description: string; amount: number; date: Date; category: ExpenseCategory }` | Expense object | `PROPERTY_MANAGER`  | Creates a new expense record.             |
| `GET`       | `/expenses`          | `ExpenseController.getAllExpenses` | Query params: `propertyId?`, `unitId?`, `category?` | List of expenses | `PROPERTY_MANAGER`  | Retrieves all expenses with optional filtering. |
| `GET`       | `/expenses/:id`      | `ExpenseController.getExpenseById` | None                      | Expense object | `PROPERTY_MANAGER`  | Retrieves a single expense by ID.         |
| `PUT`       | `/expenses/:id`      | `ExpenseController.updateExpense` | `{ propertyId?: number; unitId?: number; description?: string; amount?: number; date?: Date; category?: ExpenseCategory }` | Updated expense | `PROPERTY_MANAGER`  | Updates an existing expense record.       |
| `DELETE`    | `/expenses/:id`      | `ExpenseController.deleteExpense` | None                      | Success status | `PROPERTY_MANAGER`  | Deletes a specific expense record.        |

## Health Domain

| HTTP Method | Path                 | Controller + Method          | DTOs / Request Body Shape | Response Shape | Auth/Roles Required | Notes                                     |
| :---------- | :------------------- | :--------------------------- | :------------------------ | :------------- | :------------------ | :---------------------------------------- |
| `GET`       | `/health`            | `HealthController.check`     | None                      | Health status  | None                | Comprehensive health check including database, memory, and ML service. |
| `GET`       | `/health/readiness`  | `HealthController.readiness` | None                      | Health status  | None                | Checks essential services for application readiness (e.g., database). |
| `GET`       | `/health/liveness`   | `HealthController.liveness`  | None                      | Health status  | None                | Basic liveness check (e.g., memory heap). |

## Inspection Domain (Singular)

| HTTP Method | Path                                   | Controller + Method                     | DTOs / Request Body Shape | Response Shape | Auth/Roles Required | Notes                                     |
| :---------- | :------------------------------------- | :-------------------------------------- | :------------------------ | :------------- | :------------------ | :---------------------------------------- |
| `POST`      | `/api/estimates/from-maintenance/:requestId` | `EstimateController.generateEstimateFromMaintenance` | None                      | Estimate object | Authenticated user | Generates an estimate from a maintenance request. |
| `GET`       | `/api/estimates`                       | `EstimateController.getEstimates`       | `EstimateQueryDto`        | List of estimates | None                | Retrieves a list of estimates based on query parameters. |
| `GET`       | `/api/estimates/stats`                 | `EstimateController.getEstimateStats`   | None                      | Stats object   | None                | Retrieves statistics about estimates, optionally filtered by property. |
| `GET`       | `/api/estimates/:id`                   | `EstimateController.getEstimate`        | None                      | Estimate object | None                | Retrieves a single estimate by ID.        |
| `PATCH`     | `/api/estimates/:id`                   | `EstimateController.updateEstimate`     | `UpdateEstimateDto`       | Updated estimate | Authenticated user | Updates an estimate.                      |
| `POST`      | `/api/estimates/:id/approve`           | `EstimateController.approveEstimate`    | None                      | Updated estimate | Authenticated user | Approves an estimate.                     |
| `POST`      | `/api/estimates/:id/reject`            | `EstimateController.rejectEstimate`     | None                      | Updated estimate | Authenticated user | Rejects an estimate.                      |
| `POST`      | `/api/estimates/:id/convert-to-maintenance` | `EstimateController.convertToMaintenanceRequests` | None                      | Maintenance request object | Authenticated user | Converts an estimate to maintenance requests. |
| `GET`       | `/api/estimates/:id/line-items`        | `EstimateController.getEstimateLineItems` | None                      | List of line items | None                | Retrieves line items for a specific estimate. |
| `POST`      | `/api/inspections`                     | `InspectionController.createInspection` | `CreateInspectionDto`     | Inspection object | Authenticated user | Creates a new inspection.                 |
| `POST`      | `/api/inspections/with-rooms`          | `InspectionController.createInspectionWithRooms` | `CreateInspectionWithRoomsDto` | Inspection object | Authenticated user | Creates a new inspection with pre-defined rooms. |
| `GET`       | `/api/inspections`                     | `InspectionController.getInspections`   | `InspectionQueryDto`      | List of inspections | None                | Retrieves a list of inspections based on query parameters. |
| `GET`       | `/api/inspections/stats`               | `InspectionController.getInspectionStats` | None                      | Stats object   | None                | Retrieves statistics about inspections, optionally filtered by property. |
| `GET`       | `/api/inspections/:id`                 | `InspectionController.getInspection`    | None                      | Inspection object | None                | Retrieves a single inspection by ID.      |
| `PATCH`     | `/api/inspections/:id`                 | `InspectionController.updateInspection` | `UpdateInspectionDto`     | Updated inspection | None                | Updates an inspection.                    |
| `POST`      | `/api/inspections/:id/complete`        | `InspectionController.completeInspection` | None                      | Updated inspection | None                | Completes an inspection.                  |
| `DELETE`    | `/api/inspections/:id`                 | `InspectionController.deleteInspection` | None                      | None (204 No Content) | None                | Deletes an inspection.                    |
| `POST`      | `/api/inspections/:id/rooms`           | `InspectionController.createRoom`       | `CreateRoomDto`           | Room object    | None                | Creates a new room for an inspection.     |
| `PATCH`     | `/api/inspections/items/:itemId`       | `InspectionController.updateChecklistItem` | `UpdateChecklistItemDto`  | Updated checklist item | None                | Updates a checklist item.                 |
| `POST`      | `/api/inspections/items/:itemId/photos` | `InspectionController.addPhotoToChecklistItem` | `UploadPhotoDto`          | Photo object   | Authenticated user | Adds a photo to a checklist item.         |
| `POST`      | `/api/inspections/items/:itemId/photos/upload` | `InspectionController.uploadPhoto`      | File upload (`file`), `caption` | Photo object   | Authenticated user | Uploads a photo for a checklist item.     |
| `POST`      | `/api/inspections/:id/signatures`      | `InspectionController.addSignature`     | `CreateSignatureDto`      | Signature object | None                | Adds a signature to an inspection.        |
| `GET`       | `/api/inspections/:id/report`          | `InspectionController.generateReport`   | None                      | Report data    | None                | Generates a report for an inspection.     |
| `POST`      | `/api/inspections/:id/estimate`        | `InspectionController.generateEstimate` | None                      | Estimate object | Authenticated user | Generates an estimate from an inspection. |
| `GET`       | `/api/inspections/:id/estimates`       | `InspectionController.getInspectionEstimates` | None                      | List of estimates | None                | Retrieves estimates associated with an inspection. |

## Inspections Domain (Plural)

| HTTP Method | Path                 | Controller + Method          | DTOs / Request Body Shape | Response Shape | Auth/Roles Required | Notes                                     |
| :---------- | :------------------- | :--------------------------- | :------------------------ | :------------- | :------------------ | :---------------------------------------- |
| `POST`      | `/inspections`       | `InspectionsController.create` | `CreateInspectionDto`     | Inspection object | `PROPERTY_MANAGER`  | Creates a new inspection record.          |
| `GET`       | `/inspections`       | `InspectionsController.findAll` | Query params: `unitId?`, `propertyId?`, `status?`, `type?`, `startDate?`, `endDate?`, `skip?`, `take?` | List of inspections | Authenticated user | Retrieves all inspection records with filtering and pagination. |
| `GET`       | `/inspections/:id`   | `InspectionsController.findOne` | None                      | Inspection object | Authenticated user | Retrieves a single inspection record by ID. |
| `PUT`       | `/inspections/:id`   | `InspectionsController.update` | `UpdateInspectionDto`     | Updated inspection | `PROPERTY_MANAGER`  | Updates an existing inspection record.    |
| `PUT`       | `/inspections/:id/complete` | `InspectionsController.complete` | `CompleteInspectionDto`   | Completed inspection | `PROPERTY_MANAGER`  | Marks an inspection as complete.          |
| `POST`      | `/inspections/:id/photos` | `InspectionsController.addPhoto` | File upload (`photo`), `caption` | Photo object   | `PROPERTY_MANAGER`  | Adds a photo to an inspection record.     |
| `DELETE`    | `/inspections/:id`   | `InspectionsController.delete` | None                      | Success status | `PROPERTY_MANAGER`  | Deletes an inspection record.             |

## Lease Domain

| HTTP Method | Path                                   | Controller + Method                     | DTOs / Request Body Shape | Response Shape | Auth/Roles Required | Notes                                     |
| :---------- | :------------------------------------- | :-------------------------------------- | :------------------------ | :------------- | :------------------ | :---------------------------------------- |
| `POST`      | `/leases`                              | `LeaseController.createLease`           | `CreateLeaseDto`          | Lease object   | `PROPERTY_MANAGER`  | Creates a new lease.                      |
| `GET`       | `/leases`                              | `LeaseController.getAllLeases`          | None                      | List of leases | `PROPERTY_MANAGER`  | Retrieves all leases.                     |
| `GET`       | `/leases/my-lease`                     | `LeaseController.getMyLease`            | None                      | Lease object   | `TENANT`            | Retrieves the lease associated with the authenticated tenant. |
| `GET`       | `/leases/:id`                          | `LeaseController.getLeaseById`          | None                      | Lease object   | `PROPERTY_MANAGER`  | Retrieves a single lease by ID.           |
| `GET`       | `/leases/:id/history`                  | `LeaseController.getLeaseHistory`       | None                      | Lease history  | `PROPERTY_MANAGER`  | Retrieves the history of a lease.         |
| `PUT`       | `/leases/:id`                          | `LeaseController.updateLease`           | `UpdateLeaseDto`          | Updated lease  | `PROPERTY_MANAGER`  | Updates an existing lease.                |
| `PUT`       | `/leases/:id/status`                   | `LeaseController.updateLeaseStatus`     | `UpdateLeaseStatusDto`    | Updated lease  | `PROPERTY_MANAGER`  | Updates the status of a lease.            |
| `POST`      | `/leases/:id/renewal-offers`           | `LeaseController.createRenewalOffer`    | `CreateRenewalOfferDto`   | Renewal offer  | `PROPERTY_MANAGER`  | Creates a renewal offer for a lease.      |
| `POST`      | `/leases/:id/notices`                  | `LeaseController.recordLeaseNotice`     | `RecordLeaseNoticeDto`    | Lease notice   | `PROPERTY_MANAGER`  | Records a lease notice.                   |
| `POST`      | `/leases/:id/renewal-offers/:offerId/respond` | `LeaseController.respondToRenewalOffer` | `RespondRenewalOfferDto`  | Renewal offer  | `TENANT`            | Tenant responds to a renewal offer.       |
| `POST`      | `/leases/:id/tenant-notices`           | `LeaseController.submitTenantNotice`    | `TenantSubmitNoticeDto`   | Tenant notice  | `TENANT`            | Tenant submits a notice for their lease.  |

## Leasing Domain

| HTTP Method | Path                                   | Controller + Method                     | DTOs / Request Body Shape | Response Shape | Auth/Roles Required | Notes                                     |
| :---------- | :------------------------------------- | :-------------------------------------- | :------------------------ | :------------- | :------------------ | :---------------------------------------- |
| `POST`      | `/api/applications/submit`             | `LeadApplicationsController.submitApplication` | Any (application data)    | `{ success: boolean, applicationId: string, message: string, application: object }` | None                | Submits a rental application.             |
| `GET`       | `/api/applications/:id`                | `LeadApplicationsController.getApplicationById` | None                      | `{ success: boolean, application: object }` | None                | Retrieves a rental application by ID.     |
| `GET`       | `/api/applications/lead/:leadId`       | `LeadApplicationsController.getApplicationsForLead` | None                      | `{ success: boolean, applications: array }` | None                | Retrieves all applications for a specific lead. |
| `GET`       | `/api/applications`                    | `LeadApplicationsController.getApplications` | Query params: `propertyId`, `status`, `dateFrom`, `dateTo`, `limit`, `offset` | `{ success: boolean, applications: array, total: number }` | None                | Retrieves all applications with filtering and pagination. |
| `PATCH`     | `/api/applications/:id/status`         | `LeadApplicationsController.updateStatus` | `{ status: string, reviewedById?: number, reviewNotes?: string }` | `{ success: boolean, application: object }` | None                | Updates the status of a rental application. |
| `PATCH`     | `/api/applications/:id/screening`      | `LeadApplicationsController.updateScreening` | `{ creditScore?: number, backgroundCheckStatus?: string, creditCheckStatus?: string }` | `{ success: boolean, application: object }` | None                | Updates screening results for an application. |
| `POST`      | `/api/applications/:id/payment`        | `LeadApplicationsController.recordPayment` | `{ amount: number }`      | `{ success: boolean, application: object, message: string }` | None                | Records a fee payment for an application. |
| `POST`      | `/api/leasing/leads`                   | `LeasingController.createLead`          | `{ sessionId: string, ...leadData: object }` | `{ success: boolean, leadId: string, message: string }` | None                | Creates or updates a lead.                |
| `GET`       | `/api/leasing/leads/session/:sessionId` | `LeasingController.getLeadBySession`    | None                      | `{ success: boolean, lead: object }` | None                | Retrieves a lead by session ID.           |
| `GET`       | `/api/leasing/leads/:id`               | `LeasingController.getLeadById`         | None                      | `{ success: boolean, lead: object }` | None                | Retrieves a lead by ID.                   |
| `GET`       | `/api/leasing/leads`                   | `LeasingController.getLeads`            | Query params: `status`, `search`, `dateFrom`, `dateTo`, `limit`, `offset` | `{ success: boolean, leads: array, total: number }` | None                | Retrieves all leads with filtering and pagination. |
| `POST`      | `/api/leasing/leads/:id/messages`      | `LeasingController.addMessage`          | `{ role: string, content: string, metadata?: object }` | `{ success: boolean, message: object }` | None                | Adds a message to a lead's conversation.  |
| `GET`       | `/api/leasing/leads/:id/messages`      | `LeasingController.getMessages`         | None                      | `{ success: boolean, messages: array }` | None                | Retrieves conversation history for a lead. |
| `POST`      | `/api/leasing/leads/:id/properties/search` | `LeasingController.searchProperties`    | `{ bedrooms?: number, bathrooms?: number, maxRent?: number, petFriendly?: boolean, limit?: number }` | `{ success: boolean, properties: array }` | None                | Searches for properties based on criteria. |
| `POST`      | `/api/leasing/leads/:id/inquiries`     | `LeasingController.recordInquiry`       | `{ propertyId: number, unitId?: number, interestLevel?: string }` | Inquiry object | None                | Records a property inquiry for a lead.    |
| `PATCH`     | `/api/leasing/leads/:id/status`        | `LeasingController.updateStatus`        | `{ status: string }`      | Lead object    | None                | Updates the status of a lead.             |
| `GET`       | `/api/leasing/statistics`              | `LeasingController.getStatistics`       | Query params: `dateFrom`, `dateTo` | Statistics object | None                | Retrieves leasing statistics.             |
| `POST`      | `/api/tours/schedule`                  | `ToursController.scheduleTour`          | `{ leadId: string, propertyId: number, unitId?: number, preferredDate: string, preferredTime: string, notes?: string }` | `{ success: boolean, tourId: string, message: string, tour: object }` | None                | Schedules a property tour.                |
| `GET`       | `/api/tours/:id`                       | `ToursController.getTourById`           | None                      | `{ success: boolean, tour: object }` | None                | Retrieves a tour by ID.                   |
| `GET`       | `/api/tours/lead/:leadId`              | `ToursController.getToursForLead`       | None                      | `{ success: boolean, tours: array }` | None                | Retrieves all tours for a specific lead.  |
| `GET`       | `/api/tours`                           | `ToursController.getTours`              | Query params: `propertyId`, `status`, `dateFrom`, `dateTo`, `limit`, `offset` | `{ success: boolean, tours: array, total: number }` | None                | Retrieves all tours with filtering and pagination. |
| `PATCH`     | `/api/tours/:id/status`                | `ToursController.updateStatus`          | `{ status: string, feedback?: string }` | `{ success: boolean, tour: object }` | None                | Updates the status of a tour.             |
| `PATCH`     | `/api/tours/:id/assign`                | `ToursController.assignTour`            | `{ userId: number }`      | `{ success: boolean, tour: object }` | None                | Assigns a tour to a property manager.     |
| `PATCH`     | `/api/tours/:id/reschedule`            | `ToursController.rescheduleTour`        | `{ scheduledDate: string, scheduledTime: string }` | `{ success: boolean, tour: object, message: string }` | None                | Reschedules a tour.                       |

## Listing Syndication Domain

| HTTP Method | Path                                   | Controller + Method                     | DTOs / Request Body Shape | Response Shape | Auth/Roles Required | Notes                                     |
| :---------- | :------------------------------------- | :-------------------------------------- | :------------------------ | :------------- | :------------------ | :---------------------------------------- |
| `POST`      | `/api/listings/syndication/:propertyId/trigger` | `ListingSyndicationController.triggerSyndication` | `SyndicationActionDto`    | Syndication status | `PROPERTY_MANAGER`  | Triggers syndication for a property.      |
| `POST`      | `/api/listings/syndication/:propertyId/pause` | `ListingSyndicationController.pauseSyndication` | `SyndicationActionDto`    | Syndication status | `PROPERTY_MANAGER`  | Pauses syndication for a property.        |
| `GET`       | `/api/listings/syndication/:propertyId/status` | `ListingSyndicationController.getStatus` | None                      | Syndication status | `PROPERTY_MANAGER`  | Retrieves syndication status for a property. |
| `GET`       | `/api/listings/syndication/credentials/all` | `ListingSyndicationController.listCredentials` | None                      | List of credentials | `PROPERTY_MANAGER`  | Lists all channel credentials.            |
| `POST`      | `/api/listings/syndication/credentials` | `ListingSyndicationController.upsertCredential` | `UpsertChannelCredentialDto` | Credential object | `PROPERTY_MANAGER`  | Creates or updates channel credentials.   |

## Maintenance Domain

| HTTP Method | Path                                   | Controller + Method                     | DTOs / Request Body Shape | Response Shape | Auth/Roles Required | Notes                                     |
| :---------- | :------------------------------------- | :-------------------------------------- | :------------------------ | :------------- | :------------------ | :---------------------------------------- |
| `GET`       | `/maintenance`                         | `MaintenanceController.findAll`         | Query params: `status`, `priority`, `propertyId`, `unitId`, `assigneeId`, `page`, `pageSize` | List of maintenance requests | `PROPERTY_MANAGER`, `TENANT` | Retrieves all maintenance requests (filtered for managers, user-specific for tenants). |
| `POST`      | `/maintenance`                         | `MaintenanceController.create`          | `CreateMaintenanceRequestDto` | Maintenance request object | Authenticated user | Creates a new maintenance request.        |
| `PATCH`     | `/maintenance/:id/status`              | `MaintenanceController.updateStatus`    | `UpdateMaintenanceStatusDto` | Updated maintenance request | `PROPERTY_MANAGER`  | Updates the status of a maintenance request. |
| `PATCH`     | `/maintenance/:id/assign`              | `MaintenanceController.assignTechnician` | `AssignTechnicianDto`     | Updated maintenance request | `PROPERTY_MANAGER`  | Assigns a technician to a maintenance request. |
| `POST`      | `/maintenance/:id/notes`               | `MaintenanceController.addNote`         | `AddMaintenanceNoteDto`   | Updated maintenance request | Authenticated user | Adds a note to a maintenance request.     |
| `GET`       | `/maintenance/technicians`             | `MaintenanceController.listTechnicians` | None                      | List of technicians | `PROPERTY_MANAGER`  | Lists all technicians.                    |
| `POST`      | `/maintenance/technicians`             | `MaintenanceController.createTechnician` | `{ name: string, phone?: string, email?: string, userId?: number, role?: string }` | Technician object | `PROPERTY_MANAGER`  | Creates a new technician.                 |
| `GET`       | `/maintenance/assets`                  | `MaintenanceController.listAssets`      | Query params: `propertyId`, `unitId` | List of assets | `PROPERTY_MANAGER`  | Lists assets, optionally filtered by property or unit. |
| `POST`      | `/maintenance/assets`                  | `MaintenanceController.createAsset`     | `{ propertyId: number, unitId?: number, name: string, category: string, manufacturer?: string, model?: string, serialNumber?: string, installDate?: string }` | Asset object   | `PROPERTY_MANAGER`  | Creates a new asset.                      |
| `GET`       | `/maintenance/sla-policies`            | `MaintenanceController.getSlaPolicies`  | Query params: `propertyId` | List of SLA policies | `PROPERTY_MANAGER`  | Retrieves SLA policies, optionally filtered by property. |

## Messaging Domain

| HTTP Method | Path                                   | Controller + Method                     | DTOs / Request Body Shape | Response Shape | Auth/Roles Required | Notes                                     |
| :---------- | :------------------------------------- | :-------------------------------------- | :------------------------ | :------------- | :------------------ | :---------------------------------------- |
| `GET`       | `/api/messaging/conversations`         | `MessagingController.getConversations`  | `GetConversationsQueryDto` | List of conversations | Authenticated user | Retrieves all conversations for the authenticated user. |
| `POST`      | `/api/messaging/conversations`         | `MessagingController.createConversation` | `CreateConversationDto`   | Conversation object | Authenticated user | Creates a new conversation.               |
| `GET`       | `/api/messaging/conversations/:id`     | `MessagingController.getConversation`   | None                      | Conversation object | Authenticated user | Retrieves a specific conversation by ID.  |
| `GET`       | `/messaging/conversations/:id`         | `MessagingLegacyController.getConversation` | None                      | Conversation object | Authenticated user | Legacy alias for compatibility.              |
| `GET`       | `/api/messaging/conversations/:id/messages` | `MessagingController.getConversationMessages` | `GetMessagesQueryDto`     | List of messages | Authenticated user | Retrieves messages within a specific conversation. |
| `GET`       | `/messaging/conversations/:id/messages` | `MessagingLegacyController.getMessages` | `GetMessagesQueryDto`     | List of messages | Authenticated user | Legacy alias for compatibility.              |
| `POST`      | `/api/messaging/messages`              | `MessagingController.sendMessage`       | `CreateMessageDto`        | Message object | Authenticated user | Sends a message to an existing or new conversation. |
| `GET`       | `/api/messaging/property-managers`     | `MessagingController.getPropertyManagers` | None                      | List of property managers | None                | Retrieves available property managers.    |
| `GET`       | `/api/messaging/tenants`               | `MessagingController.getTenants`        | None                      | List of tenants | `PROPERTY_MANAGER`  | Retrieves all tenants.                    |
| `GET`       | `/api/messaging/users`                 | `MessagingController.getAllUsers`       | None                      | List of users  | `PROPERTY_MANAGER`  | Retrieves all users (for admin management). |
| `GET`       | `/api/messaging/templates`             | `MessagingController.getTemplates`      | None                      | List of templates | `PROPERTY_MANAGER`  | Lists available templates for bulk messaging. |
| `POST`      | `/api/messaging/bulk/preview`          | `MessagingController.previewBulk`       | `CreateBulkMessageDto`    | Preview data   | `PROPERTY_MANAGER`  | Previews a bulk message.                  |
| `POST`      | `/api/messaging/bulk`                  | `MessagingController.queueBulk`         | `CreateBulkMessageDto`    | Bulk message batch object | `PROPERTY_MANAGER`  | Queues a bulk message for asynchronous delivery. |
| `GET`       | `/api/messaging/bulk`                  | `MessagingController.listBulkBatches`   | None                      | List of bulk message batches | `PROPERTY_MANAGER`  | Retrieves all bulk message batches.       |
| `GET`       | `/api/messaging/bulk/:id`              | `MessagingController.getBulkBatch`      | None                      | Bulk message batch object | `PROPERTY_MANAGER`  | Retrieves metadata and delivery stats for a specific bulk batch. |
| `GET`       | `/api/messaging/bulk/:id/recipients`   | `MessagingController.getBulkRecipients` | None                      | List of recipients | `PROPERTY_MANAGER`  | Retrieves per-recipient delivery statuses for a bulk batch. |
| `GET`       | `/api/messaging/bulk/:id/report`       | `MessagingController.getBulkReport`     | None                      | Delivery report | `PROPERTY_MANAGER`  | Retrieves a summarized delivery report for a batch. |
| `GET`       | `/api/messaging/admin/conversations`   | `MessagingController.getAllConversations` | `GetConversationsQueryDto` | List of conversations | `PROPERTY_MANAGER`  | Retrieves all conversations (admin view). |
| `GET`       | `/api/messaging/search`                | `MessagingController.searchConversations` | Query param: `q`          | List of conversations | Authenticated user | Searches conversations by username.       |
| `GET`       | `/api/messaging/stats`                 | `MessagingController.getStats`          | None                      | Statistics object | `PROPERTY_MANAGER`  | Retrieves conversation statistics.        |

## Notifications Domain

| HTTP Method | Path                                   | Controller + Method                     | DTOs / Request Body Shape | Response Shape | Auth/Roles Required | Notes                                     |
| :---------- | :------------------------------------- | :-------------------------------------- | :------------------------ | :------------- | :------------------ | :---------------------------------------- |
| `GET`       | `/notifications`                       | `NotificationsController.getNotifications` | Query params: `read`, `type`, `skip`, `take` | List of notifications | Authenticated user | Retrieves notifications for the authenticated user with filtering and pagination. |
| `GET`       | `/notifications/unread-count`          | `NotificationsController.getUnreadCount` | None                      | `{ count: number }` | Authenticated user | Retrieves the count of unread notifications for the authenticated user. |
| `POST`      | `/notifications/:id/read`              | `NotificationsController.markAsRead`    | None                      | `{ success: true }` | Authenticated user | Marks a specific notification as read.    |
| `POST`      | `/notifications/read-all`              | `NotificationsController.markAllAsRead` | None                      | `{ success: true }` | Authenticated user | Marks all notifications as read for the authenticated user. |
| `DELETE`    | `/notifications/:id`                   | `NotificationsController.deleteNotification` | None                      | `{ success: true }` | Authenticated user | Deletes a specific notification.          |

## Payments Domain

| HTTP Method | Path                                   | Controller + Method                     | DTOs / Request Body Shape | Response Shape | Auth/Roles Required | Notes                                     |
| :---------- | :------------------------------------- | :-------------------------------------- | :------------------------ | :------------- | :------------------ | :---------------------------------------- |
| `GET`       | `/payment-methods`                     | `PaymentMethodsController.list`         | None                      | List of payment methods | Authenticated user | Lists payment methods for the authenticated user. |
| `POST`      | `/payment-methods`                     | `PaymentMethodsController.create`       | `CreatePaymentMethodDto`  | Payment method object | Authenticated user | Creates a new payment method for the authenticated user. |
| `DELETE`    | `/payment-methods/:id`                 | `PaymentMethodsController.delete`       | None                      | Success status | Authenticated user | Deletes a payment method for the authenticated user. |
| `POST`      | `/payments/invoices`                   | `PaymentsController.createInvoice`      | `CreateInvoiceDto`        | Invoice object | `PROPERTY_MANAGER`  | Creates a new invoice.                    |
| `GET`       | `/payments/invoices`                   | `PaymentsController.getInvoices`        | Query param: `leaseId`    | List of invoices | `PROPERTY_MANAGER`, `TENANT` | Retrieves invoices for the user, optionally filtered by lease. |
| `POST`      | `/payments`                            | `PaymentsController.createPayment`      | `CreatePaymentDto`        | Payment object | `PROPERTY_MANAGER`  | Creates a new payment.                    |
| `GET`       | `/payments`                            | `PaymentsController.getPayments`        | Query param: `leaseId`    | List of payments | `PROPERTY_MANAGER`, `TENANT` | Retrieves payments for the user, optionally filtered by lease. |
| `POST`      | `/webhooks/stripe`                     | `StripeWebhookController.handleWebhook` | Stripe webhook event body | `OK` status    | None                | Handles Stripe webhook events.            |

## Property Domain

| HTTP Method | Path                                   | Controller + Method                     | DTOs / Request Body Shape | Response Shape | Auth/Roles Required | Notes                                     |
| :---------- | :------------------------------------- | :-------------------------------------- | :------------------------ | :------------- | :------------------ | :---------------------------------------- |
| `POST`      | `/api/properties`                      | `PropertyController.createProperty`     | `CreatePropertyDto`       | Property object | `PROPERTY_MANAGER`  | Creates a new property.                   |
| `POST`      | `/api/properties/:id/units`            | `PropertyController.createUnit`         | `CreateUnitDto`           | Unit object    | `PROPERTY_MANAGER`  | Creates a new unit for a specific property. |
| `GET`       | `/api/properties`                      | `PropertyController.getAllProperties`   | None                      | List of properties | `PROPERTY_MANAGER`  | Retrieves all properties.                 |
| `GET`       | `/api/properties/public`               | `PropertyController.getPublicProperties` | None                      | List of properties | None                | Retrieves all properties (publicly accessible). |
| `GET`       | `/api/properties/search`               | `PropertyController.searchProperties`   | `PropertySearchQueryDto`  | List of properties | `PROPERTY_MANAGER`  | Searches properties with various filters. |
| `GET`       | `/api/properties/public/search`        | `PropertyController.getPublicSearch`    | `PropertySearchQueryDto`  | List of properties | None                | Searches properties publicly with various filters. |
| `GET`       | `/api/properties/saved-filters`        | `PropertyController.getSavedFilters`    | None                      | List of saved filters | `PROPERTY_MANAGER`  | Retrieves saved property filters for the authenticated user. |
| `POST`      | `/api/properties/saved-filters`        | `PropertyController.saveFilter`         | `SavePropertyFilterDto`   | Saved filter object | `PROPERTY_MANAGER`  | Saves a property filter for the authenticated user. |
| `DELETE`    | `/api/properties/saved-filters/:id`    | `PropertyController.deleteFilter`       | None                      | None (204 No Content) | `PROPERTY_MANAGER`  | Deletes a saved property filter.          |
| `GET`       | `/api/properties/:id`                  | `PropertyController.getPropertyById`    | None                      | Property object | `PROPERTY_MANAGER`  | Retrieves a single property by ID.        |
| `GET`       | `/api/properties/:id/marketing`        | `PropertyController.getMarketingProfile` | None                      | Marketing profile object | `PROPERTY_MANAGER`  | Retrieves the marketing profile for a property. |
| `POST`      | `/api/properties/:id/marketing`        | `PropertyController.updateMarketingProfile` | `UpdatePropertyMarketingDto` | Marketing profile object | `PROPERTY_MANAGER`  | Updates the marketing profile for a property. |

## QuickBooks Domain

| HTTP Method | Path                 | Controller + Method          | DTOs / Request Body Shape | Response Shape | Auth/Roles Required | Notes                                     |
| :---------- | :------------------- | :--------------------------- | :------------------------ | :------------- | :------------------ | :---------------------------------------- |
| `GET`       | `/quickbooks/auth-url` | `QuickBooksController.getAuthUrl` | None                      | `{ authUrl: string }` | Authenticated user | Get QuickBooks OAuth authorization URL.   |
| `GET`       | `/quickbooks/callback` | `QuickBooksController.handleCallback` | Query params: `code`, `state`, `realmId` | `{ success: boolean, message: string, companyId: string }` | None                | Handle QuickBooks OAuth callback.         |
| `GET`       | `/quickbooks/status` | `QuickBooksController.getStatus` | None                      | `{ isConnected: boolean, lastSyncAt: string, companyName: string }` | Authenticated user | Get QuickBooks connection status.         |
| `POST`      | `/quickbooks/sync`   | `QuickBooksController.syncData` | None                      | `{ success: boolean, syncedItems: number, errors: array, lastSyncAt: string }` | Authenticated user | Sync property management data to QuickBooks. |
| `POST`      | `/quickbooks/disconnect` | `QuickBooksController.disconnect` | None                      | `{ success: boolean, message: string }` | Authenticated user | Disconnect QuickBooks integration.        |
| `GET`       | `/quickbooks/test-connection` | `QuickBooksController.testConnection` | None                      | `{ success: boolean, message: string }` | Authenticated user | Test QuickBooks connection.               |

**Note on Conflict:** There are two controllers, `quickbooks-minimal.controller.ts` and `quickbooks.controller.ts`, both defining endpoints under the `/quickbooks` path. The `quickbooks.controller.ts` seems to be the more actively developed one, using Swagger decorators and importing `QuickBooksMinimalService`. This suggests `quickbooks-minimal.controller.ts` might be deprecated or a base. For this inventory, `quickbooks.controller.ts` endpoints are listed. This conflict should be resolved during the implementation phase.

## Rent Estimator Domain

| HTTP Method | Path                 | Controller + Method          | DTOs / Request Body Shape | Response Shape | Auth/Roles Required | Notes                                     |
| :---------- | :------------------- | :--------------------------- | :------------------------ | :------------- | :------------------ | :---------------------------------------- |
| `GET`       | `/rent-estimator`    | `RentEstimatorController.estimateRent` | Query params: `propertyId`, `unitId` | Rent estimate object | `PROPERTY_MANAGER`  | Estimates rent for a given property and unit. |

## Rent Optimization Domain

| HTTP Method | Path                                   | Controller + Method                     | DTOs / Request Body Shape | Response Shape | Auth/Roles Required | Notes                                     |
| :---------- | :------------------------------------- | :-------------------------------------- | :------------------------ | :------------- | :------------------ | :---------------------------------------- |
| `GET`       | `/rent-recommendations`                | `RentOptimizationController.getAllRecommendations` | None                      | List of recommendations | `PROPERTY_MANAGER`  | Retrieves all rent recommendations.       |
| `GET`       | `/rent-recommendations/stats`          | `RentOptimizationController.getStats`   | None                      | Statistics object | `PROPERTY_MANAGER`  | Retrieves statistics about rent recommendations. |
| `GET`       | `/rent-recommendations/recent`         | `RentOptimizationController.getRecentRecommendations` | Query param: `limit`      | List of recommendations | `PROPERTY_MANAGER`  | Retrieves recent rent recommendations.    |
| `GET`       | `/rent-recommendations/pending`        | `RentOptimizationController.getPendingRecommendations` | None                      | List of recommendations | `PROPERTY_MANAGER`  | Retrieves pending rent recommendations.   |
| `GET`       | `/rent-recommendations/accepted`       | `RentOptimizationController.getAcceptedRecommendations` | None                      | List of recommendations | `PROPERTY_MANAGER`  | Retrieves accepted rent recommendations.  |
| `GET`       | `/rent-recommendations/rejected`       | `RentOptimizationController.getRejectedRecommendations` | None                      | List of recommendations | `PROPERTY_MANAGER`  | Retrieves rejected rent recommendations.  |
| `GET`       | `/rent-recommendations/property/:propertyId` | `RentOptimizationController.getRecommendationsByProperty` | None                      | List of recommendations | `PROPERTY_MANAGER`  | Retrieves rent recommendations for a specific property. |
| `GET`       | `/rent-recommendations/comparison/:unitId` | `RentOptimizationController.getComparison` | None                      | Comparison data | `PROPERTY_MANAGER`  | Retrieves comparison data for a unit.     |
| `GET`       | `/rent-recommendations/unit/:unitId`   | `RentOptimizationController.getRecommendationByUnit` | None                      | Recommendation object | `PROPERTY_MANAGER`  | Retrieves a rent recommendation for a specific unit. |
| `GET`       | `/rent-recommendations/:id`            | `RentOptimizationController.getRecommendation` | None                      | Recommendation object | `PROPERTY_MANAGER`  | Retrieves a single rent recommendation by ID. |
| `POST`      | `/rent-recommendations/generate`       | `RentOptimizationController.generateRecommendations` | `{ unitIds: number[] }`   | List of recommendations | `PROPERTY_MANAGER`  | Generates rent recommendations for specified units. |
| `POST`      | `/rent-recommendations/bulk-generate/property/:propertyId` | `RentOptimizationController.bulkGenerateByProperty` | None                      | List of recommendations | `PROPERTY_MANAGER`  | Bulk generates rent recommendations for a property. |
| `POST`      | `/rent-recommendations/bulk-generate/all` | `RentOptimizationController.bulkGenerateAll` | None                      | List of recommendations | `PROPERTY_MANAGER`  | Bulk generates rent recommendations for all units. |
| `POST`      | `/rent-recommendations/:id/accept`     | `RentOptimizationController.acceptRecommendation` | None                      | Updated recommendation | `PROPERTY_MANAGER`  | Accepts a rent recommendation.            |
| `POST`      | `/rent-recommendations/:id/reject`     | `RentOptimizationController.rejectRecommendation` | None                      | Updated recommendation | `PROPERTY_MANAGER`  | Rejects a rent recommendation.            |
| `POST`      | `/rent-recommendations/:id/apply`      | `RentOptimizationController.applyRecommendation` | None                      | Updated recommendation | `PROPERTY_MANAGER`  | Applies a rent recommendation.            |
| `PUT`       | `/rent-recommendations/:id/update`     | `RentOptimizationController.updateRecommendation` | `{ recommendedRent: number; reasoning?: string }` | Updated recommendation | `PROPERTY_MANAGER`  | Updates a rent recommendation.            |
| `DELETE`    | `/rent-recommendations/:id`            | `RentOptimizationController.deleteRecommendation` | None                      | None (200 OK)  | `PROPERTY_MANAGER`  | Deletes a rent recommendation.            |

## Rental Application Domain

| HTTP Method | Path                                   | Controller + Method                     | DTOs / Request Body Shape | Response Shape | Auth/Roles Required | Notes                                     |
| :---------- | :------------------------------------- | :-------------------------------------- | :------------------------ | :------------- | :------------------ | :---------------------------------------- |
| `POST`      | `/rental-applications`                 | `RentalApplicationController.submitApplication` | `SubmitApplicationDto`    | Application object | Optional Authenticated user | Submits a new rental application.         |
| `GET`       | `/rental-applications`                 | `RentalApplicationController.getAllApplications` | None                      | List of applications | `PROPERTY_MANAGER`  | Retrieves all rental applications.        |
| `GET`       | `/rental-applications/my-applications` | `RentalApplicationController.getMyApplications` | None                      | List of applications | `TENANT`            | Retrieves rental applications submitted by the authenticated tenant. |
| `GET`       | `/rental-applications/:id`             | `RentalApplicationController.getApplicationById` | None                      | Application object | `PROPERTY_MANAGER`  | Retrieves a single rental application by ID. |
| `PUT`       | `/rental-applications/:id/status`      | `RentalApplicationController.updateApplicationStatus` | `{ status: ApplicationStatus }` | Updated application | `PROPERTY_MANAGER`  | Updates the status of a rental application. |
| `POST`      | `/rental-applications/:id/screen`      | `RentalApplicationController.screenApplication` | None                      | Screening result | `PROPERTY_MANAGER`  | Screens a rental application.             |
| `POST`      | `/rental-applications/:id/notes`       | `RentalApplicationController.addNote`   | `AddRentalApplicationNoteDto` | Updated application | `PROPERTY_MANAGER`  | Adds a note to a rental application.      |

## Reporting Domain

| HTTP Method | Path                                   | Controller + Method                     | DTOs / Request Body Shape | Response Shape | Auth/Roles Required | Notes                                     |
| :---------- | :------------------------------------- | :-------------------------------------- | :------------------------ | :------------- | :------------------ | :---------------------------------------- |
| `GET`       | `/reporting/rent-roll`                 | `ReportingController.getRentRoll`       | Query params: `propertyId`, `status` | Rent roll data | `PROPERTY_MANAGER`  | Retrieves rent roll report.               |
| `GET`       | `/reporting/profit-loss`               | `ReportingController.getProfitAndLoss`  | Query params: `propertyId`, `startDate`, `endDate` | Profit and loss data | `PROPERTY_MANAGER`  | Retrieves profit and loss report.         |
| `GET`       | `/reporting/maintenance-analytics`     | `ReportingController.getMaintenanceAnalytics` | Query params: `propertyId`, `startDate`, `endDate` | Maintenance analytics data | `PROPERTY_MANAGER`  | Retrieves maintenance resolution analytics. |
| `GET`       | `/reporting/vacancy-rate`              | `ReportingController.getVacancyRate`    | Query param: `propertyId` | Vacancy rate data | `PROPERTY_MANAGER`  | Retrieves vacancy rate report.            |
| `GET`       | `/reporting/payment-history`           | `ReportingController.getPaymentHistory` | Query params: `userId`, `propertyId`, `startDate`, `endDate` | Payment history data | `PROPERTY_MANAGER`  | Retrieves payment history report.         |

## Schedule Domain

| HTTP Method | Path                                   | Controller + Method                     | DTOs / Request Body Shape | Response Shape | Auth/Roles Required | Notes                                     |
| :---------- | :------------------------------------- | :-------------------------------------- | :------------------------ | :------------- | :------------------ | :---------------------------------------- |
| `GET`       | `/schedule`                            | `ScheduleController.getAllEvents`       | None                      | List of events | `PROPERTY_MANAGER`  | Retrieves all scheduled events.           |
| `GET`       | `/schedule/summary`                    | `ScheduleController.getSummary`         | None                      | Summary object | `PROPERTY_MANAGER`  | Retrieves a summary of scheduled events.  |
| `GET`       | `/schedule/daily`                      | `ScheduleController.getDailyEvents`     | Query param: `date`       | List of events | `PROPERTY_MANAGER`  | Retrieves daily scheduled events.         |
| `GET`       | `/schedule/weekly`                     | `ScheduleController.getWeeklyEvents`    | Query param: `startDate`  | List of events | `PROPERTY_MANAGER`  | Retrieves weekly scheduled events.        |
| `GET`       | `/schedule/monthly`                    | `ScheduleController.getMonthlyEvents`   | Query params: `month`, `year` | List of events | `PROPERTY_MANAGER`  | Retrieves monthly scheduled events.       |
| `GET`       | `/schedule/expirations`                | `ScheduleController.getLeaseExpirations` | None                      | List of lease expirations | `PROPERTY_MANAGER`  | Retrieves lease expiration events.        |
| `GET`       | `/schedule/today`                      | `ScheduleController.getTodayEvents`     | None                      | List of events | `PROPERTY_MANAGER`  | Retrieves today's scheduled events.       |
| `GET`       | `/schedule/this-week`                  | `ScheduleController.getThisWeekEvents`  | None                      | List of events | `PROPERTY_MANAGER`  | Retrieves this week's scheduled events.   |
| `GET`       | `/schedule/this-month`                 | `ScheduleController.getThisMonthEvents` | None                      | List of events | `PROPERTY_MANAGER`  | Retrieves this month's scheduled events.  |
| `POST`      | `/schedule`                            | `ScheduleController.createEvent`        | `CreateScheduleEventDto`  | Event object   | `PROPERTY_MANAGER`  | Creates a new scheduled event.            |

## Security Events Domain

| HTTP Method | Path                                   | Controller + Method                     | DTOs / Request Body Shape | Response Shape | Auth/Roles Required | Notes                                     |
| :---------- | :------------------------------------- | :-------------------------------------- | :------------------------ | :------------- | :------------------ | :---------------------------------------- |
| `GET`       | `/security-events`                     | `SecurityEventsController.list`         | Query params: `limit`, `offset`, `userId`, `username`, `type`, `from`, `to` | List of security events | `PROPERTY_MANAGER`  | Retrieves a list of security events with filtering and pagination. |

## Users Domain

| HTTP Method | Path                                   | Controller + Method                     | DTOs / Request Body Shape | Response Shape | Auth/Roles Required | Notes                                     |
| :---------- | :------------------------------------- | :-------------------------------------- | :------------------------ | :------------- | :------------------ | :---------------------------------------- |
| `GET`       | `/users`                               | `UsersController.listUsers`             | `ListUsersDto` (query params: `skip`, `take`, `role`) | `{ data: User[], total: number, skip: number, take: number }` | `PROPERTY_MANAGER`  | Retrieves a list of users with filtering and pagination. |
| `GET`       | `/users/:id`                           | `UsersController.getUser`               | None                      | User object (without password) | `PROPERTY_MANAGER`  | Retrieves a single user by ID.            |
| `POST`      | `/users`                               | `UsersController.createUser`            | `CreateUserDto`           | User object    | `PROPERTY_MANAGER`  | Creates a new user.                       |
| `PUT`       | `/users/:id`                           | `UsersController.updateUser`            | `UpdateUserDto`           | Updated user object | `PROPERTY_MANAGER`  | Updates an existing user.                 |
| `DELETE`    | `/users/:id`                           | `UsersController.deleteUser`            | None                      | `{ success: true }` | `PROPERTY_MANAGER`  | Deletes a user.                           |

## App Domain

| HTTP Method | Path                 | Controller + Method          | DTOs / Request Body Shape | Response Shape | Auth/Roles Required | Notes                                     |
| :---------- | :------------------- | :--------------------------- | :------------------------ | :------------- | :------------------ | :---------------------------------------- |
| `GET`       | `/`                  | `AppController.getHello`     | None                      | `string`       | None                | Returns a simple "Hello World" message.   |
