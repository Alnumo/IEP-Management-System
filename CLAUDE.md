
# 🏥 Therapy Plans Manager - AI Assistant Operating Manual


## Core Development Philosophy
### KISS (Keep It Simple, Stupid)

Simplicity should be a key goal in design. Choose straightforward solutions over complex ones whenever possible. Simple solutions are easier to understand, maintain, and debug.

### YAGNI (You Aren't Gonna Need It)

Avoid building functionality on speculation. Implement features only when they are needed, not when you anticipate they might be useful in the future.


This file contains the global rules and principles that apply to ALL context engineering work, regardless of what template or project you're building. These rules never change and should be followed consistently.

## 🔄 Context Engineering Core Principles

## System Overview

**Arkan Growth Center Therapy Plans Manager** is a comprehensive, bilingual (Arabic RTL/English LTR) therapy management system designed specifically for Saudi Arabia's healthcare environment. The system serves as a medical-grade ERP platform for managing therapy programs, student enrollments, clinical documentation, and healthcare compliance.

### Current System Status
- **Version**: 1.2.0
- **Completion**: ~75-80%
- **Primary Language**: Arabic (RTL) with English support
- **Target Market**: Saudi Arabian healthcare facilities
- **Compliance**: Saudi Personal Data Protection Law (PDPL)

### Language Support
- ALWAYS implement both Arabic and English interfaces
- Use i18n keys, never hardcode strings
- Test RTL layout for every component
- Arabic text must be culturally appropriate

## Technology Stack

### Frontend Architecture
```
React 18.2 + TypeScript 5.3
├── Build Tool: Vite 5.0
├── Styling: Tailwind CSS 3.4 + shadcn/ui
├── State Management: TanStack Query v5 + Context API
├── Routing: React Router DOM v6
├── Form Management: React Hook Form + Zod validation
├── Internationalization: Custom i18n system
└── UI Components: Radix UI + Custom components
```

### Backend Architecture
```
Supabase (PostgreSQL 15)
├── Authentication: Supabase Auth + Row Level Security (RLS)
├── Database: PostgreSQL 15 with Arabic text search
├── Real-time: Supabase Realtime subscriptions
├── Edge Functions: TypeScript-based serverless functions
├── Storage: Supabase Storage for file management
└── Security: RLS policies on all tables
```

### Automation Layer
```
n8n Workflows
├── WhatsApp Business API integration
├── Email notification system
├── Automated reporting workflows
├── Data synchronization tasks
└── Business process automation
```

### Development Tools
```
Development Environment
├── Package Manager: npm
├── Linting: ESLint + TypeScript ESLint
├── Testing: Vitest + Testing Library
├── Bundler: Vite with TypeScript support
├── Deployment: Netlify with build optimization
└── Code Quality: TypeScript strict mode
```

---

## System Architecture

### Application Structure
```
E:\app\app1\
├── src/
│   ├── components/          # UI components organized by domain
│   │   ├── admin/          # Administrative components
│   │   ├── analytics/      # Analytics dashboards
│   │   ├── auth/           # Authentication components
│   │   ├── billing/        # Financial management
│   │   ├── forms/          # Form components
│   │   ├── layout/         # Layout and navigation
│   │   ├── parent/         # Parent portal components
│   │   ├── therapy/        # Therapy-specific components
│   │   └── ui/             # Reusable UI components (shadcn/ui)
│   ├── contexts/           # React contexts for state management
│   ├── lib/                # Utility libraries and configurations
│   ├── pages/              # Route components
│   └── types/              # TypeScript type definitions
├── database/               # Database migrations and schema
├── public/                 # Static assets
├── docs/                   # Documentation
└── PRPs/                   # Product Requirement Prompts
```

### Component Architecture
The system follows a modular component architecture with clear separation of concerns:

#### 1. **Layout Components**
- **Layout.tsx**: Main layout wrapper with RTL/LTR support
- **Header.tsx**: Application header with language toggle
- **Sidebar.tsx**: Navigation sidebar with role-based menus
- **Breadcrumbs.tsx**: Dynamic breadcrumb navigation

#### 2. **Domain Components**
Each business domain has its own component directory:
- **Therapy Management**: Session forms, goal tracking, progress monitoring
- **Student Management**: Enrollment, medical records, assessments
- **Parent Portal**: Dashboard, messaging, document access
- **Analytics**: Clinical, operational, and financial dashboards
- **Billing**: Payment plans, financial analytics, invoicing

#### 3. **Shared Components**
- **UI Components**: Based on shadcn/ui with Arabic font support
- **Form Components**: Reusable form fields with validation
- **Error Boundaries**: Multi-level error handling system

### State Management Architecture
#### 1. **Global State**
```typescript
// Language Context
interface I18nContext {
  language: 'ar' | 'en'
  isRTL: boolean
  toggleLanguage: () => void
  setLanguage: (lang: Language) => void
}

// Auth State managed via Supabase Auth
interface AuthState {
  user: AuthenticatedUser | null
  loading: boolean
  isAuthenticated: boolean
}
```

#### 2. **Server State**
- **TanStack Query** manages all server state
- **5-minute stale time** for cached data
- **10-minute garbage collection** time
- **Custom retry logic** for network errors
- **Error reporting** integration

#### 3. **Form State**
- **React Hook Form** for form management
- **Zod schemas** for validation
- **Bilingual error messages** (Arabic/English)

---
## Database Architecture

### Core Schema Design
The database follows a hierarchical structure optimized for therapy management:

```sql
-- Core Tables Hierarchy
plan_categories (therapy categories)
├── therapy_plans (individual therapy programs)
│   └── plan_sessions (session templates)
├── students (patient records)
│   ├── medical_records (encrypted health data)
│   ├── student_assessments (evaluation results)
│   └── student_enrollments (active therapy plans)
└── therapists (healthcare providers)
    ├── medical_consultants (supervision roles)
    └── therapy_sessions (actual sessions)
```

### Key Database Features

#### 1. **Bilingual Support**
- All content tables have `_ar` and `_en` fields
- Arabic text search using PostgreSQL's Arabic dictionary
- English text search for international users

#### 2. **Row Level Security (RLS)**
- **Mandatory RLS** on all tables containing sensitive data
- **Role-based access control** (admin, manager, therapist_lead, receptionist)
- **Medical data encryption** for PDPL compliance

#### 3. **Audit Trail System**
- **created_at/updated_at** timestamps on all tables
- **created_by/updated_by** user tracking
- **Soft delete** functionality with deleted_at/deleted_by

#### 4. **Performance Optimizations**
- **GIN indexes** for full-text search (Arabic/English)
- **Composite indexes** for common query patterns
- **Generated columns** for calculated fields (pricing, totals)

### Critical Tables

#### Medical Records Table
```sql
CREATE TABLE medical_records (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES students(id),
  diagnosis_codes TEXT[], -- ICD-10 codes
  medical_history JSONB,
  medications JSONB,
  allergies TEXT[],
  emergency_protocol TEXT,
  encrypted_at TIMESTAMP,
  audit_log JSONB
);
```

#### Clinical Documentation
```sql
CREATE TABLE clinical_documentation (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES therapy_sessions(id),
  soap_notes JSONB, -- Subjective, Objective, Assessment, Plan
  behavioral_data JSONB,
  progress_metrics JSONB,
  encrypted BOOLEAN DEFAULT true
);
```

---

## Authentication & Authorization

### Authentication Flow
```
User Login → Supabase Auth → Profile Lookup → Role Assignment → Route Authorization
```

#### 1. **Supabase Authentication**
- Email/password authentication
- Session persistence with auto-refresh
- Secure token-based authentication

#### 2. **Role-Based Access Control**
```typescript
interface UserRoles {
  admin: 'Full system access'
  manager: 'All operations except user management'
  therapist_lead: 'Read-only access to therapy data'
  receptionist: 'Limited data entry and viewing'
}
```

#### 3. **Route Protection**
- **AuthGuard** component protects all authenticated routes
- **Role-based route filtering** in navigation
- **Permission checks** at component level

### Security Measures

#### 1. **Data Protection**
- **AES-256 encryption** for medical records
- **RLS policies** prevent unauthorized data access
- **Audit logging** for all medical data operations

#### 2. **Compliance Features**
- **Saudi PDPL compliance** implementation
- **Data residency** configuration for Saudi servers
- **Consent management** system
- **Right to deletion** functionality

---

## Localization Architecture

### Bilingual Design System

#### 1. **Language Context**
```typescript
// Global language state
const LanguageContext = {
  language: 'ar' | 'en',
  isRTL: boolean,
  toggleLanguage: Function,
  setLanguage: Function
}
```

#### 2. **RTL/LTR Layout Management**
- **Dynamic direction** (`dir` attribute) on all containers
- **Tailwind RTL classes** for layout adjustments
- **Font family switching** (Tajawal/Cairo for Arabic, System UI for English)

#### 3. **Content Management**
- **Database-level bilingual fields** (`name_ar`, `name_en`)
- **Fallback system** (Arabic → English → default)
- **Arabic-first design** philosophy

#### 4. **Typography & Styling**
```css
/* Arabic Typography */
font-family: 'Tajawal', 'Cairo', system-ui, sans-serif;
direction: rtl;
text-align: right;

/* English Typography */
font-family: system-ui, -apple-system, sans-serif;
direction: ltr;
text-align: left;
```

---

## Integration Architecture

### n8n Automation Workflows

#### 1. **WhatsApp Business Integration**
- **Appointment reminders** sent 24 hours before sessions
- **Progress reports** sent to parents weekly
- **Emergency notifications** for urgent medical situations
- **Automated responses** for common parent inquiries

#### 2. **Email Automation**
- **Therapy reports** generated and emailed monthly
- **Billing notifications** sent before payment due dates
- **System notifications** for administrative tasks
- **Backup and maintenance** status reports

#### 3. **Data Synchronization**
- **Real-time data sync** between n8n and Supabase
- **Webhook endpoints** for external system integration
- **Error handling and retry logic** for failed operations

### API Architecture

#### 1. **Supabase Client Configuration**
```typescript
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})
```

#### 2. **Query Client Setup**
- **5-minute stale time** for performance
- **Custom retry logic** for network resilience
- **Error reporting** integration
- **Optimistic updates** for better UX

---

## Performance Considerations

### Current Performance Metrics
- **Page Load Target**: < 2 seconds
- **API Response Target**: < 500ms
- **Database Query Target**: < 50ms
- **Bundle Size Target**: < 500KB initial

### Optimization Strategies

#### 1. **Frontend Optimizations**
- **Vite bundling** with tree shaking
- **Lazy loading** for heavy components
- **Memoization** for expensive calculations
- **Debounced search** to reduce API calls

#### 2. **Database Optimizations**
- **GIN indexes** for full-text search
- **Composite indexes** for common queries
- **Connection pooling** via Supabase
- **Query optimization** for large datasets

#### 3. **Caching Strategy**
- **TanStack Query** caching layer
- **Browser localStorage** for user preferences
- **CDN caching** for static assets
- **Service worker** for offline support (planned)

---

## Testing Architecture

### Testing Strategy
The system follows Test-Driven Development (TDD) principles:

#### 1. **Unit Testing**
- **Vitest** as the testing framework
- **Testing Library** for component testing
- **Minimum coverage**: 80% code coverage
- **Test location**: Mirror source structure in `__tests__/`

#### 2. **Test Requirements**
For every new component:
- ✅ 1 happy path test
- ✅ 1 edge case test
- ✅ 1 error/failure test
- ✅ 1 Arabic language test
- ✅ 1 English language test
- ✅ 1 mobile responsive test

#### 3. **Integration Testing**
- **End-to-end testing** with Playwright (planned)
- **API integration testing** with Supabase
- **Authentication flow testing**
- **Payment processing testing**






