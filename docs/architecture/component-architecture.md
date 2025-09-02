# Component Architecture

The enhancement will be implemented by introducing new, domain-specific components that follow the existing modular structure. This ensures a clean separation of concerns and allows for independent development and testing.

MANDATORY VALIDATION: The new components I'm proposing are designed to follow the existing architectural patterns I identified in your codebase: a modular React frontend with domain-based organization (e.g., components/therapy/, components/admin/) and a backend powered by discrete Supabase Edge Functions for business logic. The integration interfaces will respect your current component structure and data flow patterns.

Does this match your project's reality?

## New Components

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

## Component Interaction Diagram

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
