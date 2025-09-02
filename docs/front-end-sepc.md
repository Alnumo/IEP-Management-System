Of course. As Sally, your UX Expert, I have consolidated all the previous analysis and the necessary refinements into a single, comprehensive UI/UX Specification.

This final document integrates the requirements from the PRD with the established standards from your core architecture and design system documents. It is now ready to be handed off to the Architect for the next phase.

Final UI/UX Specification
Arkan Alnumo - Complete IEP Management System
Project: Arkan Alnumo Therapy Management & IEP System

Version: 2.1

Status: Ready for Architecture

Author: Sally, UX Expert (BMad Full Stack Team)

Date: 2025-08-30

1. Introduction
This document defines the user experience goals, information architecture, critical user flows, and high-level design direction for the Arkan Alnumo system. It builds upon the existing UI/UX foundation and expands it to include the new modules and features outlined in the PRD v2.0.

1.1. Overall UX Goals & Principles
Our primary goal is to create a seamless, efficient, and empowering experience for administrators, therapists, and parents.

Usability Goals:

Efficiency: Reduce the time required for administrators to manage the entire student lifecycle, from lead to enrolled student.

Clarity: Provide parents with a clear and transparent view of their child's progress, schedule, and financials.

Confidence: Empower therapists with intuitive tools for documentation, scheduling, and communication.

Design Principles:

Clarity over cleverness: Prioritize clear, unambiguous interfaces, especially in complex areas like scheduling and finance.

Progressive disclosure: Show users what they need, when they need it. Avoid overwhelming them with information.

Consistent patterns: Leverage the existing shadcn/ui design system to ensure all new features feel familiar.

Arabic-First: All designs must be conceptualized for an RTL layout first, ensuring a native experience for the primary user base.

1.2. Security & Trust in UX
In line with the system's medical-grade security architecture, the user experience must actively build user trust.

Visual Indicators: Interfaces handling sensitive data (e.g., medical records, billing) should include subtle visual cues like a lock icon to reassure users of data security.

Confirmation Dialogs: Critical actions, such as freezing a subscription or creating an installment plan, must use the standard AlertDialog component for explicit user confirmation before proceeding.

1.3. Change Log
Date	Version	Description	Author
2025-08-30	2.1	Consolidated final version with refinements.	Sally, UX

Export to Sheets
2. Information Architecture (IA)
The existing IA will be expanded to include new top-level sections for CRM, enhanced Student Management, and Billing. Each new page must be wrapped in the system's standard ErrorBoundary component for consistent error handling.

2.1. Site Map (Administrator View)
Code snippet

graph TD
    subgraph Dashboard
        A[Overview]
    end

    subgraph "Leads & CRM (New)"
        B[Evaluation Bookings]
    end

    subgraph Students
        C[Student Roster] --> C1[Student Profile]
        C1 --> C2[IEP Management]
        C1 --> C3[Medical Records]
        C1 --> C4[Session History]
        C1 --> C5["Subscription & Freeze (New)"]
    end

    subgraph Scheduling
        D[Master Calendar]
        D --> D1[Therapist Schedules]
    end

    subgraph "Billing & Financials"
        F[Invoices]
        F --> F1["Installment Plans (New)"]
    end
    
    Dashboard --> Students
    Dashboard --> Scheduling
2.2. Role-Based Access Views
The UI must be designed to adapt based on user roles defined in the system architecture (admin, manager, therapist_lead, receptionist). For example, the Billing & Financials module should only be visible to admin and manager roles.

3. User Flows
3.1. Lead Management & Onboarding Flow (FR4)
User Goal: A new parent books a free evaluation, and an administrator manages the lead through to registration.

Flow Steps:

Parent (Website): Navigates to the booking page (powered by Amelia plugin).

Parent (Website): Selects an available date/time and fills out the required information form.

System: A new lead is created in the Arkan CRM with "New Booking" status.

Admin (Arkan System): Views the new lead on the CRM Kanban board. The board displays a Skeleton Loader while syncing data.

Admin (Arkan System): Confirms the appointment, changing the status to "Confirmed."

System: Triggers an n8n workflow to send an automated confirmation email/SMS to the parent. A Toast notification confirms the action in the UI.

Post-Evaluation: The admin updates the lead status to "Evaluation Complete."

On Agreement: The admin converts the lead into a new student profile.

3.2. Subscription Freeze & Reschedule Flow (FR6.2)
User Goal: An administrator freezes a student's subscription and the system adjusts their schedule.

Flow Steps:

Admin: Navigates to a student's profile and selects the "Subscription & Freeze" tab.

Admin: Clicks "Freeze Subscription." The UI displays remaining allowed freeze days.

Admin: Enters the freeze start and end dates in a modal.

Admin: Confirms the freeze via an AlertDialog.

System:

Cancels all scheduled sessions within the freeze period.

Extends the program end date.

Attempts to reschedule canceled sessions and flags any conflicts for manual review.

Updates the student's available freeze days.

Displays a success Toast notification.

3.3. QR Attendance Flow (FR3.2)
User Goal: To accurately track a student's attendance.

Flow Steps:

System: Generates a unique QR code for each student, accessible in admin and parent portals.

Check-in/out: A staff member scans the QR code upon the student's arrival and departure to log center attendance.

Session Attendance: The assigned therapist scans the same QR code to log attendance for a specific therapy session.

Data View: Administrators can view real-time reports on center and session attendance.

4. Design System & Component Guidelines
All new components must be built using the established shadcn/ui library and adhere to the existing, detailed design system.

4.1. Conceptual Wireframes for New Components
CRM Kanban Board:

Layout: A multi-column board ("New Bookings," "Confirmed," etc.).

Components: Utilizes the base Card component for leads, making them draggable. Filters will use the standard Select and DatePicker components.

Subscription Freeze Widget:

Layout: A section within a Card on the student profile.

Components: Uses Stat Card components to display "Allowed," "Used," and "Remaining" freeze days. The "Freeze Subscription" action will use the standard Button and Dialog components.

Installment Plan Creator:

Layout: A form-based interface within the Billing module.

Components: Built using the standard Form, Input, Select, and Table components to create and display payment schedules.

4.2. Accessibility & Responsiveness
All new modules must be fully responsive and meet WCAG 2.1 AA standards, consistent with the existing application's requirements. This includes ensuring all new forms are keyboard-navigable and all interactive elements have sufficient touch targets on mobile devices.