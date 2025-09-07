# Arkan Al-Numo IEP Management System - Brownfield Architecture Document

## Introduction

This document captures the CURRENT STATE of the Arkan Al-Numo IEP Management System codebase, including technical debt, workarounds, and real-world patterns. It serves as a reference for AI agents working on production completion enhancements (remaining 20-25% of system).

### Document Scope

Focused on areas relevant to: Production readiness completion including testing infrastructure, security compliance, IEP workflows, communication system, financial management, and assessment automation.

### Change Log

| Date       | Version | Description                          | Author     |
| ---------- | ------- | ------------------------------------ | ---------- |
| 2025-01-27 | 1.0     | Initial brownfield analysis         | Architect  |

## Quick Reference - Key Files and Entry Points

### Critical Files for Understanding the System

- **Main Entry**: `src/main.tsx` - React application entry point
- **Configuration**: `.env` variables, `vite.config.ts`, `tsconfig.json`
- **Core Business Logic**: `src/services/` (75+ service files)
- **API Definitions**: Supabase client in `src/lib/supabase.ts`
- **Database Models**: `database/*.sql` (52+ migration files)
- **Key Algorithms**: Assessment scoring (pending), IEP generation (pending)
- **Router Configuration**: `src/App.tsx` with React Router v6
- **Internationalization**: `src/contexts/LanguageContext.tsx`

### Enhancement Impact Areas for Production Completion

Files/modules affected by planned enhancements:

- **Testing Infrastructure**: All components in `src/components/` need test coverage
- **IEP Management**: `src/components/iep/` (mostly missing), `src/services/iep-service.ts`
- **Communication System**: `src/services/messaging-service.ts`, `src/hooks/useRealTimeMessaging.ts`
- **Financial Management**: `src/services/payment-gateway-service.ts`, `src/services/installment-payment-service.ts`
- **Security**: `src/services/encryption-service.ts`, `src/services/security-service.ts`
- **Assessment Automation**: `src/services/assessment-analysis-service.ts`

## High Level Architecture

### Technical Summary

A sophisticated bilingual (Arabic RTL/English LTR) healthcare ERP system built with React 18, TypeScript 5.3, and Supabase backend. Currently 75-80% complete with production deployment targeted in 5-7 months.

### Actual Tech Stack (from package.json)

| Category        | Technology           | Version   | Notes                                      |
| --------------- | -------------------- | --------- | ------------------------------------------ |
| Runtime         | Node.js              | 18+       | Required for build tools                  |
| Framework       | React                | 18.2.0    | With hooks and concurrent features        |
| Language        | TypeScript           | 5.2.2     | Strict mode enabled                       |
| Build Tool      | Vite                 | 5.0.8     | Fast HMR and bundling                     |
| Styling         | Tailwind CSS         | 3.4.12    | With RTL support via tailwind-merge       |
| UI Components   | shadcn/ui + Radix    | Various   | Composable component architecture         |
| State Mgmt      | TanStack Query       | 5.56.2    | Server state with 5-min cache             |
| Forms           | React Hook Form      | 7.53.0    | With Zod validation                       |
| Backend         | Supabase             | 2.45.4    | PostgreSQL + Auth + Realtime              |
| Routing         | React Router DOM     | 6.26.1    | Client-side routing                       |
| i18n            | i18next              | 23.7.6    | Arabic/English support                    |
| Testing         | Vitest               | 3.2.4     | **0% coverage - CRITICAL GAP**            |
| Error Tracking  | Sentry               | 10.8.0    | Production error monitoring               |
| Deployment      | Netlify              | -         | Automatic deployments from git            |

### Repository Structure Reality Check

- **Type**: Monorepo - single repository for entire application
- **Package Manager**: npm (package-lock.json present)
- **Notable Issues**: 
  - No monorepo tools (nx, lerna) despite complexity
  - Mixed naming conventions between components
  - Inconsistent service patterns

## Source Tree and Module Organization

### Project Structure (Actual)

```text
e:\app\app1/
├── src/
│   ├── components/          # UI components (213+ files)
│   │   ├── admin/          # Admin-specific components
│   │   ├── ai/             # AI recommendations (NEW - incomplete)
│   │   ├── analytics/      # Analytics dashboards
│   │   ├── assessments/    # Clinical assessment forms
│   │   ├── auth/           # Authentication components
│   │   ├── billing/        # Financial management (INCOMPLETE)
│   │   ├── cards/          # Reusable card components
│   │   ├── communication/  # Messaging system (INCOMPLETE)
│   │   ├── crm/           # Lead management (NEW)
│   │   ├── forms/          # Form components (inconsistent patterns)
│   │   ├── iep/           # IEP management (MOSTLY MISSING)
│   │   ├── layout/         # Layout components
│   │   ├── parent/         # Parent portal components
│   │   ├── qr/            # QR attendance (UI only, no logic)
│   │   ├── scheduling/     # Scheduling components (NEW)
│   │   ├── shared/         # Shared components
│   │   ├── students/       # Student management
│   │   ├── therapist/      # Therapist components
│   │   └── ui/            # shadcn/ui base components
│   ├── contexts/           # React contexts (language, theme)
│   ├── hooks/             # Custom hooks (55+ files, inconsistent)
│   ├── lib/               # Utilities (supabase client, validations)
│   ├── pages/             # Route components (150+ pages)
│   ├── services/          # Business logic (75+ services)
│   │   ├── analytics/     # Analytics services (NEW)
│   │   ├── enrollment/    # Enrollment services (NEW)
│   │   ├── scheduling/    # Scheduling engine (NEW)
│   │   └── therapist/     # Therapist services (NEW)
│   ├── test/              # Test files (MINIMAL COVERAGE)
│   └── types/             # TypeScript definitions
├── database/              # 52+ SQL migration files
├── docs/                  # Documentation (fragmented)
├── n8n/                   # Automation workflows (INCOMPLETE)
├── public/                # Static assets
├── scripts/               # Build and utility scripts
├── supabase/              # Edge functions (INCOMPLETE)
└── .bmad-core/           # BMAD project management

WARNING: Inconsistent patterns between older and newer code
```

### Key Modules and Their Purpose

- **User Management**: `src/services/security-service.ts` - JWT auth with Supabase
- **Authentication**: `src/lib/supabase.ts` - Supabase Auth wrapper with RLS
- **Student Management**: Multiple services, fragmented implementation
- **Therapy Sessions**: `src/hooks/useSessions.ts` - Basic CRUD operations
- **Payment Processing**: `src/services/payment-gateway-service.ts` - INCOMPLETE
- **IEP Management**: `src/services/iep-service.ts` - SKELETON ONLY
- **Communication**: `src/services/messaging-service.ts` - NOT IMPLEMENTED
- **Assessment Scoring**: `src/services/assessment-analysis-service.ts` - PLACEHOLDER

## Data Models and APIs

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

## Technical Debt and Known Issues

### Critical Technical Debt

1. **Testing Infrastructure**: 0% test coverage despite Vitest setup - BLOCKING PRODUCTION
2. **IEP Management**: Core business feature only has database schema, no implementation
3. **Payment Integration**: Payment gateway service has test file but no implementation
4. **Communication System**: Database schema exists, no real-time messaging implemented
5. **Security Gaps**: 
   - Encryption service exists but not applied to medical records
   - No 2FA implementation despite database support
   - API security service incomplete
6. **Assessment Scoring**: No algorithms implemented for VB-MAPP, CELF-5, etc.
7. **QR Attendance**: UI components exist but no generation/validation logic
8. **Migration Conflicts**: Multiple files with same number (045_)
9. **Service Patterns**: Inconsistent patterns between older and newer services
10. **Component Testing**: Test files exist for some hooks but no component tests

### Workarounds and Gotchas

- **Environment Variables**: Must have all VITE_ prefixed vars or app crashes
- **Database Connections**: Supabase client singleton pattern required
- **Arabic Text**: Must use specific font loading order or text renders incorrectly
- **RLS Policies**: Some tables have disabled RLS (security risk)
- **Build Process**: Two different TypeScript configs (tsconfig.json vs tsconfig.production.json)
- **Date Handling**: Mixed use of date-fns and native Date objects
- **File Uploads**: No consistent file upload pattern across components
- **Real-time Subscriptions**: Not implemented despite Supabase support
- **Error Boundaries**: Minimal error handling, app crashes on errors
- **Memory Leaks**: No cleanup in useEffect hooks in older components

## Integration Points and External Dependencies

### External Services

| Service          | Purpose            | Integration Type | Key Files                             | Status         |
| ---------------- | ------------------ | ---------------- | ------------------------------------- | -------------- |
| Supabase         | Backend + Auth     | SDK              | `src/lib/supabase.ts`                | Working        |
| WhatsApp Business| Notifications      | Planned API      | `src/services/whatsapp.ts`          | NOT INTEGRATED |
| PayTabs          | Saudi Payments     | Planned API      | `src/services/payment-gateway-service.ts` | NOT INTEGRATED |
| Stripe           | Int'l Payments     | Planned SDK      | Not implemented                      | NOT INTEGRATED |
| Sentry           | Error Tracking     | SDK              | `src/main.tsx`                      | Configured     |
| n8n              | Automation         | Webhooks         | `n8n/workflows/`                     | NOT CONNECTED  |
| Amelia           | Booking            | WordPress        | `docs/integrations/`                | Documented only|

### Internal Integration Points

- **Frontend-Backend**: Supabase client on all API calls
- **Real-time Updates**: Supabase Realtime subscriptions (NOT IMPLEMENTED)
- **File Storage**: Supabase Storage (partially implemented)
- **Authentication**: Supabase Auth with custom RLS policies
- **Background Jobs**: No queue system implemented
- **Caching**: TanStack Query with 5-minute stale time
- **State Management**: Mix of Context API and TanStack Query

## Development and Deployment

### Local Development Setup

```bash
# Actual steps that work
1. Clone repository
2. Copy .env.example to .env (MUST have all variables)
3. npm install (takes ~3-5 minutes)
4. npm run dev (starts on http://localhost:5173)

# Known issues:
- Missing env vars cause cryptic errors
- Port 5173 must be free
- Supabase project must be running
- Database migrations must be run manually
```

### Build and Deployment Process

- **Build Command**: `npm run build:production` (uses special tsconfig)
- **Deployment**: Automatic via Netlify on git push
- **Environments**: Dev (local), Production (Netlify)
- **Database Migrations**: Manual via Supabase dashboard
- **Edge Functions**: Manual deployment required
- **Environment Variables**: Set in Netlify dashboard

## Testing Reality

### Current Test Coverage

- **Unit Tests**: 0% coverage (Vitest configured but unused)
- **Component Tests**: None
- **Integration Tests**: None
- **E2E Tests**: None
- **Manual Testing**: Primary QA method
- **Test Files**: ~10 test files exist but minimal implementation

### Running Tests

```bash
npm test              # Runs Vitest (no tests fail because none exist)
npm run test:coverage # Shows 0% coverage
```

**CRITICAL**: No testing pyramid, blocking production deployment

## Enhancement PRD Impact Analysis

### Files That Will Need Modification

Based on production completion requirements:

#### Testing Infrastructure (Story 1.1)
- Create `src/test/components/` directory structure
- Add tests for 213+ components
- Create `src/test/services/` for service tests
- Add `src/test/hooks/` for hook tests
- Configure coverage reporting

#### Security Compliance (Story 1.2)
- `src/services/encryption-service.ts` - Implement AES-256
- `src/services/security-service.ts` - Add 2FA
- `src/services/audit-service.ts` - Enhance audit trail
- `database/034_encryption_implementation.sql` - Apply encryption
- `database/036_two_factor_authentication.sql` - Enable 2FA

#### IEP Management (Story 1.3)
- `src/components/iep/` - Create all components
- `src/services/iep-service.ts` - Full implementation
- `src/hooks/useIEPs.ts` - Complete hook logic
- `src/pages/IEPDashboardPage.tsx` - Enhance page
- Arabic PDF generation system needed

#### Communication System (Story 1.4)
- `src/services/messaging-service.ts` - Implement real-time
- `src/hooks/useRealTimeMessaging.ts` - Add Supabase Realtime
- `src/services/whatsapp.ts` - WhatsApp Business API
- `src/components/communication/` - Build UI components
- `supabase/functions/` - Create message handlers

#### Financial Management (Story 1.5)
- `src/services/payment-gateway-service.ts` - PayTabs integration
- `src/services/installment-payment-service.ts` - Complete logic
- `src/services/invoice-generator.ts` - Implement generation
- `src/components/billing/` - Complete UI components
- Insurance API integration needed

### New Files/Modules Needed

- `src/components/iep/IEPCreationWizard.tsx`
- `src/components/iep/IEPEditor.tsx`
- `src/components/iep/IEPCollaboration.tsx`
- `src/services/realtime/subscription-manager.ts`
- `src/services/assessment-scoring/vb-mapp.ts`
- `src/services/assessment-scoring/celf-5.ts`
- `src/services/qr/qr-generator.ts`
- `src/services/qr/qr-validator.ts`
- `src/lib/arabic-pdf-generator.ts`
- Test files for ALL components and services

### Integration Considerations

- Must maintain existing Supabase client patterns
- Preserve TanStack Query caching strategy
- Follow existing shadcn/ui component patterns
- Maintain Arabic-first design philosophy
- Respect existing RLS policies
- Use established error handling patterns
- Follow current routing structure

## Appendix - Useful Commands and Scripts

### Frequently Used Commands

```bash
npm run dev           # Start development server
npm run build         # Development build
npm run build:production # Production build with strict TypeScript
npm run lint          # ESLint check
npm run type-check    # TypeScript validation
npm run test:db       # Test Supabase connection
npm run deploy        # Deploy to Netlify production
npm run deploy:preview # Deploy to Netlify preview
```

### Debugging and Troubleshooting

- **Logs**: Browser console for frontend, Supabase dashboard for backend
- **Debug Mode**: Set `DEBUG=true` in .env for verbose logging
- **Common Issues**:
  - White screen: Check browser console for missing env vars
  - API errors: Verify Supabase project is running
  - Arabic text issues: Clear browser cache
  - Build failures: Run `npm run type-check` first
  - Database errors: Check RLS policies in Supabase

### Critical Warnings

1. **DO NOT** modify database migrations without understanding dependencies
2. **DO NOT** disable RLS policies in production
3. **DO NOT** commit .env files to repository
4. **ALWAYS** test Arabic RTL layout after UI changes
5. **ALWAYS** run type-check before committing
6. **VERIFY** Supabase connection before deployment

## Performance Considerations

- **Bundle Size**: Currently unknown, needs analysis
- **Page Load**: Target < 2 seconds (unverified)
- **API Response**: Target < 500ms (mostly achieved)
- **Database Queries**: Indexed for Arabic text search
- **Code Splitting**: Not implemented
- **Lazy Loading**: Minimal implementation

## Security Considerations

- **Authentication**: Supabase Auth with JWT tokens
- **Authorization**: RLS policies (some tables unprotected)
- **Data Encryption**: Not implemented for medical records
- **API Security**: Basic CORS, no rate limiting
- **HIPAA Compliance**: Partial, missing encryption
- **Saudi PDPL**: Structure ready, implementation pending
- **Audit Trail**: Basic implementation, needs enhancement

## Known Limitations

1. **No offline support**: Requires constant internet
2. **No mobile app**: Web-only currently
3. **Limited browser support**: Modern browsers only
4. **No multi-tenancy**: Single center deployment
5. **No backup system**: Manual database backups only
6. **Performance monitoring**: Limited to Sentry errors
7. **No A/B testing**: Single version deployment
8. **Limited accessibility**: WCAG compliance pending

---

**Document Status**: This reflects the actual state as of January 2025. The system is functional but requires significant work to achieve production readiness. Focus should be on testing infrastructure, security compliance, and completing core business features (IEP, communication, financial management).