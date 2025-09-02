Arkan Alnumo Brownfield Enhancement Architecture
1. Introduction
This document outlines the architectural approach for enhancing the Arkan Alnumo system. Its primary goal is to serve as the guiding architectural blueprint for AI-driven development of new features while ensuring seamless and safe integration with the existing, production-ready system.

This document supplements the existing architecture by defining how new components and modules—such as the CRM, advanced scheduling, and a complete IEP system—will integrate with the current infrastructure.

1.1. Existing Project Analysis
My analysis of the provided documentation confirms the following about your current system:

Primary Purpose: A comprehensive, bilingual (Arabic/English) therapy management system for the Saudi Arabian healthcare market, functioning as a medical-grade ERP.

Current Tech Stack: A modern stack composed of a React 18.2 + TypeScript 5.3 frontend and a Supabase (PostgreSQL 15) backend. Key technologies include Tailwind CSS, TanStack Query, React Hook Form, and n8n for automation.

Architecture Style: The backend is a serverless architecture utilizing Supabase for authentication, database, real-time subscriptions, and edge functions. The frontend is a modular, component-based structure.

Deployment Method: The frontend is deployed via Netlify with build optimization.

Identified Constraints:

Security: The system must maintain stringent security with Row Level Security (RLS) on all sensitive tables and adhere to Saudi PDPL compliance.

Bilingual Support: All new features must support the Arabic-first, RTL/LTR design.

Technical Debt: There is significant technical debt in testing, with a strong recommendation to increase coverage to over 80%.

Please confirm these observations are accurate before I proceed with architectural recommendations.

1.2. Change Log
Date	Version	Description	Author
2025-08-30	1.0	Initial draft of the brownfield enhancement architecture.	Winston, Architect

2. Enhancement Scope and Integration Strategy
Based on my analysis, the integration approach for the new enhancements will prioritize stability, consistency, and minimal disruption to the existing production environment. The new modules will be built as extensions of the current architecture, leveraging existing patterns and services wherever possible.

2.1. Enhancement Overview
Enhancement Type: This is a major feature enhancement, introducing new core modules (CRM, Scheduling, Financials) and completing existing ones (IEP, Parent Portal) to transition the application into a full-fledged ERP system.

Scope: The scope includes database schema extensions, new frontend components and pages, new Supabase Edge Functions for business logic, and new n8n workflows for automation.

Integration Impact: Significant Impact. While we will follow existing patterns, the new modules will introduce new data models and workflows that will interact extensively with the current students, therapists, and therapy_plans tables.

2.2. Integration Approach
Code Integration Strategy: New features will be developed within the existing monorepo structure. Frontend components will be added to src/components/ under new domain folders (e.g., src/components/crm/, src/components/scheduling/). Backend logic will be implemented as new Supabase Edge Functions.

Database Integration: The enhancement will require extending the current PostgreSQL schema. New tables for leads, installments, attendance_logs, and subscriptions will be created with foreign key relationships to the existing students table. All new tables will have Row Level Security (RLS) policies applied by default, consistent with the current security model.

API Integration: New backend functionality will be exposed via new, dedicated API endpoints. We will maintain the existing API structure and will not introduce breaking changes to current endpoints.

UI Integration: New pages and features will be integrated into the existing React Router DOM v6 structure and will appear as new items in the role-based sidebar navigation.

2.3. Compatibility Requirements
Existing API Compatibility: All existing API endpoints will remain fully backward compatible. No breaking changes will be introduced.

Database Schema Compatibility: All database changes will be additive. No existing columns or tables will be removed or altered in a way that breaks the current application.

UI/UX Consistency: All new components and views will adhere strictly to the established design system in ui-ux-specification.md, using the existing shadcn/ui component library, color palette, and typography.

Performance Impact: New features must not degrade the performance of the existing application. New database queries will be optimized, and frontend additions will adhere to the performance targets of < 2-second load times.

VALIDATION CHECKPOINT: The integration approach I'm proposing takes into account your serverless Supabase backend and modular React frontend. These integration points and boundaries are designed to respect your current architecture patterns.


3. Tech Stack Alignment
The guiding principle for this enhancement is to maintain 100% consistency with the existing technology stack. The new features and modules are designed to be built using the same frameworks, libraries, and services that are currently in production. This approach minimizes risk, ensures maintainability, and leverages the existing team expertise.

My analysis confirms that no new technologies are required to implement the features outlined in the PRD, including the CRM, scheduling, and financial modules. The existing stack is robust and well-suited for these additions.

3.1. Existing Technology Stack for Enhancement
The following table documents the current technology stack that will be used for all new development. All versions and patterns will be strictly adhered to.

Category	Current Technology	Version	Usage in Enhancement	Notes
Frontend Framework	React	18.2	All new UI components and pages (CRM, Scheduling, etc.)	Continue using functional components with hooks.
Language	TypeScript	5.3	All new frontend and backend code.	Enforce strict mode to maintain code quality.
Backend Platform	Supabase	N/A	All backend services, database, and authentication.	New backend logic will be deployed as Supabase Edge Functions.
Database	PostgreSQL	15	All new tables (leads, subscriptions, installments, etc.).	All new tables will include RLS policies by default.
Styling	Tailwind CSS	3.4	All new UI components.	Continue to use existing design tokens and utility classes.
UI Components	shadcn/ui	N/A	All new UI elements (forms, tables, dialogs, etc.).	Guarantees visual and interactive consistency.
State Management	TanStack Query v5	5	Management of all server state for new features.	Continue using a 5-minute stale time for cached data.
Automation	n8n	N/A	New workflows for CRM and scheduling reminders.	New webhooks will be configured for these workflows.

Export to Sheets
This disciplined approach ensures that the enhancements feel like a native part of the existing application, rather than a disconnected addition.

4. Data Models and Schema Changes
To support the new CRM, scheduling, and financial features, we will extend the existing PostgreSQL database with several new tables. These models are designed to integrate seamlessly with your current students and therapy_plans tables.

All schema changes will be managed through versioned SQL migration scripts to ensure a safe and repeatable deployment process.

4.1. New Data Models
leads Model
Purpose: To manage the entire lifecycle of a potential student, from the initial evaluation booking to final registration. This forms the core of the new CRM functionality.

Integration: A lead can be converted into a student, at which point a new record is created in the students table.

Key Attributes:

parent_name: text

parent_contact: text

child_name: text

child_dob: date

status: enum ('new_booking', 'confirmed', 'evaluation_complete', 'registered', 'archived')

evaluation_date: timestamp

notes: text

Relationships:

With New: Can be linked to a student record upon conversion.

student_subscriptions Model
Purpose: To manage a student's enrollment in a specific therapy program, including tracking of freeze days and the program's duration.

Integration: This table will have a direct foreign key relationship to the students table and the therapy_programs table.

Key Attributes:

student_id: uuid (FK to students.id)

therapy_program_id: uuid (FK to therapy_programs.id)

start_date: date

end_date: date

freeze_days_allowed: integer

freeze_days_used: integer

is_active: boolean

Relationships:

With Existing: Belongs to one student and one therapy_program.

attendance_logs Model
Purpose: To store all QR code scan events, providing a detailed log of both center-wide and session-specific attendance.

Integration: Directly linked to the students table and optionally to a specific therapy_sessions record.

Key Attributes:

student_id: uuid (FK to students.id)

session_id: uuid (optional FK to therapy_sessions.id)

timestamp: timestamp with time zone

event_type: enum ('center_check_in', 'center_check_out', 'session_check_in')

Relationships:

With Existing: Belongs to one student. Can belong to one therapy_session.

installment_plans Model
Purpose: To manage and track installment-based payment schedules for student subscriptions.

Integration: Linked to a specific student_subscription.

Key Attributes:

subscription_id: uuid (FK to student_subscriptions.id)

total_amount: numeric

due_date: date

amount_paid: numeric

status: enum ('pending', 'paid', 'overdue')

Relationships:

With New: Belongs to one student_subscription.

4.2. Schema Integration Strategy
Database Changes Required:

New Tables: leads, student_subscriptions, attendance_logs, installment_plans.

Modified Tables: No modifications to existing tables are required, ensuring backward compatibility.

New Indexes: Appropriate indexes will be created on foreign keys and frequently queried columns (e.g., status, event_type) to ensure performance.

Migration Strategy: All changes will be implemented via new, numbered SQL migration files, following the existing pattern (e.g., 027_crm_schema.sql, 028_subscriptions_schema.sql, etc.).

5. Component Architecture
The enhancement will be implemented by introducing new, domain-specific components that follow the existing modular structure. This ensures a clean separation of concerns and allows for independent development and testing.

MANDATORY VALIDATION: The new components I'm proposing are designed to follow the existing architectural patterns I identified in your codebase: a modular React frontend with domain-based organization (e.g., components/therapy/, components/admin/) and a backend powered by discrete Supabase Edge Functions for business logic. The integration interfaces will respect your current component structure and data flow patterns.

Does this match your project's reality?

5.1. New Components
CRM Lead Management (Frontend Component)
Responsibility: Provides the user interface for managing the entire lead lifecycle, from initial booking to conversion. This includes the Kanban-style dashboard for tracking leads.

Integration Points:

Fetches and updates lead data via a new lead-service Supabase Edge Function.

Upon lead conversion, it will call the existing student-service to create a new student record.

Key Interfaces:

Displays lead data in a filterable, sortable view.

Provides forms for updating lead status and notes.

Dependencies:

Existing Components: Uses the base Card, Dialog, and Form components from shadcn/ui.

New Components: None.

Student Subscription (Backend Service & Frontend Component)
Responsibility: Manages the business logic for student subscriptions, including program enrollment, duration, and the freeze/reschedule functionality.

Integration Points:

The backend service (Supabase Edge Function) will interact directly with the student_subscriptions and therapy_sessions tables.

The frontend component will provide the UI for admins to manage a student's subscription from their profile page.

Key Interfaces:

freezeSubscription(subscriptionId, startDate, endDate)

getSubscriptionDetails(studentId)

Dependencies:

Existing Components: Ties into the StudentDetailsPage frontend component.

New Components: None.

QR Attendance (Backend Service & Frontend Component)
Responsibility: Handles the logic for processing QR code scans and provides a UI for viewing attendance logs.

Integration Points:

The backend service (Supabase Edge Function) will be a dedicated endpoint that receives QR scan data, validates it, and creates records in the attendance_logs table.

A new frontend component will display attendance history on the student's profile.

Key Interfaces:

logAttendance(studentId, eventType, sessionId?)

Dependencies:

Existing Components: The UI will be a new tab within the StudentDetailsPage.

Financial & Installments (Backend Service & Frontend Component)
Responsibility: Manages the creation and tracking of installment plans for subscriptions.

Integration Points:

The backend service (Supabase Edge Function) will calculate installment schedules and update payment statuses.

The frontend component will provide the interface for creating and viewing these plans.

Key Interfaces:

createInstallmentPlan(subscriptionId, totalAmount, installments)

getInstallmentPlan(subscriptionId)

Dependencies:

Existing Components: Will be a new page accessible from the main BillingDashboard.

5.2. Component Interaction Diagram
This diagram illustrates how the new components (in green) will interact with the existing system architecture.

Code snippet

graph TD
    subgraph Frontend (React)
        A[Existing UI Components]
        B(CRM Lead Management)
        C(Student Subscription UI)
        D(QR Attendance UI)
        E(Financials UI)
    end

    subgraph Backend (Supabase)
        F[Existing Edge Functions]
        G[Existing Database Tables]
        H(Lead Service)
        I(Subscription Service)
        J(QR Attendance Service)
        K(Financial Service)
        L(New Database Tables)
    end

    subgraph External
        M[Amelia Plugin (WordPress)]
        N[n8n Automation]
    end

    A --- F
    B --- H
    C --- I
    D --- J
    E --- K

    F --- G
    H --- G & L
    I --- G & L
    J --- G & L
    K --- G & L

    M --Webhook--> N
    N --API Call--> H

    style B fill:#90EE90
    style C fill:#90EE90
    style D fill:#90EE90
    style E fill:#90EE90
    style H fill:#90EE90
    style I fill:#90EE90
    style J fill:#90EE90
    style K fill:#90EE90
    style L fill:#90EE90

6. API Design and Integration
The new features require additional backend endpoints. All new endpoints will be created as Supabase Edge Functions and integrated into the existing API gateway structure. We will follow the established RESTful patterns to maintain consistency.

6.1. API Integration Strategy
API Integration Strategy: We will adopt an additive API strategy. New endpoints will be created under logical resource paths (e.g., /api/leads, /api/subscriptions). No existing endpoints will be modified or deprecated, ensuring zero impact on the current production frontend.

Authentication: All new endpoints will be protected by the existing Supabase JWT authentication middleware. Role-based access will be enforced within each function, leveraging the RLS policies defined at the database level.

Versioning: The new endpoints will be considered part of the current API version. No new version path (e.g., /v2/) is required at this stage.

6.2. New API Endpoints
Lead Management Endpoints (CRM)
Endpoint: POST /api/leads

Purpose: Creates a new lead record from the public-facing evaluation booking form. This endpoint will be called by an n8n workflow that syncs with the Amelia WordPress plugin.

Request Body:

JSON

{
  "parent_name": "string",
  "parent_contact": "string",
  "child_name": "string",
  "child_dob": "date",
  "evaluation_date": "timestamp"
}
Response: 201 Created with the newly created lead object.

Endpoint: PUT /api/leads/:id/status

Purpose: Updates the status of a lead (e.g., from 'new_booking' to 'confirmed'). Restricted to admin/manager roles.

Request Body:

JSON

{
  "status": "confirmed"
}
Response: 200 OK with the updated lead object.

Subscription Management Endpoints
Endpoint: POST /api/subscriptions/freeze

Purpose: Freezes a student's subscription for a given period. This will trigger the rescheduling logic on the backend. Restricted to admin/manager roles.

Request Body:

JSON

{
  "subscription_id": "uuid",
  "start_date": "date",
  "end_date": "date"
}
Response: 200 OK with a success message and the updated subscription details.

Attendance Logging Endpoint
Endpoint: POST /api/attendance

Purpose: Logs a student attendance event from a QR code scan. Authenticated for staff roles.

Request Body:

JSON

{
  "student_id": "uuid",
  "event_type": "center_check_in"
}
Response: 201 Created with the new attendance log record.

7. External API Integration
The enhancement introduces two key external integrations that are crucial for the CRM and communication workflows.

7.1. Amelia WordPress Plugin (via n8n)
Purpose: To capture new lead data from the "Book Free Evaluation" form on the public-facing WordPress website and sync it with the Arkan Alnumo CRM.

Integration Method: The integration will be asynchronous and managed by an n8n workflow.

The Amelia plugin on WordPress will trigger a webhook upon a new successful booking.

An n8n workflow will listen for this webhook, receive the booking data, and transform it.

The n8n workflow will then make a secure API call to our new POST /api/leads endpoint to create the lead in the Arkan Alnumo system.

Authentication: The n8n webhook will be secured with a secret token. The API call from n8n to our backend will use a dedicated, long-lived API key.

7.2. WhatsApp Business API
Purpose: To send automated notifications to parents, such as appointment confirmations and reminders, as part of the CRM and scheduling workflows.

Integration Method: An n8n workflow will serve as the middleware to connect our application to the WhatsApp Business API (Meta API).

Actions within our application (e.g., updating a lead's status to "Confirmed") will trigger a webhook call to a specific n8n workflow.

The n8n workflow will format a pre-approved message template.

n8n will then make a secure API call to the WhatsApp Business API to dispatch the message.

Authentication: The connection between n8n and the WhatsApp Business API will be authenticated using a permanent access token managed within n8n.

8. Source Tree Integration
The new modules will be integrated into the existing source tree by creating new, domain-specific directories. This approach follows your current organizational pattern and ensures a clear separation of concerns.

8.1. Existing Project Structure (Relevant Areas)
Based on my analysis of your current-architecture.md file, the relevant part of your existing structure is as follows:

src/
│   ├── components/
│   │   ├── admin/
│   │   ├── analytics/
│   │   ├── auth/
│   │   ├── billing/
│   │   ├── forms/
│   │   ├── layout/
│   │   ├── parent/
│   │   ├── therapy/
│   │   └── ui/
│   ├── pages/
│   └── types/

8.2. New File Organization
New files for the enhancement will be added to this structure. Below, I've highlighted the new folders and their intended contents.
src/
│   ├── components/
│   │   ├── admin/
│   │   ├── analytics/
│   │   ├── auth/
│   │   ├── billing/
│   │   ├── crm/           # ✅ NEW: For CRM components like the Kanban board
│   │   ├── forms/
│   │   ├── layout/
│   │   ├── parent/
│   │   ├── scheduling/    # ✅ NEW: For calendar and scheduling components
│   │   ├── students/      # ✅ NEW: For student-specific components like the subscription manager
│   │   ├── therapy/
│   │   └── ui/
│   ├── pages/
│   │   ├── CrmDashboardPage.tsx          # ✅ NEW
│   │   ├── SchedulingCalendarPage.tsx    # ✅ NEW
│   │   └── InstallmentPlansPage.tsx      # ✅ NEW
│   └── types/
│       ├── crm.ts                        # ✅ NEW: TypeScript types for Leads
│       ├── scheduling.ts                 # ✅ NEW: Types for Subscriptions, Attendance
│       └── billing.ts                    # ✅ NEW: Types for Installment Plans

8.3. Integration Guidelines
File Naming: All new components will follow the existing PascalCase.tsx convention.

Folder Organization: New features will be organized into their own dedicated folders within src/components/ to maintain modularity.

Shared Types: All new TypeScript types will be defined in the src/types/ directory to be easily shared between frontend components and backend service calls.

9. Infrastructure and Deployment Integration
The deployment strategy for the enhancements will integrate directly into your existing Netlify and Supabase CI/CD pipelines. The goal is to ensure that new features are deployed safely, with zero downtime, and that rollback procedures are in place.

9.1. Existing Infrastructure
Current Deployment: The frontend is continuously deployed to Netlify, with automatic builds triggered from the main branch. The backend consists of Supabase services, where database migrations and Edge Functions are managed via the Supabase CLI.

Infrastructure Tools: Netlify for frontend hosting/CDN; Supabase for all backend services.

Environments: The current setup includes a production environment and local development environments. We will introduce a formal staging environment.

9.2. Enhancement Deployment Strategy
Deployment Approach: We will use a phased rollout. Backend database migrations will be deployed first, followed by the Supabase Edge Functions. Once the backend APIs are live and stable, the frontend features will be deployed.

Infrastructure Changes:

Staging Environment: A new Supabase project will be configured to serve as a dedicated staging environment for end-to-end testing before production releases.

Environment Variables: New environment variables for the Amelia webhook and WhatsApp API integration will be added securely to Supabase and Netlify.

Pipeline Integration: The existing Netlify build process will be updated to include a new test stage that must pass before a deployment to production can proceed.

9.3. Rollback Strategy
Rollback Method: For the frontend, Netlify's atomic deployments allow for instant rollbacks to a previous version with a single click. For the backend, a new, versioned SQL script will be created for each database migration that contains the necessary commands to reverse the schema changes.

Risk Mitigation: All new, significant features will be deployed with feature flags. This will allow us to enable or disable the new CRM, Scheduling, and Financial modules in production without requiring a full redeployment, minimizing risk.

10. Coding Standards and Conventions
To ensure the new code integrates seamlessly with your existing, high-quality codebase, all development for this enhancement will adhere to the following standards. These rules are mandatory for all developers, both human and AI, to maintain consistency.

10.1. Existing Standards Compliance
Code Style: We will continue to use the same ESLint and Prettier configurations that are already in the project. The existing linting rules must pass without any new warnings or errors.

Testing Patterns: All new tests will be written using Vitest and React Testing Library, mirroring the existing testing architecture. The established "Arrange, Act, Assert" pattern will be used for all unit tests.

Documentation Style: All new functions, components, and types must include bilingual JSDoc comments (Arabic and English), following the pattern established in your development standards.

10.2. Critical Integration Rules
Type Sharing: All new TypeScript types that are shared between the frontend and backend (e.g., API response models) must be defined in the src/types/ directory to ensure a single source of truth.

API Calls: All frontend API interactions must be managed through the TanStack Query v5 library. Direct fetch calls are prohibited to ensure consistent caching, refetching, and error handling.

Environment Variables: All new environment variables must be prefixed with VITE_ and accessed through the validated environment object, never directly via import.meta.env.

Error Handling: All new components must be designed to work within the existing multi-level ErrorBoundary structure to handle potential errors gracefully.

11. Testing Strategy
Addressing the testing coverage gap identified in the gap-analysis.md is a top priority for this enhancement. The following strategy will be implemented to ensure the new features are robust and do not introduce regressions.

11.1. Integration with Existing Tests
Existing Test Framework: All new tests will be added to the existing Vitest test suite.

Coverage Requirements: All new code (components, services, hooks) is required to meet a minimum of 80% unit test coverage. The overall project coverage should increase as a result of this enhancement.

11.2. New Testing Requirements
Unit Tests for New Components: Every new React component (e.g., CRM Kanban board, Subscription Freeze modal) will have a corresponding .test.tsx file. Tests will cover rendering, user interactions, and all possible states (loading, error, success).

Integration Tests: New integration tests will be created to verify the end-to-end workflows of the new features. This is especially critical for:

The CRM lead creation flow (from n8n webhook to UI update).

The subscription freeze and auto-rescheduling logic.

The QR code attendance logging.

Regression Tests: A new suite of regression tests will be added to ensure that the core functionality of the existing system—such as student

2. Next Steps
This Brownfield Enhancement Architecture document, having been collaboratively developed and approved, now serves as the definitive technical blueprint for this project phase. All subsequent development, story creation, and testing must align with the decisions and patterns defined herein.

The successful completion of this architecture marks the end of the initial planning and design phase. The project will now transition into the implementation and development workflow.

12.1. Story Manager Handoff
The next action is for the Story Manager (SM) to begin breaking down the epics from the PRD into detailed, actionable user stories for the development team.

Handoff Prompt for Story Manager:
"The architecture for the Arkan Alnumo enhancement is complete and approved. Please begin creating the user stories based on the prd.md. Key considerations for this brownfield project include:

Reference this architecture document for all technical implementation details.

Pay close attention to the Integration Strategy (Section 2) and Compatibility Requirements (Section 2.3) to ensure all stories maintain existing system integrity.

Each story's acceptance criteria must include verification steps to prevent regressions in existing functionality.

The initial stories should focus on setting up the new database schemas and backend services as outlined in the Data Models (Section 4) and API Design (Section 6)."

12.2. Developer Handoff
Once stories are created and approved, they will be handed off to the Development Agent.

Guidance for the Development Agent:
"You are to begin implementation of the approved user stories for the Arkan Alnumo enhancement. Your work must strictly adhere to the following:

The technical patterns, component designs, and API specifications defined in this architecture document.

The Coding Standards and Testing Strategy (Sections 10 & 11) are mandatory.

All new code must integrate with the existing project structure as defined in the Source Tree Integration section (Section 8).

Your primary objective is to deliver the required enhancements while ensuring the stability and integrity of the existing production system."



