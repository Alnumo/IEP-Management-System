# Requirements

## Functional Requirements (FR)
**FR1: Complete Partially Implemented Modules**
All modules identified as "Partially Implemented" in the gap analysis report must be brought to full completion. This includes:

**FR1.1: Core Therapy Management:**

Implement real-time session progress tracking.

Develop goal achievement metrics calculation.

Create automated therapy plan recommendations.

**FR1.2: Assessment System:**

Implement assessment scoring algorithms for CELF and VB-MAPP templates.

Generate progress comparison reports from assessment data.

Enable standardized assessment exports.

**FR1.3: Medical Records & Documentation:**

Implement HIPAA-compliant document encryption for all medical records.

Develop a medical report generation system.

Create workflows for medication tracking.

**FR1.4: IEP Management:**

Build complete IEP creation, editing, and collaborative development workflows.

Implement an IEP goal tracking system with progress monitoring.

Ensure IDEA 2024 compliance validation within the IEP module.

Develop functionality for Arabic PDF exports of IEP documents.

**FR2: Implement Missing Modules**
All modules identified as "Missing or Minimal Implementation" in the gap analysis report must be fully developed. This includes:

**FR2.1: Parent Portal:**

Provide real-time progress visualization for parents.

Implement a secure parent-therapist messaging system.

Create a home program assignment and tracking system.

**FR2.2: Communication System:**

Build a real-time messaging interface based on the existing database schema.

Integrate push notifications for new messages and alerts.

Integrate with WhatsApp Business API for automated notifications.

**FR2.3: Financial Management:**

Integrate a payment processing gateway.

Develop an automated invoice generation system.

Create a financial reporting engine for revenue tracking.

**FR2.4: Analytics & Reporting:**

Implement data aggregation services for real-time analytics.

Build a custom report builder for clinical, operational, and financial data.

**FR2.5: Automation & n8n Integration:**

Configure n8n workflows for automated session reminders and report generation.

**FR3: New Student Management & Scheduling System**
Implement the comprehensive student lifecycle management system as defined in the brainstorming session.

**FR3.1: Automated Scheduling:** Create an automated scheduling system based on student programs, session categories, and therapist availability.

**FR3.2: Dual-Level QR Attendance:** Implement a dual-level attendance system to track both center check-in/out and individual session attendance using QR codes.

**FR3.3: Subscription Management:** Develop a subscription module with capabilities to freeze and automatically reschedule sessions.

**FR4: CRM and Lead Management**
**FR4.1: Free Evaluation Booking:**

Parents can book a free evaluation interview by selecting an available date and time.

The system will capture required parent and child information.

The system will integrate with the Amelia plugin on the WordPress website to sync bookings.

**FR4.2: Lead Management Workflow:**

A CRM dashboard will display all new evaluation bookings.

The responsible employee can view, follow up, and confirm reservations.

The system will track the lead status from "Booked" to "Confirmed," "Evaluation Complete," and "Registered."

**FR5: Enhanced Financial System**
**FR5.1: Installment Payments:** The financial module will support creating and managing installment payment plans for all programs.

**FR5.2: Program-Based Invoicing:** Invoices will be generated based on the specific program a student is enrolled in, reflecting the prices outlined in the "Arkan Programs" presentation.

**FR6: Advanced Student Program Management**
**FR6.1: Individualized Enrollment:** The system will allow multiple students to be enrolled in the same program type (e.g., "برنامج النمو - السنوى"), each with their own individual start and end dates, session schedules, and assigned therapists.

**FR6.2: Subscription Freeze System:**

Each program will have a maximum number of "freeze days" allowed.

When a student's subscription is frozen, the system will deduct the number of frozen days from their allowed total.

The system will automatically reschedule all affected sessions and update the program's end date accordingly.

## Non-Functional Requirements (NFR)
**NFR1: Testing Coverage:** Achieve a minimum of 80% code coverage for all new and existing components, addressing the critical gap in the current testing infrastructure.

**NFR2: Security and Compliance:**

All security gaps identified in the analysis must be addressed, including implementing HIPAA-compliant encryption and comprehensive audit trails.

The system must remain compliant with the Saudi Personal Data Protection Law (PDPL).

**NFR3: Performance:** The application must adhere to the performance targets specified in the UI/UX documentation, including sub-2-second initial load times and sub-500ms API responses.

**NFR4: Accessibility:** The application must comply with WCAG 2.1 AA standards as outlined in the UI/UX specification.

**NFR5: Localization:** All new features must fully support the existing bilingual (Arabic RTL/English LTR) architecture, including database fields, UI components, and error messages.