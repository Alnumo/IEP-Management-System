# API Design and Integration

The new features require additional backend endpoints. All new endpoints will be created as Supabase Edge Functions and integrated into the existing API gateway structure. We will follow the established RESTful patterns to maintain consistency.

## API Integration Strategy

API Integration Strategy: We will adopt an additive API strategy. New endpoints will be created under logical resource paths (e.g., /api/leads, /api/subscriptions). No existing endpoints will be modified or deprecated, ensuring zero impact on the current production frontend.

Authentication: All new endpoints will be protected by the existing Supabase JWT authentication middleware. Role-based access will be enforced within each function, leveraging the RLS policies defined at the database level.

Versioning: The new endpoints will be considered part of the current API version. No new version path (e.g., /v2/) is required at this stage.

## New API Endpoints

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
