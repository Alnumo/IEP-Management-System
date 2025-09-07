# Source Tree and Module Organization

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
