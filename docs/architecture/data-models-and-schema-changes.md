# Data Models and Schema Changes

To support the new CRM, scheduling, and financial features, we will extend the existing PostgreSQL database with several new tables. These models are designed to integrate seamlessly with your current students and therapy_plans tables.

All schema changes will be managed through versioned SQL migration scripts to ensure a safe and repeatable deployment process.

## New Data Models

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

## Schema Integration Strategy

Database Changes Required:

New Tables: leads, student_subscriptions, attendance_logs, installment_plans.

Modified Tables: No modifications to existing tables are required, ensuring backward compatibility.

New Indexes: Appropriate indexes will be created on foreign keys and frequently queried columns (e.g., status, event_type) to ensure performance.

Migration Strategy: All changes will be implemented via new, numbered SQL migration files, following the existing pattern (e.g., 027_crm_schema.sql, 028_subscriptions_schema.sql, etc.).
