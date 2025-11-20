# Overall User Guide: Tenant Portal Backend

## 1. Introduction

Welcome to the Tenant Portal Backend. This document serves as a comprehensive guide for developers working on this application.

The backend is a robust, scalable, and maintainable server-side application designed to power the Property Management Suite. It provides a wide range of functionalities, from user authentication and property management to maintenance requests, payments, and real-time messaging.

## 2. Architecture

The application is built using the **NestJS** framework, a progressive Node.js framework for building efficient and scalable server-side applications. It follows a modular architecture, where features are organized into distinct modules.

Key technologies and patterns used:

-   **Framework**: NestJS
-   **Language**: TypeScript
-   **Database ORM**: Prisma
-   **Authentication**: JWT-based authentication
-   **API Style**: RESTful API

## 3. Getting Started

### Prerequisites

-   Node.js (v16 or later)
-   npm or yarn
-   A running PostgreSQL database (or the database configured for Prisma)

### Installation

1.  Clone the repository.
2.  Navigate to the `tenant_portal_backend` directory.
3.  Install the dependencies:
    ```bash
    npm install
    ```

### Configuration

The application requires a `.env` file in the root of the `tenant_portal_backend` directory for environment-specific configurations. Create a `.env` file by copying the `.env.example` file (if it exists) and fill in the required values, such as:

-   `DATABASE_URL`: The connection string for your database.
-   `JWT_SECRET`: A secret key for signing JWTs.
-   Email service credentials.
-   Other third-party API keys.

### Running the Application

To run the application in development mode with hot-reloading, use:

```bash
npm run start:dev
```

The application will be available at `http://localhost:3001`.

## 4. Core Features & Concepts

### API

-   **Global Prefix**: All API endpoints are prefixed with `/api`. For example, an endpoint `users/:id` in the `UsersController` will be accessible at `/api/users/:id`.
-   **CORS**: Cross-Origin Resource Sharing (CORS) is enabled by default, allowing requests from different origins.

### Validation

-   The application uses a global `ValidationPipe` with `whitelist: true`. This means that any properties in the request body that are not defined in the corresponding DTO will be automatically stripped out.

### Database

-   Database interactions are managed through **Prisma**. The `PrismaModule` provides a `PrismaService` that can be injected into other services to query the database.
-   The database schema is defined in `prisma/schema.prisma`. To apply schema changes, you can use Prisma's migration commands (e.g., `npx prisma migrate dev`).

### Scheduled Tasks

-   The application uses `@nestjs/schedule` for running cron jobs and other scheduled tasks. The `EventScheduleModule` likely contains custom scheduling logic.

## 5. Module Reference

The application is divided into the following modules:

-   **AuthModule**: Handles user authentication, including registration, login, and JWT management.
-   **BillingModule**: Manages billing and subscription-related functionalities.
-   **DocumentsModule**: Manages file uploads and document storage.
-   **EmailModule**: A utility module for sending emails.
-   **ExpenseModule**: Tracks and manages property-related expenses.
-   **InspectionsModule**: Manages property inspections, checklists, and reports.
-   **LeaseModule**: Handles the creation and management of leases.
-   **MaintenanceModule**: Manages maintenance requests from tenants.
-   **MessagingModule**: Powers real-time chat and messaging features.
-   **NotificationsModule**: Manages user notifications.
-   **PaymentsModule**: Integrates with payment gateways to process rent payments.
-   **PrismaModule**: Provides the `PrismaService` for database connectivity.
-   **PropertyModule**: Manages properties and units.
-   **RentalApplicationModule**: Handles the rental application process.
-   **RentEstimatorModule**: Provides rent estimation tools.
-   **ReportingModule**: Generates reports and analytics.
-   **ScheduleModule / EventScheduleModule**: Manages scheduled tasks and events.
-   **SecurityEventsModule**: Logs important security-related events.

## 6. Error Handling

The application should implement a global exception filter to catch and format errors consistently. Standard NestJS exceptions like `BadRequestException`, `NotFoundException`, and `UnauthorizedException` are used throughout the services and controllers to provide meaningful HTTP error responses.
