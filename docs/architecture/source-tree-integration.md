# Source Tree Integration

The new modules will be integrated into the existing source tree by creating new, domain-specific directories. This approach follows your current organizational pattern and ensures a clear separation of concerns.

## Existing Project Structure (Relevant Areas)

Based on my analysis of your current-architecture.md file, the relevant part of your existing structure is as follows:

src/
│   ├── components/
│   │   ├── admin/
│   │   ├── analytics/
│   │   ├── auth/
│   │   ├── billing/
│   │   ├── forms/
│   │   ├── layout/
│   │   ├── parent/
│   │   ├── therapy/
│   │   └── ui/
│   ├── pages/
│   └── types/

## New File Organization

New files for the enhancement will be added to this structure. Below, I've highlighted the new folders and their intended contents.
src/
│   ├── components/
│   │   ├── admin/
│   │   ├── analytics/
│   │   ├── auth/
│   │   ├── billing/
│   │   ├── crm/           # ✅ NEW: For CRM components like the Kanban board
│   │   ├── forms/
│   │   ├── layout/
│   │   ├── parent/
│   │   ├── scheduling/    # ✅ NEW: For calendar and scheduling components
│   │   ├── students/      # ✅ NEW: For student-specific components like the subscription manager
│   │   ├── therapy/
│   │   └── ui/
│   ├── pages/
│   │   ├── CrmDashboardPage.tsx          # ✅ NEW
│   │   ├── SchedulingCalendarPage.tsx    # ✅ NEW
│   │   └── InstallmentPlansPage.tsx      # ✅ NEW
│   └── types/
│       ├── crm.ts                        # ✅ NEW: TypeScript types for Leads
│       ├── scheduling.ts                 # ✅ NEW: Types for Subscriptions, Attendance
│       └── billing.ts                    # ✅ NEW: Types for Installment Plans

## Integration Guidelines

File Naming: All new components will follow the existing PascalCase.tsx convention.

Folder Organization: New features will be organized into their own dedicated folders within src/components/ to maintain modularity.

Shared Types: All new TypeScript types will be defined in the src/types/ directory to be easily shared between frontend components and backend service calls.
