# Data Models and APIs

### Data Models

Database schema spread across 52+ migration files with inconsistent naming:

- **Core Tables**: See `database/001_create_tables.sql`
- **Student Management**: See `database/004_student_management_tables.sql`
- **Medical Records**: See `database/012_medical_foundation_schema.sql`
- **IEP Management**: See `database/024_iep_management_schema.sql`
- **Communication**: See `database/026_communication_system_schema.sql`
- **Billing**: See `database/023_billing_system_schema.sql`
- **Latest Additions**: See `database/045_*.sql` through `database/052_*.sql`

**WARNING**: Migration numbering has conflicts (multiple 045_ files)

### API Specifications

- **Supabase Client**: All API calls through `src/lib/supabase.ts`
- **No OpenAPI Spec**: API structure implicit in service files
- **Edge Functions**: `supabase/functions/` (8 functions, mostly incomplete)
- **Webhook Integration**: `src/services/webhooks.ts` (placeholder)
- **n8n Workflows**: `n8n/workflows/` (3 JSON files, not integrated)
