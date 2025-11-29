# User Guide: InspectionService

## 1. Overview

The `InspectionService` is a core component of the property management backend, responsible for managing the entire lifecycle of property inspections. It handles the creation, retrieval, updating, and deletion of inspections, as well as associated entities like rooms, checklist items, photos, and signatures.

This service is designed to be used within a NestJS application and relies on other services for database access and email notifications.

## 2. Dependencies

The `InspectionService` depends on the following services, which must be injected into it:

-   `PrismaService`: Used for all database interactions with the underlying PostgreSQL or other database.
-   `EmailService`: Used to send email notifications to users (inspectors, tenants) at various stages of the inspection process.

## 3. Data Transfer Objects (DTOs)

The service uses several DTOs to structure the data sent to and from its methods. Key DTOs include:

-   `CreateInspectionDto`: Defines the data required to create a new inspection.
-   `UpdateInspectionDto`: Defines the data that can be updated on an existing inspection.
-   `CreateRoomDto`: Used to create a new room within an inspection.
-   `UpdateChecklistItemDto`: For updating a specific checklist item.
-   `UploadPhotoDto`: For adding a photo to a checklist item.
-   `CreateSignatureDto`: For adding a digital signature to an inspection.
-   `InspectionQueryDto`: For filtering and paginating through inspections.
-   `CreateInspectionWithRoomsDto`: A composite DTO to create an inspection along with its rooms.

## 4. Service Methods

This section details the public methods available in the `InspectionService`.

---

### `createInspection(dto: CreateInspectionDto, createdById: number): Promise<UnitInspection>`

-   **Description**: Creates a new inspection record. It validates the existence of the associated property, unit, and lease.
-   **Parameters**:
    -   `dto`: `CreateInspectionDto` - The data for the new inspection.
    -   `createdById`: `number` - The ID of the user creating the inspection.
-   **Returns**: A `Promise` that resolves to the newly created `UnitInspection` object, including its relations.
-   **Notifications**: Sends an email notification to the assigned inspector when an inspection is scheduled.

---

### `createInspectionWithRooms(dto: CreateInspectionWithRoomsDto, createdById: number): Promise<UnitInspection>`

-   **Description**: A convenience method that first creates an inspection and then populates it with rooms. It can create rooms from a custom list or generate a default set of rooms and checklist items based on the property type (e.g., 'apartment').
-   **Parameters**:
    -   `dto`: `CreateInspectionWithRoomsDto` - Contains the inspection data and an optional array of rooms.
    -   `createdById`: `number` - The ID of the user creating the inspection.
-   **Returns**: A `Promise` that resolves to the complete `UnitInspection` object with all its rooms and checklist items.

---

### `getInspectionById(id: number): Promise<UnitInspection>`

-   **Description**: Retrieves a single inspection by its unique ID, including all related data like property, unit, rooms, checklist items, photos, and signatures.
-   **Parameters**:
    -   `id`: `number` - The ID of the inspection to retrieve.
-   **Returns**: A `Promise` that resolves to the `UnitInspection` object.
-   **Throws**: `NotFoundException` if no inspection with the given ID is found.

---

### `getInspections(query: InspectionQueryDto): Promise<{ inspections: UnitInspection[]; total: number; }>`

-   **Description**: Retrieves a list of inspections with support for filtering and pagination.
-   **Parameters**:
    -   `query`: `InspectionQueryDto` - An object containing filter criteria (e.g., `propertyId`, `status`, `type`) and pagination options (`limit`, `offset`).
-   **Returns**: A `Promise` that resolves to an object containing an array of `inspections` and the `total` count of matching records.

---

### `updateInspection(id: number, dto: UpdateInspectionDto): Promise<UnitInspection>`

-   **Description**: Updates an existing inspection's details.
-   **Parameters**:
    -   `id`: `number` - The ID of the inspection to update.
    -   `dto`: `UpdateInspectionDto` - An object with the fields to be updated.
-   **Returns**: A `Promise` that resolves to the updated `UnitInspection` object.
-   **Notifications**: If the `status` of the inspection changes, it triggers notifications (e.g., for starting or completing an inspection).

---

### `createRoomWithDefaultChecklist(inspectionId: number, dto: CreateRoomDto): Promise<InspectionRoom>`

-   **Description**: Adds a room to an existing inspection and populates it with a default checklist based on the specified `roomType`.
-   **Parameters**:
    -   `inspectionId`: `number` - The ID of the inspection to add the room to.
    -   `dto`: `CreateRoomDto` - The data for the new room, including its `name` and `roomType`.
-   **Returns**: A `Promise` that resolves to the newly created `InspectionRoom` object with its checklist items.

---

### `updateChecklistItem(itemId: number, dto: UpdateChecklistItemDto): Promise<InspectionChecklistItem>`

-   **Description**: Updates the details of a single checklist item within a room (e.g., marking it as requiring action, adding notes).
-   **Parameters**:
    -   `itemId`: `number` - The ID of the checklist item to update.
    -   `dto`: `UpdateChecklistItemDto` - The data to update.
-   **Returns**: A `Promise` that resolves to the updated `InspectionChecklistItem`.
-   **Throws**: `NotFoundException` if the checklist item does not exist.

---

### `addPhotoToChecklistItem(itemId: number, dto: UploadPhotoDto, uploadedById: number): Promise<any>`

-   **Description**: Associates a photo with a specific checklist item.
-   **Parameters**:
    -   `itemId`: `number` - The ID of the checklist item.
    -   `dto`: `UploadPhotoDto` - Contains the `url` and `caption` of the photo.
    -   `uploadedById`: `number` - The ID of the user uploading the photo.
-   **Returns**: A `Promise` that resolves to the created `InspectionChecklistPhoto` object.

---

### `addSignature(inspectionId: number, dto: CreateSignatureDto): Promise<any>`

-   **Description**: Adds a digital signature to an inspection record from a user (e.g., tenant or inspector).
-   **Parameters**:
    -   `inspectionId`: `number` - The ID of the inspection to be signed.
    -   `dto`: `CreateSignatureDto` - Contains the `userId`, `role`, and `signatureData`.
-   **Returns**: A `Promise` that resolves to the created `InspectionSignature` object.
-   **Throws**: `BadRequestException` if the user has already signed the inspection.

---

### `completeInspection(id: number): Promise<UnitInspection>`

-   **Description**: Marks an inspection as 'COMPLETED' and sets the completion date.
-   **Parameters**:
    -   `id`: `number` - The ID of the inspection to complete.
-   **Returns**: A `Promise` that resolves to the updated `UnitInspection` object.
-   **Throws**: `BadRequestException` if the inspection is already completed.
-   **Notifications**: Sends an email notification to relevant parties that the inspection has been completed.

---

### `getInspectionStats(propertyId?: number): Promise<any>`

-   **Description**: Retrieves statistics about inspections, such as total counts and breakdowns by status.
-   **Parameters**:
    -   `propertyId` (optional): `number` - If provided, statistics will be scoped to a specific property.
-   **Returns**: A `Promise` that resolves to an object containing inspection statistics.

---

### `deleteInspection(id: number): Promise<void>`

-   **Description**: Deletes an inspection and all its related data.
-   **Parameters**:
    -   `id`: `number` - The ID of the inspection to delete.
-   **Returns**: A `Promise` that resolves when the deletion is complete.
-   **Throws**: `NotFoundException` if the inspection does not exist.

## 5. Notifications

The service automatically sends email notifications for key events in the inspection lifecycle:

-   **Inspection Scheduled**: An email is sent to the assigned inspector.
-   **Inspection Started**: An email is sent to the tenant when the inspection status changes to `IN_PROGRESS`.
-   **Inspection Completed**: Emails are sent to both the inspector and the tenant, indicating whether any items require action.

Error handling for email sending is done via `try-catch` blocks to prevent email failures from interrupting the main application flow.

## 6. Error Handling

The service provides clear error feedback by using NestJS's built-in HTTP exception classes:

-   `NotFoundException`: Thrown when a resource (like an inspection, property, or checklist item) cannot be found.
-   `BadRequestException`: Thrown for invalid requests, such as trying to complete an already completed inspection or adding a duplicate signature.
