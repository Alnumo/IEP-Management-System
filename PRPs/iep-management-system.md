# IEP Management System Implementation - PRP

name: "IEP Management System - Comprehensive Bilingual Implementation"
description: |
  
## Purpose
Implement a complete IEP (Individualized Education Program) management system within the existing Arkan Al-Numo platform, providing Arabic-speaking special education centers with comprehensive digital IEP creation, tracking, and compliance management capabilities.

## Core Principles
1. **IDEA Compliance First**: All IEP features must meet federal IDEA 2024 requirements
2. **Bilingual Excellence**: Full Arabic/English support with RTL layout optimization
3. **Collaborative Workflows**: Multi-stakeholder editing and approval processes
4. **Data Security**: HIPAA-compliant with granular access controls
5. **Integration Harmony**: Seamlessly integrate with existing student management system

---

## Goal
Build a comprehensive IEP management system that enables Arabic-speaking special education centers to create, manage, track, and maintain compliant IEPs with collaborative editing, progress monitoring, goal tracking, and automated compliance alerts.

## Why
- **Compliance Necessity**: IDEA 2024 requires detailed IEPs for all special education students
- **Cultural Gap**: No existing Arabic-first IEP systems with proper RTL support exist
- **Workflow Efficiency**: Streamline the complex IEP process from creation to annual reviews
- **Data Centralization**: Integrate IEPs with existing student records and therapy programs
- **Team Collaboration**: Enable teachers, therapists, parents, and administrators to collaborate effectively

## What
A complete IEP management module featuring:

### Core IEP Features
- **IEP Document Creation**: State-compliant IEP forms with bilingual templates
- **Collaborative Editing**: Multi-user drafting with version control and change tracking
- **Goal Management**: SMART IEP goals with progress tracking and data collection
- **Services Planning**: Related services scheduling and tracking integration
- **Compliance Monitoring**: Automated deadline alerts and requirement checklists
- **Progress Reporting**: Quarterly progress reports with electronic signatures
- **Meeting Management**: IEP meeting scheduling, notes, and decision tracking
- **Document Library**: Secure storage and version control for all IEP-related documents

### Success Criteria
- [ ] Create and edit IEPs with full bilingual support (Arabic/English)
- [ ] Track student progress toward IEP goals with data collection
- [ ] Generate compliance reports and automated deadline alerts
- [ ] Support collaborative editing with multiple stakeholders
- [ ] Integrate seamlessly with existing student and therapy data
- [ ] Maintain HIPAA-compliant security with role-based access
- [ ] Export IEPs in PDF format with proper Arabic typography
- [ ] Send automated notifications for meetings and deadlines

## All Needed Context

### Documentation & References
```yaml
# MUST READ - Include these in your context window
- url: https://www.ed.gov/sites/ed/files/parents/needs/speced/iepguide/iepguide.pdf
  why: Federal IDEA IEP requirements and components (2024)
  
- url: https://sites.ed.gov/idea/topic-areas/
  why: IDEA compliance requirements and regulations
  
- file: src/components/forms/StudentForm.tsx
  why: Existing bilingual form patterns with Zod validation
  
- file: src/types/student.ts
  why: Student data structure for IEP integration
  
- file: src/hooks/useStudents.ts
  why: Data fetching patterns with auth and error handling
  
- file: database/002_create_policies.sql
  why: RLS policy patterns for role-based access control
  
- file: src/lib/i18n.ts
  why: Internationalization utilities for RTL/bilingual support
  
- file: src/contexts/LanguageContext.tsx
  why: Language switching and RTL layout management

- doc: https://react-hook-form.com/docs
  section: useFieldArray for dynamic IEP goals management
  critical: Required for managing dynamic lists of IEP goals and objectives

- doc: https://supabase.com/docs/guides/auth/row-level-security
  section: RLS policies for educational records
  critical: FERPA/HIPAA compliance requires granular access control
```

### Current Codebase Structure
```bash
src/
├── components/
│   ├── forms/ (✅ Existing bilingual form patterns)
│   └── ui/ (✅ Complete UI component library)
├── hooks/ (✅ React Query patterns with auth)
├── types/ (✅ TypeScript interfaces established)
├── lib/ (✅ i18n, auth-utils, supabase setup)
├── contexts/ (✅ Language context for RTL/LTR)
└── services/ (✅ API service patterns)

database/
├── 004_student_management_tables.sql (✅ Students table exists)
├── 002_create_policies.sql (✅ RLS patterns established)
└── (NEW IEP tables needed)
```

### Desired Codebase Structure with New Files
```bash
# NEW DATABASE TABLES
database/
└── 024_iep_management_schema.sql (IEP tables with RLS policies)

# NEW TYPES
src/types/
├── iep.ts (IEP data structures)
├── iep-goals.ts (IEP goals and objectives)
└── iep-meetings.ts (Meeting management types)

# NEW COMPONENTS
src/components/
├── iep/
│   ├── IEPEditor.tsx (Main IEP document editor)
│   ├── IEPGoalManager.tsx (Goals and objectives management)
│   ├── IEPProgressTracker.tsx (Progress monitoring)
│   ├── IEPMeetingScheduler.tsx (Meeting management)
│   └── IEPComplianceAlerts.tsx (Compliance monitoring)
└── forms/
    └── IEPForm.tsx (Comprehensive IEP form component)

# NEW HOOKS
src/hooks/
├── useIEPs.ts (IEP CRUD operations)
├── useIEPGoals.ts (Goal management)
├── useIEPProgress.ts (Progress tracking)
└── useIEPCompliance.ts (Compliance monitoring)

# NEW SERVICES
src/services/
├── iep-service.ts (IEP business logic)
├── iep-compliance.ts (Compliance checking)
└── iep-export.ts (PDF generation with Arabic support)

# NEW PAGES
src/pages/
├── IEPDashboard.tsx (Main IEP management dashboard)
├── IEPEditor.tsx (IEP creation/editing page)
├── IEPProgress.tsx (Progress tracking page)
└── IEPCompliance.tsx (Compliance monitoring page)
```

### Known Gotchas & Library Quirks
```typescript
// CRITICAL: Supabase RLS requires auth context in all queries
// Pattern: Always use requireAuth() before database operations
const user = await requireAuth()

// CRITICAL: Arabic text rendering in PDF requires special fonts
// Use 'Tajawal' or 'Cairo' fonts for PDF generation
// Install @react-pdf/renderer with Arabic font support

// CRITICAL: Zod validation for bilingual fields
// Pattern: Either Arabic OR English required, not both mandatory
const bilingualField = z.object({
  field_ar: z.string().optional(),
  field_en: z.string().optional()
}).refine(data => data.field_ar || data.field_en, {
  message: "Either Arabic or English field is required"
})

// CRITICAL: JSONB storage for IEP goals array
// Supabase JSONB requires proper typing for complex nested data
type IEPGoal = {
  id: string;
  goal_ar: string;
  goal_en?: string;
  objectives: IEPObjective[];
  progress_data: ProgressEntry[];
}

// CRITICAL: Row Level Security for IEP data
// IEP access requires student relationship AND role-based permissions
// Pattern: Multi-level RLS policies needed for compliance
```

## Implementation Blueprint

### Data Models and Structure
```typescript
// Core IEP document structure
interface IEP {
  id: string;
  student_id: string;
  academic_year: string;
  iep_type: 'initial' | 'annual' | 'triennial' | 'amendment';
  
  // Present Levels of Performance (bilingual)
  present_levels_ar: string;
  present_levels_en?: string;
  
  // Annual Goals (dynamic array)
  annual_goals: IEPGoal[];
  
  // Services and Supports
  services: IEPService[];
  accommodations_ar: string[];
  accommodations_en?: string[];
  modifications_ar: string[];
  modifications_en?: string[];
  
  // Dates and Compliance
  effective_date: string;
  review_date: string;
  next_annual_date: string;
  
  // Workflow status
  status: 'draft' | 'review' | 'approved' | 'active' | 'archived';
  approvals: IEPApproval[];
  
  // Metadata
  created_by: string;
  last_modified_by: string;
  version: number;
  created_at: string;
  updated_at: string;
}

interface IEPGoal {
  id: string;
  iep_id: string;
  domain: 'academic' | 'behavioral' | 'functional' | 'communication';
  
  // Goal statement (bilingual)
  goal_statement_ar: string;
  goal_statement_en?: string;
  
  // Measurable objectives
  objectives: IEPObjective[];
  
  // Progress tracking
  measurement_method: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  criteria_for_success: string;
  
  // Progress data
  progress_entries: ProgressEntry[];
  current_progress: number; // percentage
  
  sort_order: number;
  is_active: boolean;
}
```

### Task List for Implementation

```yaml
Task 1: Create IEP Database Schema
MODIFY database/024_iep_management_schema.sql:
  - CREATE tables for IEPs, goals, services, approvals
  - IMPLEMENT RLS policies with student-teacher-parent access
  - CREATE indexes for performance optimization
  - ESTABLISH foreign key relationships with students table

Task 2: Implement Core IEP Types
CREATE src/types/iep.ts:
  - DEFINE IEP document interfaces with bilingual fields
  - MIRROR pattern from: src/types/student.ts
  - INCLUDE compliance-required fields per IDEA 2024
  - ENSURE TypeScript strict mode compatibility

Task 3: Build IEP Service Layer
CREATE src/services/iep-service.ts:
  - IMPLEMENT CRUD operations with auth validation
  - PATTERN: Follow src/hooks/useStudents.ts authentication flow
  - INCLUDE compliance validation before save operations
  - HANDLE bilingual content transformation

Task 4: Create IEP Data Hooks
CREATE src/hooks/useIEPs.ts:
  - MIRROR pattern from: src/hooks/useStudents.ts
  - USE React Query with proper cache invalidation
  - IMPLEMENT optimistic updates for collaborative editing
  - INCLUDE error handling with retry logic

Task 5: Build IEP Form Component
CREATE src/components/forms/IEPForm.tsx:
  - MIRROR pattern from: src/components/forms/StudentForm.tsx
  - USE Zod validation with bilingual field rules
  - IMPLEMENT dynamic goal management with useFieldArray
  - INCLUDE rich text editing for present levels

Task 6: Implement IEP Editor Interface
CREATE src/components/iep/IEPEditor.tsx:
  - BUILD collaborative editing interface with autosave
  - IMPLEMENT section-by-section navigation
  - INCLUDE version control and change tracking
  - PROVIDE real-time collaboration indicators

Task 7: Create IEP Goal Management
CREATE src/components/iep/IEPGoalManager.tsx:
  - IMPLEMENT dynamic goal creation/editing
  - BUILD progress tracking visualization
  - INCLUDE data collection forms for each goal
  - PROVIDE goal template library

Task 8: Build Progress Tracking System
CREATE src/services/progress-tracking.ts:
  - IMPLEMENT data collection workflows
  - BUILD progress calculation algorithms
  - INCLUDE trend analysis and projections
  - GENERATE progress reports with charts

Task 9: Create Compliance Monitoring
CREATE src/hooks/useIEPCompliance.ts:
  - IMPLEMENT deadline tracking with alerts
  - BUILD compliance checklist validation
  - INCLUDE automated notification system
  - PROVIDE compliance dashboard widgets

Task 10: Build Meeting Management
CREATE src/components/iep/IEPMeetingScheduler.tsx:
  - IMPLEMENT meeting scheduling with stakeholder invites
  - BUILD agenda creation and note-taking
  - INCLUDE decision tracking and action items
  - INTEGRATE with calendar system

Task 11: Implement Document Export
CREATE src/services/iep-export.ts:
  - BUILD PDF generation with Arabic font support
  - IMPLEMENT proper RTL layout in PDFs
  - INCLUDE digital signature integration
  - PROVIDE batch export capabilities

Task 12: Create IEP Dashboard
CREATE src/pages/IEPDashboard.tsx:
  - BUILD overview with key metrics and alerts
  - IMPLEMENT quick access to draft IEPs
  - INCLUDE upcoming deadlines and tasks
  - PROVIDE search and filter capabilities
```

### Task-Specific Pseudocode

```typescript
// Task 4: IEP Data Hooks Implementation
export const useIEPs = (student_id?: string) => {
  return useQuery({
    queryKey: ['ieps', student_id],
    queryFn: async (): Promise<IEP[]> => {
      // PATTERN: Always validate auth first (see useStudents.ts:22)
      const user = await requireAuth()
      
      let query = supabase
        .from('ieps')
        .select(`
          *,
          student:students(*),
          goals:iep_goals(*),
          approvals:iep_approvals(*)
        `)
        .order('updated_at', { ascending: false })
      
      // FILTER: If student_id provided, filter by student
      if (student_id) {
        query = query.eq('student_id', student_id)
      }
      
      const { data, error } = await query
      
      if (error) {
        // PATTERN: Use centralized error monitoring
        errorMonitoring.reportError(error, {
          component: 'useIEPs',
          userId: user.id,
          context: { student_id }
        })
        throw error
      }
      
      return data || []
    },
    staleTime: 2 * 60 * 1000, // 2 minutes (IEPs change frequently)
  })
}

// Task 5: IEP Form Validation Schema
const iepSchema = z.object({
  // PATTERN: Bilingual fields with at least one required
  present_levels_ar: z.string().min(10, 'Current performance description required (min 10 chars)'),
  present_levels_en: z.string().optional(),
  
  // PATTERN: Dynamic array validation for goals
  annual_goals: z.array(z.object({
    domain: z.enum(['academic', 'behavioral', 'functional', 'communication']),
    goal_statement_ar: z.string().min(5, 'Goal statement required'),
    goal_statement_en: z.string().optional(),
    objectives: z.array(z.object({
      objective_ar: z.string().min(5, 'Objective description required'),
      measurement_method: z.string().min(3, 'Measurement method required'),
      frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly'])
    })).min(1, 'At least one objective required per goal')
  })).min(1, 'At least one annual goal required'),
  
  // CRITICAL: Compliance dates validation
  effective_date: z.string().refine((date) => {
    return new Date(date) <= new Date()
  }, 'Effective date cannot be in the future'),
  
  next_annual_date: z.string().refine((date, ctx) => {
    const effective = new Date(ctx.parent.effective_date)
    const annual = new Date(date)
    const daysDiff = (annual.getTime() - effective.getTime()) / (1000 * 60 * 60 * 24)
    return daysDiff >= 360 && daysDiff <= 370
  }, 'Annual review must be scheduled within 365 days')
})

// Task 8: Progress Calculation Logic
const calculateGoalProgress = (goal: IEPGoal): ProgressSummary => {
  const entries = goal.progress_entries
  
  if (entries.length === 0) {
    return { percentage: 0, trend: 'no_data', last_updated: null }
  }
  
  // PATTERN: Calculate weighted progress based on recent data
  const recentEntries = entries
    .filter(entry => isWithinDays(entry.date, 30))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  
  if (recentEntries.length === 0) {
    return { percentage: 0, trend: 'stale_data', last_updated: entries[0].date }
  }
  
  // ALGORITHM: Weighted average with more weight on recent entries
  const weightedSum = recentEntries.reduce((sum, entry, index) => {
    const weight = Math.pow(0.9, index) // Exponential decay
    return sum + (entry.score * weight)
  }, 0)
  
  const weightSum = recentEntries.reduce((sum, _, index) => {
    return sum + Math.pow(0.9, index)
  }, 0)
  
  const percentage = Math.round((weightedSum / weightSum) * 100)
  
  // TREND: Calculate trend based on first vs last 3 entries
  const trend = calculateTrend(recentEntries)
  
  return {
    percentage,
    trend,
    last_updated: recentEntries[0].date,
    data_points: recentEntries.length
  }
}
```

### Integration Points
```yaml
DATABASE:
  - migration: "Create IEP tables with RLS policies linked to students table"
  - foreign_keys: "ieps.student_id -> students.id, iep_goals.iep_id -> ieps.id"
  - indexes: "CREATE INDEX idx_ieps_student ON ieps(student_id)"
  
AUTHENTICATION:
  - extend: "RLS policies to include IEP team roles (case manager, related services)"
  - pattern: "Multi-level access: student data + IEP team membership required"
  
NAVIGATION:
  - add_to: "src/components/layout/Sidebar.tsx"
  - pattern: "Add IEP management section with role-based visibility"
  
ROUTES:
  - add_to: "src/routes.tsx"
  - pattern: "Protected routes with student relationship validation"
  
CONFIG:
  - add_to: "src/lib/constants.ts" 
  - pattern: "IEP_COMPLIANCE_DAYS = 365, PROGRESS_REVIEW_FREQUENCY = 'quarterly'"
```

## Validation Loop

### Level 1: Syntax & Style
```bash
# Run these FIRST - fix any errors before proceeding
npm run lint                    # ESLint with TypeScript rules
npm run type-check             # TypeScript compilation
npm run test:types             # Type-only test run

# Expected: No errors. If errors, READ the error and fix.
```

### Level 2: Unit Tests - IEP Core Functions
```typescript
// CREATE src/test/services/iep-service.test.ts
describe('IEP Service', () => {
  it('should create IEP with required IDEA components', async () => {
    const mockStudentId = 'student-123'
    const mockIEPData = {
      student_id: mockStudentId,
      present_levels_ar: 'الوضع الحالي للطالب في الرياضيات...',
      annual_goals: [{
        domain: 'academic',
        goal_statement_ar: 'سيحسن الطالب من مهارات القراءة...',
        objectives: [{ /* valid objective */ }]
      }],
      effective_date: new Date().toISOString().split('T')[0],
      next_annual_date: new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0]
    }
    
    const result = await createIEP(mockIEPData)
    expect(result.status).toBe('draft')
    expect(result.annual_goals).toHaveLength(1)
    expect(result.compliance_check).toBe(true)
  })
  
  it('should enforce bilingual validation correctly', async () => {
    const invalidData = {
      student_id: 'student-123',
      present_levels_ar: '', // Empty Arabic field
      present_levels_en: '', // Empty English field
      annual_goals: []
    }
    
    await expect(createIEP(invalidData)).rejects.toThrow('Either Arabic or English field is required')
  })
  
  it('should calculate progress correctly with weighted algorithm', () => {
    const mockGoal = createMockGoalWithProgress([
      { score: 80, date: '2024-01-01' },
      { score: 85, date: '2024-01-15' },
      { score: 90, date: '2024-01-30' }
    ])
    
    const progress = calculateGoalProgress(mockGoal)
    expect(progress.percentage).toBeGreaterThan(85)
    expect(progress.trend).toBe('improving')
  })
})

// CREATE src/test/components/IEPForm.test.tsx
describe('IEP Form Component', () => {
  it('should handle RTL layout correctly for Arabic input', async () => {
    const mockLanguageContext = { language: 'ar', isRTL: true }
    render(
      <LanguageContext.Provider value={mockLanguageContext}>
        <IEPForm onSubmit={jest.fn()} onCancel={jest.fn()} />
      </LanguageContext.Provider>
    )
    
    const presentLevelsField = screen.getByLabelText(/الوضع الحالي/)
    expect(presentLevelsField).toHaveStyle('direction: rtl')
    expect(presentLevelsField).toHaveStyle('text-align: right')
  })
})
```

```bash
# Run and iterate until passing:
npm run test -- --testPathPattern=iep
# If failing: Read error, understand root cause, fix code, re-run
```

### Level 3: Integration Test
```bash
# Start the development server
npm run dev

# Test IEP creation workflow
curl -X POST http://localhost:5173/api/ieps \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_TOKEN" \
  -d '{
    "student_id": "test-student-id",
    "present_levels_ar": "الطالب يظهر تحسناً في المهارات الأساسية",
    "annual_goals": [{
      "domain": "academic",
      "goal_statement_ar": "سيحسن الطالب مهارات القراءة بنسبة 20%",
      "objectives": [{
        "objective_ar": "قراءة 10 كلمات جديدة أسبوعياً",
        "measurement_method": "weekly assessment",
        "frequency": "weekly"
      }]
    }],
    "effective_date": "2024-08-27"
  }'

# Expected Response: 
# {
#   "success": true,
#   "iep": {
#     "id": "iep-uuid",
#     "status": "draft",
#     "compliance_check": true,
#     "next_annual_date": "2025-08-27"
#   }
# }

# Test Arabic PDF export
curl -X GET http://localhost:5173/api/ieps/iep-uuid/export?format=pdf \
  -H "Authorization: Bearer $SUPABASE_TOKEN" \
  -o test-iep-arabic.pdf

# Expected: PDF file with proper Arabic text rendering
```

## Final Validation Checklist
- [ ] All tests pass: `npm run test`
- [ ] No linting errors: `npm run lint`
- [ ] No type errors: `npm run type-check`
- [ ] IEP creation workflow successful via API
- [ ] Arabic text renders correctly in PDF exports
- [ ] RLS policies prevent unauthorized access
- [ ] Compliance alerts trigger at correct intervals
- [ ] Progress calculations match expected algorithms
- [ ] Collaborative editing maintains data integrity
- [ ] Bilingual forms switch properly between AR/EN

---

## Anti-Patterns to Avoid
- ❌ Don't store IEP content in plain text without encryption
- ❌ Don't skip compliance validation to "move faster"
- ❌ Don't hardcode Arabic text - use proper i18n keys
- ❌ Don't allow IEP modifications without proper audit trail
- ❌ Don't ignore FERPA/HIPAA requirements for student data
- ❌ Don't create IEPs without required IDEA components
- ❌ Don't use client-side-only validation for compliance data
- ❌ Don't implement PDF generation without Arabic font support

## Quality Score Assessment

**Confidence Level for One-Pass Implementation: 8.5/10**

**Reasoning:**
- ✅ **High**: Comprehensive existing patterns to follow (forms, auth, i18n)
- ✅ **High**: Detailed IEP requirements research with federal compliance needs
- ✅ **High**: Clear integration points with existing student management system
- ✅ **High**: Specific validation loops with executable tests
- ✅ **Medium**: Complex collaborative editing requirements need careful implementation
- ⚠️ **Medium**: Arabic PDF generation may require additional font configuration
- ⚠️ **Medium**: HIPAA/FERPA compliance validation needs legal review

**Areas requiring extra attention:**
1. **Collaborative Editing**: Real-time multi-user editing with conflict resolution
2. **Arabic PDF Export**: Proper RTL layout and font rendering in generated documents
3. **Compliance Automation**: Accurate deadline calculations and alert systems
4. **Data Migration**: Existing student data integration with new IEP structure

This PRP provides comprehensive context for successful one-pass implementation while highlighting the critical areas that require extra care and validation.