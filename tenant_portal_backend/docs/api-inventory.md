# API Endpoint Inventory

This document lists all the API endpoints exposed by the backend application.

## Auth

| Method | Path                               | Controller Method | DTOs                                                              | Response Summary                               | Auth/Roles Required |
|--------|------------------------------------|-------------------|-------------------------------------------------------------------|------------------------------------------------|---------------------|
| POST   | `/auth/login`                      | `login`           | `LoginRequestDto`                                                 | `{ accessToken: string }`                      | Public              |
| POST   | `/auth/register`                   | `register`        | `RegisterRequestDto`                                              | `{ id, username, role }`                       | Public              |
| GET    | `/auth/password-policy`            | `getPasswordPolicy` | -                                                                 | `{ minLength, requireUppercase, ... }`         | Public              |
| GET    | `/auth/profile`                    | `getProfile`      | -                                                                 | `{ sub, username, role }`                      | JWT                 |
| POST   | `/auth/mfa/prepare`                | `prepareMfa`      | -                                                                 | `{ secret, qrCode }`                           | JWT                 |
| POST   | `/auth/mfa/activate`               | `activateMfa`     | `MfaActivateDto`                                                  | `{ success: true }`                            | JWT                 |
| POST   | `/auth/mfa/disable`                | `disableMfa`      | `MfaDisableDto`                                                   | `{ success: true }`                            | JWT                 |
| POST   | `/auth/forgot-password`            | `forgotPassword`  | `ForgotPasswordDto`                                               | `{ message: string }`                          | Public              |
| POST   | `/auth/reset-password`             | `resetPassword`   | `ResetPasswordDto`                                                | `{ message: string }`                          | Public              |

## Billing

| Method | Path                         | Controller Method  | DTOs                   | Response Summary      | Auth/Roles Required        |
|--------|------------------------------|--------------------|------------------------|-----------------------|----------------------------|
| GET    | `/billing/schedules`         | `listSchedules`    | -                      | `BillingSchedule[]`   | `PROPERTY_MANAGER`         |
| POST   | `/billing/schedules`         | `upsertSchedule`   | `UpsertScheduleDto`    | `BillingSchedule`     | `PROPERTY_MANAGER`         |
| PATCH  | `/billing/schedules/:leaseId/deactivate` | `deactivate`       | -                      | `BillingSchedule`     | `PROPERTY_MANAGER`         |
| GET    | `/billing/autopay`           | `getAutopay`       | -                      | `AutopayEnrollment`   | `TENANT`, `PROPERTY_MANAGER` |
| POST   | `/billing/autopay`           | `configureAutopay` | `ConfigureAutopayDto`  | `AutopayEnrollment`   | `TENANT`, `PROPERTY_MANAGER` |
| PATCH  | `/billing/autopay/:leaseId/disable` | `disableAutopay`   | -                      | `AutopayEnrollment`   | `TENANT`, `PROPERTY_MANAGER` |
| POST   | `/billing/run`               | `runBilling`       | -                      | `{ success: true }`   | `PROPERTY_MANAGER`         |

## Documents

| Method | Path                   | Controller Method | DTOs                                                              | Response Summary | Auth/Roles Required |
|--------|------------------------|-------------------|-------------------------------------------------------------------|------------------|---------------------|
| POST   | `/documents/upload`    | `uploadFile`      | `file`, `category`, `description?`, `leaseId?`, `propertyId?`      | `Document`       | JWT                 |
| GET    | `/documents`           | `listDocuments`   | `category?`, `leaseId?`, `propertyId?`, `skip?`, `take?`           | `Document[]`     | JWT                 |
| GET    | `/documents/:id/download` | `downloadFile`    | -                                                                 | File stream      | JWT                 |
| POST   | `/documents/:id/share` | `shareDocument`   | `userIds: number[]`                                               | `Document`       | JWT                 |
| DELETE | `/documents/:id`       | `deleteDocument`  | -                                                                 | `Document`       | JWT                 |

## eSignature

| Method | Path                                   | Controller Method      | DTOs                 | Response Summary  | Auth/Roles Required        |
|--------|----------------------------------------|------------------------|----------------------|-------------------|----------------------------|
| GET    | `/esignature/leases/:leaseId/envelopes`  | `getLeaseEnvelopes`    | -                    | `Envelope[]`      | `PROPERTY_MANAGER`, `TENANT` |
| POST   | `/esignature/leases/:leaseId/envelopes`  | `createEnvelope`       | `CreateEnvelopeDto`  | `Envelope`        | `PROPERTY_MANAGER`         |
| POST   | `/esignature/envelopes/:envelopeId/recipient-view` | `createRecipientView`  | `RecipientViewDto`   | `{ url: string }` | `TENANT`                   |
| POST   | `/webhooks/esignature`                 | `handleWebhook`        | `ProviderWebhookDto` | `{ received: true }` | Public                     |

## Expense

| Method | Path         | Controller Method | DTOs                                                              | Response Summary | Auth/Roles Required |
|--------|--------------|-------------------|-------------------------------------------------------------------|------------------|---------------------|
| POST   | `/expenses`  | `createExpense`   | `{ propertyId, unitId?, description, amount, date, category }`    | `Expense`        | `PROPERTY_MANAGER`  |
| GET    | `/expenses`  | `getAllExpenses`  | `propertyId?`, `unitId?`, `category?`                             | `Expense[]`      | `PROPERTY_MANAGER`  |
| GET    | `/expenses/:id` | `getExpenseById`  | -                                                                 | `Expense`        | `PROPERTY_MANAGER`  |
| PUT    | `/expenses/:id` | `updateExpense`   | `{ propertyId?, unitId?, description?, amount?, date?, category? }` | `Expense`        | `PROPERTY_MANAGER`  |
| DELETE | `/expenses/:id` | `deleteExpense`   | -                                                                 | `Expense`        | `PROPERTY_MANAGER`  |

## Health

| Method | Path             | Controller Method | DTOs | Response Summary | Auth/Roles Required |
|--------|------------------|-------------------|------|------------------|---------------------|
| GET    | `/health`        | `check`           | -    | Health check     | Public              |
| GET    | `/health/readiness` | `readiness`       | -    | Health check     | Public              |
| GET    | `/health/liveness` | `liveness`        | -    | Health check     | Public              |

## Inspection

| Method | Path                               | Controller Method                  | DTOs                           | Response Summary | Auth/Roles Required |
|--------|------------------------------------|------------------------------------|--------------------------------|------------------|---------------------|
| POST   | `/api/inspections`                   | `createInspection`                 | `CreateInspectionDto`          | `Inspection`     | JWT                 |
| POST   | `/api/inspections/with-rooms`        | `createInspectionWithRooms`        | `CreateInspectionWithRoomsDto` | `Inspection`     | JWT                 |
| GET    | `/api/inspections`                   | `getInspections`                   | `InspectionQueryDto`           | `Inspection[]`   | JWT                 |
| GET    | `/api/inspections/stats`             | `getInspectionStats`               | `propertyId?`                  | `object`         | JWT                 |
| GET    | `/api/inspections/:id`               | `getInspection`                    | -                              | `Inspection`     | JWT                 |
| PATCH  | `/api/inspections/:id`               | `updateInspection`                 | `UpdateInspectionDto`          | `Inspection`     | JWT                 |
| POST   | `/api/inspections/:id/complete`      | `completeInspection`               | -                              | `Inspection`     | JWT                 |
| DELETE | `/api/inspections/:id`               | `deleteInspection`                 | -                              | -                | JWT                 |
| POST   | `/api/inspections/:id/rooms`         | `createRoom`                       | `CreateRoomDto`                | `Room`           | JWT                 |
| PATCH  | `/api/inspections/items/:itemId`     | `updateChecklistItem`              | `UpdateChecklistItemDto`       | `ChecklistItem`  | JWT                 |
| POST   | `/api/inspections/items/:itemId/photos` | `addPhotoToChecklistItem`        | `UploadPhotoDto`               | `Photo`          | JWT                 |
| POST   | `/api/inspections/items/:itemId/photos/upload` | `uploadPhoto`                    | `file`, `caption?`             | `Photo`          | JWT                 |
| POST   | `/api/inspections/:id/signatures`    | `addSignature`                     | `CreateSignatureDto`           | `Signature`      | JWT                 |
| GET    | `/api/inspections/:id/report`        | `generateReport`                   | -                              | `object`         | JWT                 |
| POST   | `/api/inspections/:id/estimate`      | `generateEstimate`                 | -                              | `Estimate`       | JWT                 |
| GET    | `/api/inspections/:id/estimates`     | `getInspectionEstimates`           | -                              | `Estimate[]`     | JWT                 |
| POST   | `/api/estimates/from-maintenance/:requestId` | `generateEstimateFromMaintenance` | -                              | `Estimate`       | JWT                 |
| GET    | `/api/estimates`                     | `getEstimates`                     | `EstimateQueryDto`             | `Estimate[]`     | JWT                 |
| GET    | `/api/estimates/stats`               | `getEstimateStats`                 | `propertyId?`                  | `object`         | JWT                 |
| GET    | `/api/estimates/:id`                 | `getEstimate`                      | -                              | `Estimate`       | JWT                 |
| PATCH  | `/api/estimates/:id`                 | `updateEstimate`                   | `UpdateEstimateDto`            | `Estimate`       | JWT                 |
| POST   | `/api/estimates/:id/approve`         | `approveEstimate`                  | -                              | `Estimate`       | JWT                 |
post   | `/api/estimates/:id/reject`          | `rejectEstimate`                   | -                              | `Estimate`       | JWT                 |
| POST   | `/api/estimates/:id/convert-to-maintenance` | `convertToMaintenanceRequests` | -                              | `MaintenanceRequest[]` | JWT                 |
| GET    | `/api/estimates/:id/line-items`      | `getEstimateLineItems`             | -                              | `LineItem[]`     | JWT                 |

## Inspections

| Method | Path                   | Controller Method | DTOs                                                              | Response Summary | Auth/Roles Required |
|--------|------------------------|-------------------|-------------------------------------------------------------------|------------------|---------------------|
| POST   | `/inspections`         | `create`          | `CreateInspectionDto`                                             | `Inspection`     | `PROPERTY_MANAGER`  |
| GET    | `/inspections`         | `findAll`         | `unitId?`, `propertyId?`, `status?`, `type?`, `startDate?`, `endDate?`, `skip?`, `take?` | `Inspection[]`   | JWT                 |
| GET    | `/inspections/:id`     | `findOne`         | -                                                                 | `Inspection`     | JWT                 |
| PUT    | `/inspections/:id`     | `update`          | `UpdateInspectionDto`                                             | `Inspection`     | `PROPERTY_MANAGER`  |
| PUT    | `/inspections/:id/complete` | `complete`        | `CompleteInspectionDto`                                           | `Inspection`     | `PROPERTY_MANAGER`  |
| POST   | `/inspections/:id/photos` | `addPhoto`        | `file`, `caption`                                                 | `Photo`          | `PROPERTY_MANAGER`  |
| DELETE | `/inspections/:id`     | `delete`          | -                                                                 | `Inspection`     | `PROPERTY_MANAGER`  |

## Lease

| Method | Path                               | Controller Method          | DTOs                     | Response Summary | Auth/Roles Required        |
|--------|------------------------------------|----------------------------|--------------------------|------------------|----------------------------|
| POST   | `/leases`                          | `createLease`              | `CreateLeaseDto`         | `Lease`          | `PROPERTY_MANAGER`         |
| GET    | `/leases`                          | `getAllLeases`             | -                        | `Lease[]`        | `PROPERTY_MANAGER`         |
| GET    | `/leases/my-lease`                 | `getMyLease`               | -                        | `Lease`          | `TENANT`                   |
| GET    | `/leases/:id`                      | `getLeaseById`             | -                        | `Lease`          | `PROPERTY_MANAGER`         |
| GET    | `/leases/:id/history`              | `getLeaseHistory`          | -                        | `LeaseHistory[]` | `PROPERTY_MANAGER`         |
| PUT    | `/leases/:id`                      | `updateLease`              | `UpdateLeaseDto`         | `Lease`          | `PROPERTY_MANAGER`         |
| PUT    | `/leases/:id/status`               | `updateLeaseStatus`        | `UpdateLeaseStatusDto`   | `Lease`          | `PROPERTY_MANAGER`         |
| POST   | `/leases/:id/renewal-offers`       | `createRenewalOffer`       | `CreateRenewalOfferDto`  | `RenewalOffer`   | `PROPERTY_MANAGER`         |
| POST   | `/leases/:id/notices`              | `recordLeaseNotice`        | `RecordLeaseNoticeDto`   | `LeaseNotice`    | `PROPERTY_MANAGER`         |
| POST   | `/leases/:id/renewal-offers/:offerId/respond` | `respondToRenewalOffer`    | `RespondRenewalOfferDto` | `RenewalOffer`   | `TENANT`                   |
| POST   | `/leases/:id/tenant-notices`       | `submitTenantNotice`       | `TenantSubmitNoticeDto`  | `LeaseNotice`    | `TENANT`                   |

## Leasing

| Method | Path                               | Controller Method      | DTOs                                                              | Response Summary | Auth/Roles Required |
|--------|------------------------------------|------------------------|-------------------------------------------------------------------|------------------|---------------------|
| POST   | `/leasing/leads`                     | `createLead`           | `{ sessionId, ... }`                                              | `{ leadId }`     | Public              |
| GET    | `/leasing/leads/session/:sessionId`  | `getLeadBySession`     | -                                                                 | `Lead`           | Public              |
| GET    | `/leasing/leads/:id`                 | `getLeadById`          | -                                                                 | `Lead`           | Public              |
| GET    | `/leasing/leads`                     | `getLeads`             | `status?`, `search?`, `dateFrom?`, `dateTo?`, `limit?`, `offset?` | `Lead[]`         | Public              |
| POST   | `/leasing/leads/:id/messages`        | `addMessage`           | `{ role, content, metadata? }`                                    | `Message`        | Public              |
| GET    | `/leasing/leads/:id/messages`        | `getMessages`          | -                                                                 | `Message[]`      | Public              |
| POST   | `/leasing/leads/:id/properties/search` | `searchProperties`     | `{ bedrooms?, bathrooms?, maxRent?, petFriendly?, limit? }`      | `Property[]`     | Public              |
| POST   | `/leasing/leads/:id/inquiries`       | `recordInquiry`        | `{ propertyId, unitId?, interestLevel? }`                        | `Inquiry`        | Public              |
| PATCH  | `/leasing/leads/:id/status`          | `updateStatus`         | `{ status }`                                                      | `Lead`           | Public              |
| GET    | `/leasing/statistics`                | `getStatistics`        | `dateFrom?`, `dateTo?`                                            | `object`         | Public              |
| POST   | `/api/applications/submit`           | `submitApplication`    | `any`                                                             | `Application`    | Public              |
| GET    | `/api/applications/:id`              | `getApplicationById`   | -                                                                 | `Application`    | Public              |
| GET    | `/api/applications/lead/:leadId`     | `getApplicationsForLead` | -                                                                 | `Application[]`  | Public              |
| GET    | `/api/applications`                  | `getApplications`      | `propertyId?`, `status?`, `dateFrom?`, `dateTo?`, `limit?`, `offset?` | `Application[]`  | Public              |
| PATCH  | `/api/applications/:id/status`       | `updateStatus`         | `{ status, reviewedById?, reviewNotes? }`                        | `Application`    | Public              |
| PATCH  | `/api/applications/:id/screening`    | `updateScreening`      | `{ creditScore?, backgroundCheckStatus?, creditCheckStatus? }`   | `Application`    | Public              |
| POST   | `/api/applications/:id/payment`      | `recordPayment`        | `{ amount }`                                                      | `Application`    | Public              |
| POST   | `/api/tours/schedule`                | `scheduleTour`         | `{ leadId, propertyId, unitId?, preferredDate, preferredTime, notes? }` | `Tour`           | Public              |
| GET    | `/api/tours/:id`                     | `getTourById`          | -                                                                 | `Tour`           | Public              |
| GET    | `/api/tours/lead/:leadId`            | `getToursForLead`      | -                                                                 | `Tour[]`         | Public              |
| GET    | `/api/tours`                         | `getTours`             | `propertyId?`, `status?`, `dateFrom?`, `dateTo?`, `limit?`, `offset?` | `Tour[]`         | Public              |
| PATCH  | `/api/tours/:id/status`              | `updateStatus`         | `{ status, feedback? }`                                           | `Tour`           | Public              |
| PATCH  | `/api/tours/:id/assign`              | `assignTour`           | `{ userId }`                                                      | `Tour`           | Public              |
| PATCH  | `/api/tours/:id/reschedule`          | `rescheduleTour`       | `{ scheduledDate, scheduledTime }`                                | `Tour`           | Public              |

## Listing Syndication

| Method | Path                               | Controller Method      | DTOs                         | Response Summary | Auth/Roles Required |
|--------|------------------------------------|------------------------|------------------------------|------------------|---------------------|
| POST   | `/api/listings/syndication/:propertyId/trigger` | `triggerSyndication`   | `SyndicationActionDto`       | `object`         | `PROPERTY_MANAGER`  |
| POST   | `/api/listings/syndication/:propertyId/pause` | `pauseSyndication`     | `SyndicationActionDto`       | `object`         | `PROPERTY_MANAGER`  |
| GET    | `/api/listings/syndication/:propertyId/status` | `getStatus`            | -                            | `object`         | `PROPERTY_MANAGER`  |
| GET    | `/api/listings/syndication/credentials/all` | `listCredentials`      | -                            | `object[]`       | `PROPERTY_MANAGER`  |
| POST   | `/api/listings/syndication/credentials` | `upsertCredential`     | `UpsertChannelCredentialDto` | `object`         | `PROPERTY_MANAGER`  |

## Maintenance

| Method | Path                   | Controller Method    | DTOs                         | Response Summary         | Auth/Roles Required |
|--------|------------------------|----------------------|------------------------------|--------------------------|---------------------|
| GET    | `/maintenance`         | `findAll`            | `query`                      | `MaintenanceRequest[]`   | JWT                 |
| POST   | `/maintenance`         | `create`             | `CreateMaintenanceRequestDto`| `MaintenanceRequest`     | JWT                 |
| PATCH  | `/maintenance/:id/status` | `updateStatus`       | `UpdateMaintenanceStatusDto` | `MaintenanceRequest`     | `PROPERTY_MANAGER`  |
| PATCH  | `/maintenance/:id/assign` | `assignTechnician`   | `AssignTechnicianDto`        | `MaintenanceRequest`     | `PROPERTY_MANAGER`  |
| POST   | `/maintenance/:id/notes` | `addNote`            | `AddMaintenanceNoteDto`      | `MaintenanceNote`        | JWT                 |
| GET    | `/maintenance/technicians` | `listTechnicians`    | -                            | `Technician[]`           | `PROPERTY_MANAGER`  |
| POST   | `/maintenance/technicians` | `createTechnician`   | `body`                       | `Technician`             | `PROPERTY_MANAGER`  |
| GET    | `/maintenance/assets`    | `listAssets`         | `propertyId?`, `unitId?`     | `Asset[]`                | `PROPERTY_MANAGER`  |
| POST   | `/maintenance/assets`    | `createAsset`        | `body`                       | `Asset`                  | `PROPERTY_MANAGER`  |
| GET    | `/maintenance/sla-policies` | `getSlaPolicies`     | `propertyId?`                | `SlaPolicy[]`            | `PROPERTY_MANAGER`  |

## Messaging

| Method | Path                               | Controller Method        | DTOs                       | Response Summary      | Auth/Roles Required |
|--------|------------------------------------|--------------------------|----------------------------|-----------------------|---------------------|
| GET    | `/api/messaging/conversations`       | `getConversations`       | `GetConversationsQueryDto` | `Conversation[]`      | JWT                 |
| POST   | `/api/messaging/conversations`       | `createConversation`     | `CreateConversationDto`    | `Conversation`        | JWT                 |
| GET    | `/api/messaging/conversations/:id/messages` | `getConversationMessages` | `GetMessagesQueryDto`      | `Message[]`           | JWT                 |
| POST   | `/api/messaging/messages`            | `sendMessage`            | `CreateMessageDto`         | `Message`             | JWT                 |
| GET    | `/api/messaging/property-managers`   | `getPropertyManagers`    | -                          | `User[]`              | JWT                 |
| GET    | `/api/messaging/tenants`             | `getTenants`             | -                          | `User[]`              | `PROPERTY_MANAGER`  |
| GET    | `/api/messaging/users`               | `getAllUsers`            | -                          | `User[]`              | `PROPERTY_MANAGER`  |
| GET    | `/api/messaging/templates`           | `getTemplates`           | -                          | `Template[]`          | `PROPERTY_MANAGER`  |
| POST   | `/api/messaging/bulk/preview`        | `previewBulk`            | `CreateBulkMessageDto`     | `object`              | `PROPERTY_MANAGER`  |
| POST   | `/api/messaging/bulk`                | `queueBulk`              | `CreateBulkMessageDto`     | `object`              | `PROPERTY_MANAGER`  |
| GET    | `/api/messaging/bulk`                | `listBulkBatches`        | -                          | `object[]`            | `PROPERTY_MANAGER`  |
| GET    | `/api/messaging/bulk/:id`            | `getBulkBatch`           | -                          | `object`              | `PROPERTY_MANAGER`  |
| GET    | `/api/messaging/bulk/:id/recipients` | `getBulkRecipients`      | -                          | `object[]`            | `PROPERTY_MANAGER`  |
| GET    | `/api/messaging/bulk/:id/report`     | `getBulkReport`          | -                          | `object`              | `PROPERTY_MANAGER`  |
| GET    | `/api/messaging/admin/conversations` | `getAllConversations`    | `GetConversationsQueryDto` | `Conversation[]`      | `PROPERTY_MANAGER`  |
| GET    | `/api/messaging/search`              | `searchConversations`    | `q`                        | `Conversation[]`      | JWT                 |
| GET    | `/api/messaging/stats`               | `getStats`               | -                          | `object`              | `PROPERTY_MANAGER`  |

## Notifications

| Method | Path                   | Controller Method   | DTOs                               | Response Summary    | Auth/Roles Required |
|--------|------------------------|---------------------|------------------------------------|---------------------|---------------------|
| GET    | `/notifications`       | `getNotifications`  | `read?`, `type?`, `skip?`, `take?` | `Notification[]`    | JWT                 |
| GET    | `/notifications/unread-count` | `getUnreadCount`    | -                                  | `{ count: number }` | JWT                 |
| POST   | `/notifications/:id/read` | `markAsRead`        | -                                  | `{ success: true }` | JWT                 |
| POST   | `/notifications/read-all` | `markAllAsRead`     | -                                  | `{ success: true }` | JWT                 |
| DELETE | `/notifications/:id`   | `deleteNotification`| -                                  | `{ success: true }` | JWT                 |

## Payments

| Method | Path                         | Controller Method         | DTOs                     | Response Summary      | Auth/Roles Required        |
|--------|------------------------------|---------------------------|--------------------------|-----------------------|----------------------------|
| POST   | `/payments/invoices`         | `createInvoice`           | `CreateInvoiceDto`       | `Invoice`             | `PROPERTY_MANAGER`         |
| GET    | `/payments/invoices`         | `getInvoices`             | `leaseId?`               | `Invoice[]`           | `PROPERTY_MANAGER`, `TENANT` |
| POST   | `/payments`                  | `createPayment`           | `CreatePaymentDto`       | `Payment`             | `PROPERTY_MANAGER`         |
| GET    | `/payments`                  | `getPayments`             | `leaseId?`               | `Payment[]`           | `PROPERTY_MANAGER`, `TENANT` |
| GET    | `/payment-methods`           | `list`                    | -                        | `PaymentMethod[]`     | JWT                        |
| POST   | `/payment-methods`           | `create`                  | `CreatePaymentMethodDto` | `PaymentMethod`     | JWT                        |
| DELETE | `/payment-methods/:id`       | `delete`                  | -                        | `PaymentMethod`     | JWT                        |
| POST   | `/webhooks/stripe`           | `handleWebhook`           | `any`                    | `OK`                  | Public                     |

## Property

| Method | Path                         | Controller Method        | DTOs                       | Response Summary | Auth/Roles Required |
|--------|------------------------------|--------------------------|----------------------------|------------------|---------------------|
| POST   | `/api/properties`              | `createProperty`         | `CreatePropertyDto`        | `Property`       | `PROPERTY_MANAGER`  |
| POST   | `/api/properties/:id/units`    | `createUnit`             | `CreateUnitDto`            | `Unit`           | `PROPERTY_MANAGER`  |
| GET    | `/api/properties`              | `getAllProperties`       | -                          | `Property[]`     | `PROPERTY_MANAGER`  |
| GET    | `/api/properties/public`       | `getPublicProperties`    | -                          | `Property[]`     | Public              |
| GET    | `/api/properties/search`       | `searchProperties`       | `PropertySearchQueryDto`   | `Property[]`     | `PROPERTY_MANAGER`  |
| GET    | `/api/properties/public/search`| `getPublicSearch`        | `PropertySearchQueryDto`   | `Property[]`     | Public              |
| GET    | `/api/properties/saved-filters`| `getSavedFilters`        | -                          | `Filter[]`       | `PROPERTY_MANAGER`  |
| POST   | `/api/properties/saved-filters`| `saveFilter`             | `SavePropertyFilterDto`    | `Filter`         | `PROPERTY_MANAGER`  |
| DELETE | `/api/properties/saved-filters/:id` | `deleteFilter`           | -                          | -                | `PROPERTY_MANAGER`  |
| GET    | `/api/properties/:id`          | `getPropertyById`        | -                          | `Property`       | `PROPERTY_MANAGER`  |
| GET    | `/api/properties/:id/marketing`| `getMarketingProfile`    | -                          | `MarketingProfile` | `PROPERTY_MANAGER`  |
| POST   | `/api/properties/:id/marketing`| `updateMarketingProfile` | `UpdatePropertyMarketingDto` | `MarketingProfile` | `PROPERTY_MANAGER`  |

## QuickBooks

| Method | Path                   | Controller Method  | DTOs | Response Summary      | Auth/Roles Required |
|--------|------------------------|--------------------|------|-----------------------|---------------------|
| GET    | `/quickbooks/auth-url`   | `getAuthUrl`       | -    | `{ authUrl: string }` | JWT                 |
| GET    | `/quickbooks/callback`   | `handleCallback`   | `code`, `state`, `realmId` | `{ success, message }` | Public              |
| GET    | `/quickbooks/status`     | `getStatus`        | -    | `object`              | JWT                 |
| POST   | `/quickbooks/sync`       | `syncData`         | -    | `object`              | JWT                 |
| POST   | `/quickbooks/disconnect` | `disconnect`       | -    | `{ success, message }` | JWT                 |
| GET    | `/quickbooks/test-connection` | `testConnection`   | -    | `object`              | JWT                 |

## Rent Estimator

| Method | Path               | Controller Method | DTOs                     | Response Summary | Auth/Roles Required |
|--------|--------------------|-------------------|--------------------------|------------------|---------------------|
| GET    | `/rent-estimator`  | `estimateRent`    | `propertyId`, `unitId`   | `object`         | `PROPERTY_MANAGER`  |

## Rent Optimization

| Method | Path                               | Controller Method            | DTOs                     | Response Summary      | Auth/Roles Required |
|--------|------------------------------------|------------------------------|--------------------------|-----------------------|---------------------|
| GET    | `/rent-recommendations`              | `getAllRecommendations`      | -                        | `Recommendation[]`    | `PROPERTY_MANAGER`  |
| GET    | `/rent-recommendations/stats`        | `getStats`                   | -                        | `object`              | `PROPERTY_MANAGER`  |
| GET    | `/rent-recommendations/recent`       | `getRecentRecommendations`   | `limit?`                 | `Recommendation[]`    | `PROPERTY_MANAGER`  |
| GET    | `/rent-recommendations/pending`      | `getPendingRecommendations`  | -                        | `Recommendation[]`    | `PROPERTY_MANAGER`  |
| GET    | `/rent-recommendations/accepted`     | `getAcceptedRecommendations` | -                        | `Recommendation[]`    | `PROPERTY_MANAGER`  |
| GET    | `/rent-recommendations/rejected`     | `getRejectedRecommendations` | -                        | `Recommendation[]`    | `PROPERTY_MANAGER`  |
| GET    | `/rent-recommendations/property/:propertyId` | `getRecommendationsByProperty` | -                        | `Recommendation[]`    | `PROPERTY_MANAGER`  |
| GET    | `/rent-recommendations/comparison/:unitId` | `getComparison`              | -                        | `object`              | `PROPERTY_MANAGER`  |
| GET    | `/rent-recommendations/unit/:unitId` | `getRecommendationByUnit`    | -                        | `Recommendation`      | `PROPERTY_MANAGER`  |
| GET    | `/rent-recommendations/:id`          | `getRecommendation`          | -                        | `Recommendation`      | `PROPERTY_MANAGER`  |
| POST   | `/rent-recommendations/generate`     | `generateRecommendations`    | `{ unitIds: number[] }`  | `Recommendation[]`    | `PROPERTY_MANAGER`  |
| POST   | `/rent-recommendations/bulk-generate/property/:propertyId` | `bulkGenerateByProperty`     | -                        | `Recommendation[]`    | `PROPERTY_MANAGER`  |
| POST   | `/rent-recommendations/bulk-generate/all` | `bulkGenerateAll`          | -                        | `Recommendation[]`    | `PROPERTY_MANAGER`  |
| POST   | `/rent-recommendations/:id/accept`   | `acceptRecommendation`       | -                        | `Recommendation`      | `PROPERTY_MANAGER`  |
| POST   | `/rent-recommendations/:id/reject`   | `rejectRecommendation`       | -                        | `Recommendation`      | `PROPERTY_MANAGER`  |
| POST   | `/rent-recommendations/:id/apply`    | `applyRecommendation`        | -                        | `Recommendation`      | `PROPERTY_MANAGER`  |
| PUT    | `/rent-recommendations/:id/update`   | `updateRecommendation`       | `{ recommendedRent, reasoning? }` | `Recommendation`      | `PROPERTY_MANAGER`  |
| DELETE | `/rent-recommendations/:id`          | `deleteRecommendation`       | -                        | `Recommendation`      | `PROPERTY_MANAGER`  |

## Rental Application

| Method | Path                     | Controller Method       | DTOs                       | Response Summary | Auth/Roles Required |
|--------|--------------------------|-------------------------|----------------------------|------------------|---------------------|
| POST   | `/rental-applications`   | `submitApplication`     | `SubmitApplicationDto`     | `Application`    | Public              |
| GET    | `/rental-applications`   | `getAllApplications`    | -                          | `Application[]`  | `PROPERTY_MANAGER`  |
| GET    | `/rental-applications/my-applications` | `getMyApplications`     | -                          | `Application[]`  | `TENANT`            |
| GET    | `/rental-applications/:id` | `getApplicationById`    | -                          | `Application`    | `PROPERTY_MANAGER`  |
| PUT    | `/rental-applications/:id/status` | `updateApplicationStatus` | `{ status }`               | `Application`    | `PROPERTY_MANAGER`  |
| POST   | `/rental-applications/:id/screen` | `screenApplication`     | -                          | `Application`    | `PROPERTY_MANAGER`  |
| POST   | `/rental-applications/:id/notes` | `addNote`               | `AddRentalApplicationNoteDto` | `Note`           | `PROPERTY_MANAGER`  |

## Reporting

| Method | Path                       | Controller Method             | DTOs                               | Response Summary | Auth/Roles Required |
|--------|----------------------------|-------------------------------|------------------------------------|------------------|---------------------|
| GET    | `/reporting/rent-roll`     | `getRentRoll`                 | `propertyId?`, `status?`           | `object[]`       | `PROPERTY_MANAGER`  |
| GET    | `/reporting/profit-loss`   | `getProfitAndLoss`            | `propertyId?`, `startDate?`, `endDate?` | `object`         | `PROPERTY_MANAGER`  |
| GET    | `/reporting/maintenance-analytics` | `getMaintenanceAnalytics`     | `propertyId?`, `startDate?`, `endDate?` | `object`         | `PROPERTY_MANAGER`  |
| GET    | `/reporting/vacancy-rate`  | `getVacancyRate`              | `propertyId?`                      | `object`         | `PROPERTY_MANAGER`  |
| GET    | `/reporting/payment-history` | `getPaymentHistory`           | `userId?`, `propertyId?`, `startDate?`, `endDate?` | `object[]`       | `PROPERTY_MANAGER`  |

## Schedule

| Method | Path                 | Controller Method      | DTOs                     | Response Summary | Auth/Roles Required |
|--------|----------------------|------------------------|--------------------------|------------------|---------------------|
| GET    | `/schedule`          | `getAllEvents`         | -                        | `Event[]`        | `PROPERTY_MANAGER`  |
| GET    | `/schedule/summary`    | `getSummary`           | -                        | `object`         | `PROPERTY_MANAGER`  |
| GET    | `/schedule/daily`      | `getDailyEvents`       | `date`                   | `Event[]`        | `PROPERTY_MANAGER`  |
| GET    | `/schedule/weekly`     | `getWeeklyEvents`      | `startDate`              | `Event[]`        | `PROPERTY_MANAGER`  |
| GET    | `/schedule/monthly`    | `getMonthlyEvents`     | `month`, `year`          | `Event[]`        | `PROPERTY_MANAGER`  |
| GET    | `/schedule/expirations`| `getLeaseExpirations`  | -                        | `Lease[]`        | `PROPERTY_MANAGER`  |
| GET    | `/schedule/today`      | `getTodayEvents`       | -                        | `Event[]`        | `PROPERTY_MANAGER`  |
| GET    | `/schedule/this-week`  | `getThisWeekEvents`    | -                        | `Event[]`        | `PROPERTY_MANAGER`  |
| GET    | `/schedule/this-month` | `getThisMonthEvents`   | -                        | `Event[]`        | `PROPERTY_MANAGER`  |
| POST   | `/schedule`          | `createEvent`          | `CreateScheduleEventDto` | `Event`          | `PROPERTY_MANAGER`  |

## Security Events

| Method | Path               | Controller Method | DTOs                                                              | Response Summary | Auth/Roles Required |
|--------|--------------------|-------------------|-------------------------------------------------------------------|------------------|---------------------|
| GET    | `/security-events` | `list`            | `limit?`, `offset?`, `userId?`, `username?`, `type?`, `from?`, `to?` | `SecurityEvent[]`| `PROPERTY_MANAGER`  |

## Users

| Method | Path       | Controller Method | DTOs             | Response Summary | Auth/Roles Required |
|--------|------------|-------------------|------------------|------------------|---------------------|
| GET    | `/users`   | `listUsers`       | `ListUsersDto`   | `User[]`         | `PROPERTY_MANAGER`  |
| GET    | `/users/:id` | `getUser`         | -                | `User`           | `PROPERTY_MANAGER`  |
| POST   | `/users`   | `createUser`      | `CreateUserDto`  | `User`           | `PROPERTY_MANAGER`  |
| PUT    | `/users/:id` | `updateUser`      | `UpdateUserDto`  | `User`           | `PROPERTY_MANAGER`  |
| DELETE | `/users/:id` | `deleteUser`      | -                | `{ success: true }` | `PROPERTY_MANAGER`  |
