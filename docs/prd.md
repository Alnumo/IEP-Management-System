Product Requirements Document (PRD)
Arkan Alnumo - Complete IEP Management System
Project: Arkan Alnumo Therapy Management & IEP System

Version: 2.0

Status: In-Progress

Author: John, Product Manager (BMad Full Stack Team)

Date: 2025-08-30

1. Goals and Background Context
1.1. Goals
The primary goal is to evolve the Arkan Growth Center Therapy Plans Manager into a complete, end-to-end Individualized Education Program (IEP) and Enterprise Resource Planning (ERP) system. This involves three key strategic objectives:

Audit and Complete Existing Functionality: Address all issues and missing features identified in the gap analysis to bring the current application to 100% completion.

Implement New Core Features: Introduce new, critical modules for student management, scheduling, and communication as detailed in the brainstorming session results.

Introduce Advanced Capabilities: Integrate AI-powered features and n8n automation workflows to enhance efficiency, provide data-driven insights, and improve user experience.

1.2. Background Context
The Arkan Therapy Management System is approximately 75-80% complete, with a robust technical foundation based on React, TypeScript, and Supabase. A comprehensive gap analysis has revealed specific areas needing completion, particularly in testing, security, and core modules like IEP Management and the Parent Portal.

Recent brainstorming sessions have identified a clear need for a more sophisticated student lifecycle and scheduling system to fully realize the vision of an all-encompassing ERP platform. This PRD will guide the development process to bridge these gaps and introduce new, value-added features.

1.3. Change Log
Date	Version	Description	Author
2025-08-30	2.0	Initial PRD for completing and extending the system.	John, PM

Export to Sheets
2. Requirements
2.1. Functional Requirements (FR)
FR1: Complete Partially Implemented Modules
All modules identified as "Partially Implemented" in the gap analysis report must be brought to full completion. This includes:

FR1.1: Core Therapy Management:

Implement real-time session progress tracking.

Develop goal achievement metrics calculation.

Create automated therapy plan recommendations.

FR1.2: Assessment System:

Implement assessment scoring algorithms for CELF and VB-MAPP templates.

Generate progress comparison reports from assessment data.

Enable standardized assessment exports.

FR1.3: Medical Records & Documentation:

Implement HIPAA-compliant document encryption for all medical records.

Develop a medical report generation system.

Create workflows for medication tracking.

FR1.4: IEP Management:

Build complete IEP creation, editing, and collaborative development workflows.

Implement an IEP goal tracking system with progress monitoring.

Ensure IDEA 2024 compliance validation within the IEP module.

Develop functionality for Arabic PDF exports of IEP documents.

FR2: Implement Missing Modules
All modules identified as "Missing or Minimal Implementation" in the gap analysis report must be fully developed. This includes:

FR2.1: Parent Portal:

Provide real-time progress visualization for parents.

Implement a secure parent-therapist messaging system.

Create a home program assignment and tracking system.

FR2.2: Communication System:

Build a real-time messaging interface based on the existing database schema.

Integrate push notifications for new messages and alerts.

Integrate with WhatsApp Business API for automated notifications.

FR2.3: Financial Management:

Integrate a payment processing gateway.

Develop an automated invoice generation system.

Create a financial reporting engine for revenue tracking.

FR2.4: Analytics & Reporting:

Implement data aggregation services for real-time analytics.

Build a custom report builder for clinical, operational, and financial data.

FR2.5: Automation & n8n Integration:

Configure n8n workflows for automated session reminders and report generation.

FR3: New Student Management & Scheduling System
Implement the comprehensive student lifecycle management system as defined in the brainstorming session.

FR3.1: Automated Scheduling: Create an automated scheduling system based on student programs, session categories, and therapist availability.

FR3.2: Dual-Level QR Attendance: Implement a dual-level attendance system to track both center check-in/out and individual session attendance using QR codes.

FR3.3: Subscription Management: Develop a subscription module with capabilities to freeze and automatically reschedule sessions.

FR4: CRM and Lead Management
FR4.1: Free Evaluation Booking:

Parents can book a free evaluation interview by selecting an available date and time.

The system will capture required parent and child information.

The system will integrate with the Amelia plugin on the WordPress website to sync bookings.

FR4.2: Lead Management Workflow:

A CRM dashboard will display all new evaluation bookings.

The responsible employee can view, follow up, and confirm reservations.

The system will track the lead status from "Booked" to "Confirmed," "Evaluation Complete," and "Registered."

FR5: Enhanced Financial System
FR5.1: Installment Payments: The financial module will support creating and managing installment payment plans for all programs.

FR5.2: Program-Based Invoicing: Invoices will be generated based on the specific program a student is enrolled in, reflecting the prices outlined in the "Arkan Programs" presentation.

FR6: Advanced Student Program Management
FR6.1: Individualized Enrollment: The system will allow multiple students to be enrolled in the same program type (e.g., "برنامج النمو - السنوى"), each with their own individual start and end dates, session schedules, and assigned therapists.

FR6.2: Subscription Freeze System:

Each program will have a maximum number of "freeze days" allowed.

When a student's subscription is frozen, the system will deduct the number of frozen days from their allowed total.

The system will automatically reschedule all affected sessions and update the program's end date accordingly.

2.2. Non-Functional Requirements (NFR)
NFR1: Testing Coverage: Achieve a minimum of 80% code coverage for all new and existing components, addressing the critical gap in the current testing infrastructure.

NFR2: Security and Compliance:

All security gaps identified in the analysis must be addressed, including implementing HIPAA-compliant encryption and comprehensive audit trails.

The system must remain compliant with the Saudi Personal Data Protection Law (PDPL).

NFR3: Performance: The application must adhere to the performance targets specified in the UI/UX documentation, including sub-2-second initial load times and sub-500ms API responses.

NFR4: Accessibility: The application must comply with WCAG 2.1 AA standards as outlined in the UI/UX specification.

NFR5: Localization: All new features must fully support the existing bilingual (Arabic RTL/English LTR) architecture, including database fields, UI components, and error messages.

3. Epic and Story Structure
To manage this scope of work, the project will be broken down into the following high-level epics:

Epic 1: Foundational Audit and Completion

Goal: Address all critical technical debt, focusing on testing infrastructure, security compliance, and performance monitoring to create a stable foundation for future development.

Key Stories:

Implement comprehensive unit and integration tests to achieve 80% coverage.

Conduct a full security audit and implement all required fixes (e.g., data encryption, 2FA).

Integrate APM tools for real-time performance monitoring.

Epic 2: Core Module Completion

Goal: Bring all partially implemented and missing modules (excluding new features) to 100% completion as defined in the gap analysis.

Key Stories:

Complete the IEP Management system with full CRUD, collaboration, and export functionality.

Build out the Parent Portal with messaging, progress tracking, and document access.

Implement the Financial Management module with payment integration and invoicing.

Complete the communication and reporting systems.

Epic 3: Advanced Student Management & Scheduling

Goal: Design and implement the new, automated student management and scheduling system.

Key Stories:

Develop the automated scheduling engine.

Implement the dual-level QR attendance system.

Build the subscription freeze and automated rescheduling functionality.

Epic 4: CRM and Financial Enhancements
process
Goal: Integrate a CRM for lead management and enhance the financial system with installment plans.

Key Stories:

Develop the CRM dashboard and lead management workflow.

Implement the installment payment system.

Integrate with the Amelia WordPress plugin for booking synchronization.

Epic 5: AI and Automation Integration

Goal: Integrate intelligent and automated workflows to enhance system capabilities.

Key Stories:

Develop and integrate AI-powered therapy plan recommendations.

Configure and deploy n8n automation for reminders, reports, and data synchronization.

Implement predictive analytics features within the reporting dashboard.